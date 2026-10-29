(() => {
  if (window.__jobScannerLoaded) return;
  window.__jobScannerLoaded = true;

  let scanning = false;
  let stopRequested = false;
  let stats = { checked: 0, approved: 0, hidden: 0, skipped: 0 };
  let currentStatus = "Idle";
  let serverUrl = "";
  let apiKey = "";
  // When true, scan LinkedIn's new AI / natural-language jobs search
  // (pageKey d_flagship3_nlsearch_srp_jobs, path /jobs/search-results/) which
  // renders via Server-Driven UI instead of the classic Ember DOM. Toggled from
  // the popup's "Analyze AI search page" checkbox. See the BETA section below.
  let betaMode = false;
  // Job scan limit: stop after this many jobs have been scanned across all
  // pages. -1 means "no limit" (scan every job). `processedJobs` counts every
  // unique card the scanner opens during the run, regardless of outcome
  // (approved / rejected / skipped / already processed). Both survive URL-based
  // pagination (full page reload) via the background state — see
  // maybeResumeAfterNavigation.
  let jobLimit = -1;
  let processedJobs = 0;
  // Easy Apply handling, chosen in the popup: "skip" (reject + hide without
  // AI, the original behaviour) or "analyze" (judge like any other job, with
  // an optional stricter minimum score).
  let easyApplyMode = "skip";
  let easyApplyMinScore = 0;
  // Set when the server rejects the API key — the scan stops with this message
  // instead of marking every remaining job as an error.
  let authFailure = "";
  const MIN_VALID_CARDS_THRESHOLD = 3;
  const MIN_BROAD_CARDS_FOR_MISMATCH = 10;

  // Mirror of the popup's normalizer so the content script is robust even if it
  // ever receives a raw/odd value: -1 = unlimited, >=1 = that many jobs,
  // anything else (0, NaN, negative) falls back to the 100-job default.
  function normalizeJobLimit(raw) {
    const n = parseInt(raw, 10);
    if (isNaN(n)) return 100;
    if (n === -1) return -1;
    if (n < 1) return 100;
    return n;
  }

  // True once we've scanned as many jobs as the limit allows. A limit of -1
  // (unlimited) or any non-positive value never trips, so the scan runs to the
  // last page exactly as it did before this feature existed.
  function normalizeEasyApplyMode(raw) {
    return raw === "analyze" ? "analyze" : "skip";
  }

  function normalizeMinScore(raw) {
    const n = parseInt(raw, 10);
    if (isNaN(n) || n < 0) return 0;
    return Math.min(100, n);
  }

  function jobLimitReached() {
    return jobLimit > 0 && processedJobs >= jobLimit;
  }

  function log(msg, level) {
    console.log(`[JobScanner] ${msg}`);
    try {
      chrome.runtime.sendMessage({ type: "SCAN_LOG", level: level || "debug", message: msg }).catch(() => {});
    } catch (e) {}
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "GET_STATUS") {
      sendResponse({ running: scanning, stats, statusMsg: currentStatus });
      return true;
    }
    if (msg.type === "START_SCAN") {
      log(`START_SCAN received. serverUrl=${msg.serverUrl}, scanning=${scanning}`);
      if (scanning) {
        sendResponse({ ok: false, reason: "already scanning" });
        return true;
      }
      scanning = true;
      serverUrl = msg.serverUrl;
      apiKey = msg.apiKey || "";
      betaMode = !!msg.betaMode;
      jobLimit = normalizeJobLimit(msg.jobLimit);
      easyApplyMode = normalizeEasyApplyMode(msg.easyApplyMode);
      easyApplyMinScore = normalizeMinScore(msg.easyApplyMinScore);
      authFailure = "";
      processedJobs = 0;
      stats = { checked: 0, approved: 0, hidden: 0, skipped: 0 };
      stopRequested = false;
      log(`Job scan limit: ${jobLimit === -1 ? "unlimited" : jobLimit}`);
      sendResponse({ ok: true });
      startScan();
      return true;
    }
    if (msg.type === "STOP_SCAN") {
      stopRequested = true;
      sendResponse({ ok: true });
      return true;
    }
  });

  function sendProgress(statusMsg, currentJob) {
    currentStatus = statusMsg;
    log(`Progress: ${statusMsg}`);
    const payload = { type: "SCAN_PROGRESS", stats: { ...stats }, statusMsg };
    if (currentJob !== undefined) payload.currentJob = currentJob;
    chrome.runtime.sendMessage(payload).catch(() => {});
  }

  function sendResult(result) {
    chrome.runtime.sendMessage({ type: "SCAN_RESULT", result }).catch(() => {});
  }

  function sendDone(statusMsg) {
    currentStatus = statusMsg;
    scanning = false;
    log(`Done: ${statusMsg}`);
    chrome.runtime.sendMessage({ type: "SCAN_DONE", stats: { ...stats }, statusMsg }).catch(() => {});
  }

  function sendNavigating(statusMsg) {
    currentStatus = statusMsg;
    log(statusMsg);
    // Carry processedJobs so the job-limit count is preserved when the page
    // reloads for URL-based pagination and the scan resumes.
    return chrome.runtime.sendMessage({ type: "SCAN_NAVIGATING", stats: { ...stats }, statusMsg, processedJobs }).catch(() => {});
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function waitForSelector(sel, parent, timeoutMs = 8000) {
    return new Promise((resolve) => {
      const el = (parent || document).querySelector(sel);
      if (el) return resolve(el);
      const observer = new MutationObserver(() => {
        const found = (parent || document).querySelector(sel);
        if (found) { observer.disconnect(); resolve(found); }
      });
      observer.observe(parent || document.body, { childList: true, subtree: true });
      setTimeout(() => { observer.disconnect(); resolve(null); }, timeoutMs);
    });
  }

  // ==========================================================================
  // LINKEDIN AI / "NEW" SEARCH (beta) SUPPORT
  // --------------------------------------------------------------------------
  // LinkedIn's natural-language ("AI") jobs search (pageKey
  // d_flagship3_nlsearch_srp_jobs, path /jobs/search-results/) renders through a
  // Server-Driven-UI engine, so NONE of the classic Ember hooks exist: there is
  // no <li data-occludable-job-id>, no data-job-id, no /jobs/view/ link on the
  // cards, and the class names are per-deploy hashes (useless as selectors).
  // What the SDUI page gives us instead, all semantic and stable:
  //   * Each list card is  <div componentkey="job-card-component-ref-<JOBID>"
  //     role="button">  — the numeric job id is in the componentkey and the
  //     element is itself the click target. (There are two nested copies per
  //     card; we keep the outermost.) Cards live only in the results LazyColumn,
  //     never inside the detail panel.
  //   * Inside a card the visible text is plain <p> nodes in order:
  //     title, company, location, [salary], then metadata (incl. "Easy Apply").
  //   * The per-card hide control is <button aria-label="Dismiss <title> job">.
  //   * The open job's detail renders in
  //     <div data-sdui-screen="...SemanticJobDetails"> whose title is an
  //     <a href="/jobs/view/<id>">, company an <a href="/company/...">, the
  //     external apply an <a href="/safety/go/?url=<real>"> (tidyApplyUrl
  //     unwraps it), and the description a lazy-loaded
  //     <div componentkey="JobDetails_AboutTheJob_<id>">.
  //   * Pagination is testid based:
  //     button[data-testid="pagination-controls-next-button-visible"] (or
  //     ...-hidden on the last page) and
  //     button[data-testid="pagination-indicator-N"][aria-current].
  // Every helper below mirrors a classic extractor so the shared scan loop
  // (processCard / pagination / server calls) is reused unchanged. They run only
  // when betaMode === true.
  // ==========================================================================

  const BETA_CARD_SELECTOR = "[componentkey^='job-card-component-ref-']";
  const BETA_DETAIL_SELECTOR = "[data-sdui-screen*='SemanticJobDetails']";

  function betaJobIdFromComponentKey(ck) {
    const m = (ck || "").match(/job-card-component-ref-(\d+)/);
    return m ? m[1] : "";
  }

  function isInsideBetaDetail(el) {
    return !!el?.closest?.(BETA_DETAIL_SELECTOR);
  }

  // Outermost card element per unique job id, scoped to the results list. Cards
  // that appear inside the detail panel (e.g. "similar jobs") are excluded so we
  // never treat a recommendation as a search result.
  function getBetaJobCards() {
    const all = Array.from(document.querySelectorAll(BETA_CARD_SELECTOR));
    const byId = new Map();
    for (const el of all) {
      if (isInsideBetaDetail(el)) continue;
      const id = betaJobIdFromComponentKey(el.getAttribute("componentkey"));
      if (!id) continue;
      const existing = byId.get(id);
      if (!existing) { byId.set(id, el); continue; }
      // Keep whichever element wraps the other (the outermost copy).
      if (el.contains(existing)) byId.set(id, el);
    }
    const cards = Array.from(byId.values());
    if (cards.length) log(`Beta: found ${cards.length} AI-search job cards`);
    return cards;
  }

  function getBetaCardClickTarget(card) {
    if (card.getAttribute("role") === "button") return card;
    return card.querySelector("[role='button']") || card;
  }

  // Title / company / location are the first three real text <p> nodes in the
  // card, in document order. Read positionally (class names are unstable
  // hashes) and skip pure-separator nodes such as "·".
  function getBetaCardFields(card) {
    const ps = Array.from(card.querySelectorAll("p"))
      .map((p) => p.textContent.trim())
      .filter((t) => t && t !== "·");
    return { title: ps[0] || "", company: ps[1] || "", location: ps[2] || "" };
  }

  function isEasyApplyFromBetaCard(card) {
    return /easy apply/i.test(card.textContent || "");
  }

  function clickBetaDismiss(card) {
    const btn =
      card.querySelector("button[aria-label^='Dismiss']") ||
      card.querySelector("button[aria-label*='Dismiss']") ||
      card.querySelector("button[aria-label*='dismiss']");
    if (btn) {
      log(`Beta: clicking dismiss "${btn.getAttribute("aria-label") || "dismiss"}"`);
      btn.click();
      return true;
    }
    log("Beta: no dismiss button found on card");
    return false;
  }

  function getBetaDetailContainer() {
    return document.querySelector(BETA_DETAIL_SELECTOR);
  }

  // Prefer rendered (innerText) text, but fall back to textContent when
  // innerText is empty or unavailable — the SDUI description slot can be
  // present in the DOM before layout/visibility resolves its innerText.
  function betaVisibleText(el) {
    if (!el) return "";
    const it = el.innerText;
    return (typeof it === "string" && it.trim().length ? it : el.textContent || "");
  }

  // Wait for the detail panel to reflect the just-clicked job, then for its
  // lazily-streamed "About the job" description. The title anchor flips to the
  // new job id well before the description arrives, so we don't return the
  // moment the title matches — we then give the description a bounded grace
  // window (and proceed anyway if it never fills, so a short/odd description
  // can't stall the scan). extractBetaDescription falls back to panel text.
  async function waitForBetaDetail(jobId) {
    const hardDeadline = Date.now() + 9000;
    const DESC_GRACE_MS = 3500;
    let titleMatchedAt = 0;
    while (Date.now() < hardDeadline && !stopRequested) {
      const d = getBetaDetailContainer();
      if (d) {
        const a = d.querySelector("a[href*='/jobs/view/']");
        const titleMatches =
          !!a && (!jobId || (a.getAttribute("href") || "").includes(`/jobs/view/${jobId}`));
        const about =
          (jobId && d.querySelector(`[componentkey='JobDetails_AboutTheJob_${jobId}']`)) ||
          d.querySelector("[componentkey^='JobDetails_AboutTheJob_']");
        const aboutReady = !!about && betaVisibleText(about).trim().length > 50;
        if (titleMatches) {
          if (!titleMatchedAt) titleMatchedAt = Date.now();
          if (aboutReady) return; // best case: right job AND description present
          if (Date.now() - titleMatchedAt >= DESC_GRACE_MS) return; // gave it its grace
        }
      }
      await sleep(250);
    }
    await sleep(400);
  }

  function extractBetaTitle() {
    const d = getBetaDetailContainer();
    if (!d) return "";
    const a = d.querySelector("a[href*='/jobs/view/']");
    const t = a?.textContent?.trim();
    if (t && t.length < 200) { log(`Beta title: "${t}"`); return t; }
    return "";
  }

  function extractBetaCompany() {
    const d = getBetaDetailContainer();
    if (!d) return "";
    for (const a of d.querySelectorAll("a[href*='/company/']")) {
      const t = a.textContent.trim();
      if (t && t.length < 100) { log(`Beta company: "${t}"`); return t; }
    }
    return "";
  }

  function extractBetaLocation() {
    const d = getBetaDetailContainer();
    if (!d) return "";
    // The location is the head of the subtitle line, e.g.
    // "Freiburg, Baden-Württemberg, Germany · 2 days ago · 17 people clicked apply".
    for (const p of d.querySelectorAll("p")) {
      const head = (p.textContent.split("·")[0] || "").trim();
      if (
        head &&
        head.length > 2 &&
        head.length < 100 &&
        !/^\d+\s+(applicant|people|hour|day|week|month|minute|second)/i.test(head) &&
        !/ago$/i.test(head) &&
        /(remote|hybrid|on-?site|,|\bArea\b|\bMetropolitan\b|\bRegion\b)/i.test(head)
      ) {
        log(`Beta location: "${head}"`);
        return head;
      }
    }
    return "";
  }

  function extractBetaDescription() {
    const d = getBetaDetailContainer();
    if (!d) return "";
    const slot = d.querySelector("[componentkey^='JobDetails_AboutTheJob_']");
    if (slot) {
      const t = betaVisibleText(slot).trim();
      if (t.length > 50) { log(`Beta description: ${t.length} chars (AboutTheJob slot)`); return t; }
    }
    // Fallback: the whole detail panel text (includes the header, but better
    // than nothing for analysis if the dedicated slot hasn't streamed in).
    const t = betaVisibleText(d).trim();
    if (t.length > 80) { log(`Beta description: ${t.length} chars (detail fallback)`); return t; }
    log("Beta: could not extract description");
    return "";
  }

  function extractBetaApplyUrl() {
    const d = getBetaDetailContainer();
    if (!d) return "";
    // External apply is an <a> to LinkedIn's safety redirect wrapping the real
    // company URL; tidyApplyUrl unwraps the ?url= target.
    const direct = d.querySelector(
      "a[href*='/safety/go/'], a[href*='offsite'], a[href*='externalApply']",
    );
    if (direct) {
      const tidied = tidyApplyUrl(direct.getAttribute("href") || "");
      if (tidied) return tidied;
    }
    // Fallback: an anchor literally labelled "Apply".
    for (const a of d.querySelectorAll("a[href]")) {
      if (/^apply$/i.test(a.textContent.trim())) {
        const tidied = tidyApplyUrl(a.getAttribute("href") || "");
        if (tidied && !/linkedin\.com\/jobs\/view/i.test(tidied)) return tidied;
      }
    }
    return "";
  }

  // The scrollable rail that holds the cards (or the LazyColumn itself).
  function getBetaResultsListContainer() {
    const findScrollable = (start) => {
      let node = start;
      for (let i = 0; i < 14 && node && node !== document.body; i++) {
        if (node.scrollHeight > node.clientHeight + 20) {
          const oy = getComputedStyle(node).overflowY;
          if (oy === "auto" || oy === "scroll" || oy === "overlay") return node;
        }
        node = node.parentElement;
      }
      return null;
    };
    const cards = getBetaJobCards();
    if (cards.length) {
      return findScrollable(cards[0]) || cards[0].parentElement;
    }
    const cols = Array.from(
      document.querySelectorAll("[data-component-type='LazyColumn'], [data-testid='lazy-column']"),
    );
    for (const col of cols) {
      if (!isInsideBetaDetail(col) && col.querySelector(BETA_CARD_SELECTOR)) {
        return findScrollable(col) || col;
      }
    }
    return null;
  }

  // Current/total derived from the testid pagination. Total is reported as
  // current+1 whenever a usable Next button exists, so the shared "is last page"
  // check (current >= total) stays correct even though the visible indicator
  // strip is windowed and doesn't reveal the true page count.
  function findBetaPageState() {
    const indicators = document.querySelectorAll("[data-testid^='pagination-indicator-']");
    const nextVisible = document.querySelector(
      "button[data-testid='pagination-controls-next-button-visible']",
    );
    const nextHidden = document.querySelector(
      "button[data-testid='pagination-controls-next-button-hidden']",
    );
    if (!indicators.length && !nextVisible && !nextHidden) return null;
    let current = 1;
    indicators.forEach((b) => {
      if (b.getAttribute("aria-current") === "true") {
        const m = (b.getAttribute("aria-label") || "").match(/Page\s+(\d+)/i);
        if (m) current = parseInt(m[1], 10);
      }
    });
    // The testid itself encodes visibility (…next-button-visible vs …-hidden),
    // so its presence (and not being disabled) is the authoritative "has next
    // page" signal — no offsetParent/layout check needed here.
    const hasNext = !!(nextVisible && !nextVisible.disabled);
    return { current, total: hasNext ? current + 1 : current };
  }

  async function goToNextBetaPage() {
    await scrollJobsListToBottom();
    const beforeSignature = getPageSignature();

    const nextBtn = document.querySelector(
      "button[data-testid='pagination-controls-next-button-visible']",
    );
    if (!nextBtn || nextBtn.disabled || nextBtn.offsetParent === null) {
      log("Beta: no visible Next button; last page reached");
      return false;
    }
    log("Beta: clicking Next");
    nextBtn.click();
    await sleep(1200);
    const changed = await waitForPageChange(beforeSignature, 12000);
    if (!changed) {
      log("Beta: Next clicked but page signature did not change", "warn");
      return false;
    }
    // Start the new page from the top of the list.
    const container = getResultsListContainer();
    if (container) container.scrollTop = 0;
    await sleep(500);
    return true;
  }

  // --- JOB CARD DETECTION ---

  function getCardJobId(card) {
    if (!card) return "";
    if (betaMode) {
      return betaJobIdFromComponentKey(
        card.getAttribute?.("componentkey") ||
          card.querySelector?.(BETA_CARD_SELECTOR)?.getAttribute("componentkey") ||
          "",
      );
    }
    if (card.matches?.("[data-job-id]")) {
      return (card.getAttribute("data-job-id") || "").trim();
    }
    return (card.querySelector("[data-job-id]")?.getAttribute("data-job-id") || "").trim();
  }

  // Robustly resolve a card's numeric LinkedIn job id across every layout.
  // The left-rail search cards are <li data-occludable-job-id> wrapping a
  // <div data-job-id>, so a plain getAttribute/closest on the <li> misses it.
  // We check, in order: a [data-job-id] on the card or any descendant, a
  // [data-occludable-job-id] on the card or a descendant, and finally the
  // numeric id embedded in the /jobs/view/<id> link (always present on a valid
  // card). Returns "" only for genuinely non-job elements.
  function resolveCardJobId(card) {
    if (!card) return "";
    if (betaMode) return getCardJobId(card);
    const direct = getCardJobId(card);
    if (direct && direct !== "search") return direct;

    const occAttr =
      card.getAttribute?.("data-occludable-job-id") ||
      card.querySelector?.("[data-occludable-job-id]")?.getAttribute("data-occludable-job-id") ||
      card.closest?.("[data-occludable-job-id]")?.getAttribute("data-occludable-job-id") ||
      "";
    if (occAttr && /^\d+$/.test(occAttr.trim())) return occAttr.trim();

    const href = card.querySelector?.("a[href*='/jobs/view/']")?.getAttribute("href") || "";
    const m = href.match(/\/jobs\/view\/(?:[^/?#]*-)?(\d+)/);
    if (m) return m[1];

    return "";
  }

  function isInsideNonResultsSection(el) {
    return !!(el?.closest("#jobs-search-results-footer") || el?.closest(".continuous-discovery-modules"));
  }

  function isValidJobCardElement(el) {
    if (!el || isInsideNonResultsSection(el)) return false;
    const jobId = getCardJobId(el);
    if (!jobId || jobId === "search") return false;
    return !!el.querySelector("a[href*='/jobs/view/']");
  }

  function getPageSignature() {
    const pageState = findPageState();
    if (pageState) return `p:${pageState.current}/${pageState.total}`;
    const cards = getJobCards();
    const firstId = cards[0] ? getCardJobId(cards[0]) : "";
    return `f:${firstId || "none"}:${cards.length}`;
  }

  function getBroadJobLikeCardCount() {
    if (betaMode) return getBetaJobCards().length;
    return Array.from(document.querySelectorAll("li[data-occludable-job-id], div.job-card-container, [data-job-id]"))
      .filter((el) => !isInsideNonResultsSection(el))
      .filter((el) => {
        const jobId = getCardJobId(el);
        if (jobId && jobId !== "search") return true;
        return !!el.querySelector("a[href*='/jobs/view/']");
      })
      .length;
  }

  function assessResultsHealth(validCards) {
    const pageState = findPageState();
    const isLastPage = !!(pageState && pageState.current >= pageState.total);
    const broadCount = getBroadJobLikeCardCount();
    const validCount = validCards.length;

    if (validCount === 0 && broadCount > 0 && !isLastPage) {
      return {
        suspicious: true,
        reason: `No valid cards extracted but ${broadCount} job-like elements are present.`,
        validCount,
        broadCount,
      };
    }

    const severeMismatch =
      validCount > 0 &&
      validCount < MIN_VALID_CARDS_THRESHOLD &&
      broadCount >= MIN_BROAD_CARDS_FOR_MISMATCH &&
      validCount * 3 < broadCount &&
      !isLastPage;

    if (severeMismatch) {
      return {
        suspicious: true,
        reason: `Only ${validCount} valid cards extracted while ${broadCount} job-like elements are present.`,
        validCount,
        broadCount,
      };
    }

    return { suspicious: false, reason: "", validCount, broadCount };
  }

  function getJobCards() {
    if (betaMode) return getBetaJobCards();
    const primaryList =
      document.querySelector(".scaffold-layout__list ul") ||
      document.querySelector(".jobs-search-results-list ul") ||
      document.querySelector("ul.scaffold-layout__list-container") ||
      document.querySelector("ul[role='list']");

    if (primaryList) {
      // Restrict to the real left-rail search results only.
      const primaryCards = Array.from(
        primaryList.querySelectorAll("li[data-occludable-job-id], li.scaffold-layout__list-item"),
      ).filter(isValidJobCardElement);

      if (primaryCards.length > 0) {
        log(`Found ${primaryCards.length} cards in primary results list`);
        return primaryCards;
      }
    }

    // LinkedIn job cards have data-job-id or class job-card-container.
    // Keep this fallback for older layouts where the list root selector differs.
    const selectors = [
      ".scaffold-layout__list-container li.ember-view",
      "li[data-occludable-job-id]",
      ".scaffold-layout__list-container .scaffold-layout__list-item",
      "li div.job-card-container",
      "div.job-card-container",
    ];
    for (const sel of selectors) {
      const cards = Array.from(document.querySelectorAll(sel))
        .filter(isValidJobCardElement);
      if (cards.length > 0) {
        log(`Found ${cards.length} cards with selector: ${sel}`);
        return cards;
      }
    }

    // Fallback: find any elements with data-job-id
    const dataJobIds = Array.from(document.querySelectorAll("[data-job-id]")).filter(isValidJobCardElement);
    if (dataJobIds.length > 0) {
      log(`Fallback: found ${dataJobIds.length} elements with data-job-id`);
      return dataJobIds;
    }

    // Last fallback: li items containing job links
    const allLis = document.querySelectorAll("li");
    const jobLis = Array.from(allLis).filter((li) => {
      if (isInsideNonResultsSection(li)) return false;
      const href = li.querySelector("a[href*='/jobs/view/']");
      const hasDataId = li.querySelector("[data-job-id]");
      return !!href && !!hasDataId && li.offsetHeight > 50;
    });
    if (jobLis.length > 0) {
      log(`Last fallback: found ${jobLis.length} li elements with job links`);
      return jobLis;
    }

    log("No job cards found.");
    return [];
  }

  // --- EASY APPLY DETECTION (from the job card in the list, NOT the detail panel) ---

  function isEasyApplyFromCard(card) {
    if (betaMode) return isEasyApplyFromBetaCard(card);
    // The most reliable indicator: the card footer has "Easy Apply" text with LinkedIn icon
    const footerItems = card.querySelectorAll(".job-card-container__footer-item, li");
    for (const item of footerItems) {
      const text = item.textContent.trim().toLowerCase();
      if (text.includes("easy apply")) {
        log("Easy Apply detected from card footer text");
        return true;
      }
    }

    // Also check for the LinkedIn bug icon followed by "Easy Apply"
    const svgs = card.querySelectorAll("svg[data-test-icon='linkedin-bug-color-small']");
    if (svgs.length > 0) {
      const parent = svgs[0].closest("li") || svgs[0].parentElement;
      if (parent && parent.textContent.toLowerCase().includes("easy apply")) {
        log("Easy Apply detected from LinkedIn bug icon in card");
        return true;
      }
    }

    return false;
  }

  // --- DETAIL PANEL EXTRACTION ---

  function getDetailContainer() {
    if (betaMode) return getBetaDetailContainer();
    return document.querySelector(".jobs-search__job-details--container") ||
           document.querySelector(".jobs-search__job-details--wrapper") ||
           document.querySelector(".jobs-details__main-content");
  }

  function extractJobUrl() {
    // Try currentJobId from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const currentJobId = urlParams.get("currentJobId");
    if (currentJobId) return `https://www.linkedin.com/jobs/view/${currentJobId}`;

    // Try from URL path
    const pathMatch = window.location.href.match(/\/jobs\/view\/(\d+)/);
    if (pathMatch) return `https://www.linkedin.com/jobs/view/${pathMatch[1]}`;

    // Try from detail panel link
    const detail = getDetailContainer();
    if (detail) {
      const link = detail.querySelector("a[href*='/jobs/view/']");
      if (link) {
        const m = link.href.match(/\/jobs\/view\/(\d+)/);
        if (m) return `https://www.linkedin.com/jobs/view/${m[1]}`;
      }
    }

    // Try from data-job-id on the active card
    const activeCard = document.querySelector(".jobs-search-two-pane__job-card-container--viewport-tracking-0, [aria-current='page']");
    if (activeCard) {
      const jobId = activeCard.getAttribute("data-job-id") || activeCard.closest("[data-job-id]")?.getAttribute("data-job-id");
      if (jobId) return `https://www.linkedin.com/jobs/view/${jobId}`;
    }

    return window.location.href;
  }

  function decodeJsonString(s) {
    try {
      return JSON.parse(`"${s.replace(/"/g, '\\"')}"`);
    } catch {
      return s.replace(/\\u002F/gi, "/").replace(/\\\//g, "/");
    }
  }

  function tidyApplyUrl(raw) {
    if (!raw) return "";
    try {
      const abs = new URL(raw, window.location.origin);
      const redirectTarget =
        abs.searchParams.get("url") ||
        abs.searchParams.get("target") ||
        abs.searchParams.get("targetUrl") ||
        abs.searchParams.get("redirectUrl");
      if (redirectTarget) {
        try {
          return new URL(redirectTarget).toString();
        } catch {
          return redirectTarget;
        }
      }
      return abs.toString();
    } catch {
      return raw;
    }
  }

  function findApplyUrlInEmbeddedJson(explicitId) {
    const currentId =
      explicitId ||
      new URLSearchParams(window.location.search).get("currentJobId") ||
      (window.location.href.match(/\/jobs\/view\/(\d+)/) || [])[1] ||
      "";
    const blobs = [
      ...Array.from(document.querySelectorAll("code")),
      ...Array.from(document.querySelectorAll("script[type='application/json']")),
      ...Array.from(document.querySelectorAll("script[type='application/ld+json']")),
    ];
    // Require LinkedIn's URN form (e.g. urn:li:fsd_jobPosting:NNN). A bare substring
    // match against the job ID is too loose: a leftover Voyager blob from a previously
    // viewed job often mentions the new job's ID in a tracking/recommendation field and
    // would then leak its own (wrong) applyUrl into every subsequent extraction.
    const escapedId = currentId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const urnRegex = currentId ? new RegExp(`jobPosting:${escapedId}\\b`) : null;
    const candidates = [];
    for (const node of blobs) {
      const text = node.textContent || "";
      if (!text || text.length < 100) continue;
      if (
        !text.includes("companyApplyUrl") &&
        !text.includes("applyUrl") &&
        !text.includes("externalApplyUrl") &&
        !text.includes("offsiteApplyUrl") &&
        !text.includes("OffsiteApply")
      ) {
        continue;
      }
      if (urnRegex && !urnRegex.test(text)) continue;
      const re = /"(?:companyApplyUrl|applyUrl|externalApplyUrl|offsiteApplyUrl)"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/g;
      const matches = text.matchAll(re);
      for (const m of matches) {
        const url = m[1];
        if (!url) continue;
        const decoded = decodeJsonString(url);
        if (!/^https?:\/\//i.test(decoded)) continue;
        const isLinkedInRedirect = /linkedin\.com\/(redir|jobs\/view)/i.test(decoded);
        candidates.push({ url: decoded, isLinkedInRedirect });
      }
    }
    if (candidates.length === 0) return "";
    candidates.sort((a, b) => {
      if (a.isLinkedInRedirect !== b.isLinkedInRedirect) return a.isLinkedInRedirect ? 1 : -1;
      return 0;
    });
    return candidates[0].url;
  }

  // --- VOYAGER API APPLY-URL LOOKUP ---
  //
  // The reliable way to get a job's real (off-LinkedIn) apply URL is to ask
  // LinkedIn's own job API for that exact job id. During a scan we navigate the
  // jobs SPA by clicking cards: the rendered "Apply" button is a <button> that
  // opens the company site via JS (no href in the DOM), and the server-rendered
  // JSON blobs only ever describe the FIRST job loaded at page load — they are
  // never re-injected for cards loaded over XHR. So both DOM scraping paths come
  // up empty after the first job, which is why every row used to fall back to
  // the LinkedIn link. This call runs on linkedin.com with the user's own
  // session cookies, scoped to a single job id, so it can't leak a neighbor's
  // URL and works the same for every card on every page.

  function getLinkedInCsrfToken() {
    // LinkedIn's own web client uses the JSESSIONID cookie value (quotes
    // stripped) as the csrf-token header. The cookie is readable from JS.
    const m = (document.cookie || "").match(/JSESSIONID=("?)([^";]+)\1/);
    return m ? m[2] : "";
  }

  // Pure parser: recursively scan a Voyager jobPostings response (REST or
  // normalized+json, possibly wrapped in {data, included}) for the external
  // company apply URL. Easy Apply / onsite jobs carry no companyApplyUrl, so
  // those correctly yield "". Kept side-effect free so it can be unit tested.
  function extractCompanyApplyUrlFromVoyagerData(data) {
    if (!data || typeof data !== "object") return "";
    const companyApply = [];
    const genericApply = [];
    const stack = [data];
    let guard = 0;
    while (stack.length && guard < 200000) {
      guard++;
      const node = stack.pop();
      if (!node || typeof node !== "object") continue;
      if (Array.isArray(node)) {
        for (const v of node) if (v && typeof v === "object") stack.push(v);
        continue;
      }
      for (const k in node) {
        const v = node[k];
        if (typeof v === "string") {
          if (!/^https?:\/\//i.test(v)) continue;
          if (k === "companyApplyUrl") companyApply.push(v);
          else if (k === "applyUrl" && !/linkedin\.com/i.test(v)) genericApply.push(v);
        } else if (v && typeof v === "object") {
          stack.push(v);
        }
      }
    }
    return companyApply[0] || genericApply[0] || "";
  }

  // Regex scan of raw text (a JSON string or a full HTML page, possibly
  // HTML-entity-escaped) for the company apply URL. Used for the job-page
  // fallback where we don't have a parsed object.
  function findCompanyApplyUrlInText(text) {
    if (!text) return "";
    const patterns = [
      /"companyApplyUrl"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/i,
      /&quot;companyApplyUrl&quot;\s*:\s*&quot;([^&]+)&quot;/i,
    ];
    for (const re of patterns) {
      const m = text.match(re);
      if (m && m[1]) {
        const decoded = decodeJsonString(m[1]).replace(/&amp;/g, "&");
        if (/^https?:\/\//i.test(decoded)) return decoded;
      }
    }
    return "";
  }

  async function fetchApplyUrlFromVoyager(jobId) {
    if (!jobId) return "";
    const csrf = getLinkedInCsrfToken();

    // Primary: LinkedIn's authenticated job API. The endpoint exists and only
    // needs the user's own session (cookies + csrf-token from the JSESSIONID
    // cookie). Two response shapes are tried in case a decoration is partial.
    if (csrf) {
      const endpoints = [
        `https://www.linkedin.com/voyager/api/jobs/jobPostings/${jobId}?decorationId=com.linkedin.voyager.deco.jobs.web.shared.WebFullJobPosting-65`,
        `https://www.linkedin.com/voyager/api/jobs/jobPostings/${jobId}`,
      ];
      for (const url of endpoints) {
        try {
          const res = await fetch(url, {
            method: "GET",
            credentials: "include",
            headers: {
              "csrf-token": csrf,
              accept: "application/vnd.linkedin.normalized+json+2.1",
              "x-restli-protocol-version": "2.0.0",
              "x-li-lang": "en_US",
            },
          });
          if (!res.ok) {
            log(`Apply lookup: voyager REST ${res.status} for job ${jobId}`, "warn");
            continue;
          }
          const data = await res.json();
          const raw = extractCompanyApplyUrlFromVoyagerData(data);
          if (raw) {
            const tidied = tidyApplyUrl(raw);
            log(`Apply URL (voyager REST) for job ${jobId}: ${tidied}`);
            return tidied;
          }
          log(`Apply lookup: voyager 200 for job ${jobId} but no companyApplyUrl (likely Easy Apply)`);
        } catch (e) {
          log(`Apply lookup: voyager REST failed for job ${jobId}: ${e.message}`, "warn");
        }
      }
    } else {
      log("Apply lookup: no JSESSIONID/csrf-token cookie; using job-page fallback", "warn");
    }

    // Fallback: the authenticated job page HTML. Version-independent (doesn't
    // depend on any voyager decoration) and works even without a csrf token,
    // because a same-origin fetch carries the session cookies. Only runs when
    // the API path above produced nothing.
    try {
      const res = await fetch(`https://www.linkedin.com/jobs/view/${jobId}`, {
        method: "GET",
        credentials: "include",
      });
      if (res.ok) {
        const text = await res.text();
        const raw = findCompanyApplyUrlInText(text);
        if (raw) {
          const tidied = tidyApplyUrl(raw);
          log(`Apply URL (job page) for job ${jobId}: ${tidied}`);
          return tidied;
        }
        log(`Apply lookup: job page for ${jobId} had no companyApplyUrl (likely Easy Apply)`);
      } else {
        log(`Apply lookup: job page ${res.status} for job ${jobId}`, "warn");
      }
    } catch (e) {
      log(`Apply lookup: job page failed for job ${jobId}: ${e.message}`, "warn");
    }

    return "";
  }

  function extractApplyUrl(explicitId) {
    if (betaMode) {
      const fromBeta = extractBetaApplyUrl();
      if (fromBeta) return fromBeta;
      const fromJson = findApplyUrlInEmbeddedJson(explicitId);
      return fromJson ? tidyApplyUrl(fromJson) : "";
    }
    const detail = getDetailContainer();
    if (!detail) {
      const fromJson = findApplyUrlInEmbeddedJson(explicitId);
      return fromJson ? tidyApplyUrl(fromJson) : "";
    }
    const selectors = [
      "a[data-live-test-job-apply-button]",
      ".jobs-apply-button a",
      "a.jobs-apply-button",
      "a[href*='offsite']",
      "a[href*='externalApply']",
      "a[href*='linkedin.com/redir/redirect']",
    ];
    for (const sel of selectors) {
      const link = detail.querySelector(sel);
      if (!link) continue;
      const href = (link.getAttribute("href") || "").trim();
      if (!href) continue;
      const tidied = tidyApplyUrl(href);
      if (tidied) return tidied;
    }

    // Fallback 1: read href off the apply button if LinkedIn ever stamps one on the <button>
    const btn =
      detail.querySelector("button[data-live-test-job-apply-button]") ||
      detail.querySelector("#jobs-apply-button-id");
    if (btn) {
      const dataAttrs = ["data-apply-url", "data-href", "data-job-apply-url"];
      for (const attr of dataAttrs) {
        const v = btn.getAttribute(attr);
        if (v && /^https?:\/\//i.test(v)) return tidyApplyUrl(v);
      }

      // Some LinkedIn layouts wrap the apply button in an anchor while the
      // button itself has no href/data attrs.
      const wrappedLink = btn.closest("a[href]");
      if (wrappedLink) {
        const href = (wrappedLink.getAttribute("href") || "").trim();
        if (href) return tidyApplyUrl(href);
      }

      // Another common structure is an anchor sibling in the same button
      // container; prefer any offsite link we can find there.
      const btnContainer = btn.parentElement;
      const siblingLink = btnContainer?.querySelector("a[href]");
      if (siblingLink) {
        const href = (siblingLink.getAttribute("href") || "").trim();
        if (href) return tidyApplyUrl(href);
      }
    }

    // Fallback 2: scan embedded Voyager JSON blobs for companyApplyUrl / applyUrl
    const fromJson = findApplyUrlInEmbeddedJson(explicitId);
    if (fromJson) return tidyApplyUrl(fromJson);

    return "";
  }

  function extractTitle() {
    if (betaMode) return extractBetaTitle();
    const detail = getDetailContainer();
    const scope = detail || document;
    const selectors = [
      ".job-details-jobs-unified-top-card__job-title h1 a",
      ".job-details-jobs-unified-top-card__job-title h1",
      ".job-details-jobs-unified-top-card__job-title a",
      ".job-details-jobs-unified-top-card__job-title",
      ".jobs-unified-top-card__job-title a",
      ".jobs-unified-top-card__job-title",
      "h1.t-24.t-bold",
      "h1.t-24",
    ];
    for (const sel of selectors) {
      const el = scope.querySelector(sel);
      if (el) {
        const t = el.textContent.trim();
        if (t && t.length < 200) { log(`Title: "${t}" (${sel})`); return t; }
      }
    }
    log("Could not extract title from detail panel");
    return "";
  }

  function extractCompany() {
    if (betaMode) return extractBetaCompany();
    const detail = getDetailContainer();
    const scope = detail || document;
    const selectors = [
      ".job-details-jobs-unified-top-card__company-name a",
      ".job-details-jobs-unified-top-card__company-name",
      ".jobs-unified-top-card__company-name a",
      ".jobs-unified-top-card__company-name",
    ];
    for (const sel of selectors) {
      const el = scope.querySelector(sel);
      if (el) {
        const t = el.textContent.trim();
        if (t && t.length < 100) { log(`Company: "${t}" (${sel})`); return t; }
      }
    }
    log("Could not extract company");
    return "";
  }

  // Ghost-job signals from the detail panel's subtitle line, e.g.
  // "Yerevan · Reposted 2 weeks ago · Over 100 applicants". Best effort: a
  // piece that is not on the page is simply left out.
  function extractSignals() {
    let text = "";
    if (betaMode) {
      const d = getBetaDetailContainer();
      if (d) {
        for (const p of d.querySelectorAll("p")) {
          const t = p.textContent || "";
          if (/ago\b|applicant|clicked apply/i.test(t)) {
            text = t;
            break;
          }
        }
      }
    } else {
      const scope = getDetailContainer() || document;
      const c =
        scope.querySelector(".job-details-jobs-unified-top-card__tertiary-description-container") ||
        scope.querySelector(".job-details-jobs-unified-top-card__primary-description-container");
      text = c ? c.textContent || "" : "";
    }
    text = text.replace(/\s+/g, " ").trim();
    if (!text) return null;
    const signals = {};
    const posted = text.match(/(Reposted\s+)?(\d+\s+(?:minute|hour|day|week|month|year)s?\s+ago)/i);
    if (posted) {
      signals.postedText = posted[2];
      signals.reposted = !!posted[1];
    }
    const applicants = text.match(/((?:Over\s+)?\d[\d,]*\s+(?:applicants?|people clicked apply))/i);
    if (applicants) signals.applicants = applicants[1];
    return Object.keys(signals).length ? signals : null;
  }

  function extractLocation() {
    if (betaMode) return extractBetaLocation();
    const detail = getDetailContainer();
    const scope = detail || document;
    // Look for tvm__text spans in the tertiary description
    const tertiaryContainer = scope.querySelector(".job-details-jobs-unified-top-card__tertiary-description-container") ||
                               scope.querySelector(".job-details-jobs-unified-top-card__primary-description-container");
    if (tertiaryContainer) {
      const spans = tertiaryContainer.querySelectorAll("span.tvm__text");
      for (const span of spans) {
        const t = span.textContent.trim();
        // Skip time/applicant text, keep location-like text
        if (t && t.length > 2 && t.length < 100 &&
            !t.match(/^\d+ (applicant|people|hour|day|week|month|minute|second)/i) &&
            !t.match(/^(promoted|responses|viewed)/i) &&
            !t.match(/ago$/i)) {
          log(`Location: "${t}"`);
          return t;
        }
      }
    }

    // Fallback: look for workspace type buttons
    const buttons = (scope).querySelectorAll(".job-details-fit-level-preferences button");
    const types = [];
    for (const btn of buttons) {
      const t = btn.textContent.trim();
      if (t.match(/remote|hybrid|on-site/i)) types.push(t);
    }
    if (types.length > 0) {
      log(`Location from preferences: "${types.join(", ")}"`);
      return types.join(", ");
    }

    return "";
  }

  function extractDescription() {
    if (betaMode) return extractBetaDescription();
    const selectors = [
      "#job-details",
      ".jobs-description-content__text",
      ".jobs-description__content",
      ".jobs-box__html-content",
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) {
        const t = el.innerText.trim();
        if (t.length > 50) {
          log(`Description: ${t.length} chars (${sel})`);
          return t;
        }
      }
    }
    log("Could not extract description (too short or not found)");
    return "";
  }

  // --- SERVER COMMUNICATION ---

  async function analyzeOnServer(jobData) {
    const url = `${serverUrl}/api/extension/analyze`;
    const headers = { "Content-Type": "application/json" };
    if (apiKey) headers["X-API-Key"] = apiKey;

    log(`POST ${url} - title="${jobData.title}", company="${jobData.company}", easyApply=${jobData.easyApply}, descLen=${jobData.description?.length || 0}`);

    const MAX_ATTEMPTS = 2;
    let lastErr = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(jobData),
        });

        if (res.status === 401) {
          const body = await res.json().catch(() => ({}));
          const err = new Error(body.error || "The server rejected the extension API key.");
          err.authError = true;
          throw err;
        }

        if (!res.ok) {
          const errBody = await res.text().catch(() => "");
          log(`Server error ${res.status} (attempt ${attempt}/${MAX_ATTEMPTS}): ${errBody}`, "error");
          if (res.status >= 500 && attempt < MAX_ATTEMPTS) {
            await sleep(1500);
            continue;
          }
          throw new Error(`Server ${res.status}: ${errBody}`);
        }

        const result = await res.json();
        log(
          `Server response: action=${result.action}, alreadyExists=${result.alreadyExists}, linkedInDismiss=${result.linkedInDismiss}, score=${result.score}, reason="${result.reason || ""}", error="${result.error || ""}"`,
        );
        return result;
      } catch (err) {
        if (err.authError) throw err;
        lastErr = err;
        log(`Fetch failed (attempt ${attempt}/${MAX_ATTEMPTS}): ${err.message}`, "warn");
        if (attempt < MAX_ATTEMPTS) {
          await sleep(2000);
        }
      }
    }

    throw lastErr || new Error("Unknown fetch failure");
  }

  // --- DISMISS / NOT INTERESTED ---

  async function clickDismiss(card) {
    if (betaMode) {
      try {
        const dismissed = clickBetaDismiss(card);
        if (dismissed) await sleep(500);
        return dismissed;
      } catch (e) {
        log(`Beta: error dismissing: ${e.message}`);
        return false;
      }
    }
    try {
      // LinkedIn has a dismiss X button on each card
      const dismissBtn =
        card.querySelector("button[aria-label*='Dismiss']") ||
        card.querySelector("button[aria-label*='Not interested']") ||
        card.querySelector("button[aria-label*='Hide']") ||
        card.querySelector("button.job-card-container__action") ||
        card.querySelector("button[data-control-name*='dismiss']") ||
        card.querySelector("button[data-control-name*='not_interested']");
      if (dismissBtn) {
        log(`Clicking dismiss button: "${dismissBtn.getAttribute("aria-label") || "dismiss"}"`);
        dismissBtn.click();
        await sleep(500);
        return true;
      }

      // Fallback: try action buttons in the details panel when card-level action is unavailable.
      const detailDismiss =
        document.querySelector("button[aria-label*='Dismiss']") ||
        document.querySelector("button[aria-label*='Not interested']") ||
        document.querySelector("button[data-control-name*='dismiss']") ||
        document.querySelector("button[data-control-name*='not_interested']");
      if (detailDismiss) {
        log(`Clicking fallback dismiss button: "${detailDismiss.getAttribute("aria-label") || "dismiss"}"`);
        detailDismiss.click();
        await sleep(500);
        return true;
      }
      log("No dismiss button found on card");
    } catch (e) {
      log(`Error dismissing: ${e.message}`);
    }
    return false;
  }

  // --- PROCESS A SINGLE JOB CARD ---

  async function processCard(card, index, totalCards) {
    if (stopRequested) return "stopped";

    sendProgress(`Checking job ${index + 1}/${totalCards}...`);

    // Cards previously dismissed by an earlier scan come back wearing
    // `.job-card-list--is-dismissed` ("We won't show you this job again").
    // We want to re-process them so the current extractor can backfill
    // missing data (manual apply URL most importantly) on the existing DB
    // row. Click the per-card "undo" button to restore the card to its
    // active state, then fall through to the normal scan flow. The dedup
    // path in upsertScrapedJob will refresh the row's fields without
    // creating a duplicate, and analyzeJob short-circuits if the row was
    // already classified — so re-processing is cheap and safe.
    const innerCard = card.matches?.("[data-job-id]") ? card : card.querySelector("[data-job-id]");
    const dismissedTarget = innerCard || card;
    if (dismissedTarget.classList?.contains("job-card-list--is-dismissed")) {
      const undoBtn =
        card.querySelector("button[aria-label*='dismissed, undo']") ||
        card.querySelector("button[aria-label*='undo']");
      if (undoBtn) {
        log(`Job ${index + 1}: undismissing previously dismissed card to re-process.`);
        undoBtn.click();
        // Poll for the dismissed class to actually disappear instead of
        // sleeping a fixed amount. LinkedIn's React render after the click
        // is usually <300ms but can spike under load — give it up to 3s,
        // then proceed regardless.
        const undismissDeadline = Date.now() + 3000;
        while (
          dismissedTarget.classList?.contains("job-card-list--is-dismissed") &&
          Date.now() < undismissDeadline &&
          !stopRequested
        ) {
          await sleep(150);
        }
        if (dismissedTarget.classList?.contains("job-card-list--is-dismissed")) {
          log(`Job ${index + 1}: undo click did not flip card state in time; processing anyway.`);
        }
      } else {
        log(`Job ${index + 1}: dismissed but no undo button found; processing anyway.`);
      }
    }

    // First: check Easy Apply from the card BEFORE clicking it
    const easyApply = isEasyApplyFromCard(card);
    if (easyApply) {
      log(`Job ${index + 1}: Easy Apply detected from card (${easyApplyMode === "analyze" ? "will analyze with AI" : "will skip and hide"})`);
    }

    // Get job URL + quick fields from the card. The classic and AI-search
    // layouts expose these completely differently, so read them mode-aware:
    // beta cards carry the job id in their componentkey and the title/company/
    // location as ordered <p> nodes, with no /jobs/view/ link to click.
    const cardJobId = resolveCardJobId(card);
    const cardLink = betaMode ? null : card.querySelector("a[href*='/jobs/view/']");
    const quick = betaMode
      ? getBetaCardFields(card)
      : (() => {
          const titleEl = card.querySelector(".job-card-list__title--link, a[class*='job-card-container__link']");
          const companyEl = card.querySelector(".artdeco-entity-lockup__subtitle span");
          return {
            title: titleEl?.textContent?.trim() || "",
            company: companyEl?.textContent?.trim() || "",
            location: "",
            titleEl,
          };
        })();
    const cardTitleText = quick.title;
    const cardCompanyText = quick.company;
    const cardLocationText = quick.location;

    const cardId = cardJobId || `idx-${index}-${Date.now()}`;

    log(`Card ${index + 1}: title="${cardTitleText}", company="${cardCompanyText}", easyApply=${easyApply}, jobId=${cardJobId}`);

    // Click the card to load the detail panel
    const clickTarget = betaMode
      ? getBetaCardClickTarget(card)
      : (cardLink || quick.titleEl || card);
    clickTarget.click();
    await sleep(2000);

    // Wait for detail panel to load
    if (betaMode) {
      await waitForBetaDetail(cardJobId);
    } else {
      await waitForSelector("#job-details, .job-details-jobs-unified-top-card__job-title", document, 8000);
      await sleep(800);
    }

    // Extract from detail panel
    const title = extractTitle() || cardTitleText;
    const company = extractCompany() || cardCompanyText;
    const location = extractLocation() || cardLocationText;
    const description = extractDescription();
    const signals = extractSignals();
    const jobUrl = cardJobId
      ? `https://www.linkedin.com/jobs/view/${cardJobId}`
      : extractJobUrl();
    // Apply URL: the real (off-LinkedIn) company application page. Ask
    // LinkedIn's job API for this exact job id first — it's authoritative and
    // survives card-to-card SPA navigation — then fall back to scraping the
    // detail panel / embedded JSON, scoped to the same job id. Easy Apply jobs
    // have no external page, so applyUrl stays empty for them.
    let applyUrl = "";
    if (!easyApply) {
      if (cardJobId) applyUrl = await fetchApplyUrlFromVoyager(cardJobId);
      if (!applyUrl) applyUrl = extractApplyUrl(cardJobId);
    }

    log(`Extracted: title="${title}", company="${company}", location="${location}", desc=${description.length}chars, url=${jobUrl}, applyUrl=${applyUrl || "n/a"}`);

    async function maybeHideSkippedCard() {
      const dismissed = await clickDismiss(card);
      if (dismissed) {
        stats.hidden++;
      }
      return dismissed;
    }

    if (!title || !company) {
      stats.skipped++;
      await maybeHideSkippedCard();
      sendProgress(`Skipped ${index + 1}/${totalCards}: no title/company`, null);
      sendResult({
        id: cardId,
        index,
        total: totalCards,
        title: title || cardTitleText || "(unknown)",
        company: company || cardCompanyText || "(unknown)",
        location,
        url: jobUrl,
        status: "skipped",
        reason: "Could not extract title or company from card",
        score: 0,
        timestamp: new Date().toISOString(),
      });
      return "skipped";
    }

    // Mark this job as the currently-analyzing one (popup shows spinner)
    sendProgress(`Analyzing ${index + 1}/${totalCards}: ${title}...`, {
      id: cardId,
      index,
      total: totalCards,
      title,
      company,
      location,
      startedAt: Date.now(),
    });

    try {
      const result = await analyzeOnServer({
        title,
        company,
        location,
        url: jobUrl,
        applyUrl,
        description,
        easyApply,
        easyApplyMode,
        easyApplyMinScore,
        signals,
      });

      stats.checked++;

      const baseResult = {
        id: cardId,
        index,
        total: totalCards,
        title,
        company,
        location,
        url: jobUrl,
        score: result.score || 0,
        reason: result.reason || "",
        applyMethod: result.applyMethod || (easyApply ? "EASY_APPLY" : "EXTERNAL"),
        timestamp: new Date().toISOString(),
      };

      if (result.alreadyExists || result.action === "skipped") {
        stats.skipped++;
        await maybeHideSkippedCard();
        sendProgress(`Already processed ${index + 1}: ${title}`, null);
        sendResult({ ...baseResult, status: "already_processed", reason: result.reason || "Already analyzed" });
        return "skipped";
      }

      if (result.action === "easy_apply") {
        stats.hidden++;
        sendProgress(`Easy Apply hidden ${index + 1}: ${title}`, null);
        sendResult({ ...baseResult, status: "easy_apply", reason: result.reason || "Easy Apply auto-rejected" });
        await clickDismiss(card);
        return "hidden";
      }

      if (result.action === "rejected") {
        const dismissOnLinkedIn = result.linkedInDismiss !== false;
        if (dismissOnLinkedIn) {
          stats.hidden++;
          sendProgress(`Rejected ${index + 1}: ${title} (${result.reason || ""})`, null);
          sendResult({ ...baseResult, status: "rejected" });
          await clickDismiss(card);
          return "hidden";
        }
        stats.skipped++;
        await maybeHideSkippedCard();
        sendProgress(`Analysis issue (card kept): ${index + 1}: ${title} (${result.reason || ""})`, null);
        sendResult({ ...baseResult, status: "analysis_issue" });
        return "skipped";
      }

      if (result.action === "approved") {
        stats.approved++;
        const hideApproved = await new Promise((resolve) =>
          chrome.storage.local.get(["hideApproved"], (d) => resolve(!!d.hideApproved))
        );
        if (hideApproved) {
          stats.hidden++;
          sendProgress(`Approved & hidden ${index + 1}: ${title} (score: ${result.score})`, null);
          sendResult({
            ...baseResult,
            status: "approved",
            reason: `${result.reason || ""}${result.reason ? " " : ""}[card hidden by 'Also hide approved jobs' setting]`,
          });
          await clickDismiss(card);
          return "approved";
        }
        sendProgress(`Approved ${index + 1}: ${title} (score: ${result.score})`, null);
        sendResult({ ...baseResult, status: "approved" });
        return "approved";
      }

      if (result.action === "error") {
        stats.skipped++;
        await maybeHideSkippedCard();
        sendProgress(`Server error for ${title}: ${result.error || "unknown"}`, null);
        sendResult({ ...baseResult, status: "error", reason: result.error || "Server error" });
        return "error";
      }

      stats.skipped++;
      await maybeHideSkippedCard();
      sendResult({ ...baseResult, status: "unknown", reason: result.reason || "Unknown server response" });
      return "unknown";
    } catch (err) {
      if (err.authError) {
        // Every other request would fail the same way — stop the scan and
        // leave the card untouched.
        authFailure = err.message;
        stopRequested = true;
        sendResult({
          id: cardId,
          index,
          total: totalCards,
          title,
          company,
          location,
          url: jobUrl,
          status: "error",
          score: 0,
          reason: err.message,
          timestamp: new Date().toISOString(),
        });
        return "error";
      }
      stats.skipped++;
      await maybeHideSkippedCard();
      sendProgress(`Error ${index + 1}: ${err.message}`, null);
      sendResult({
        id: cardId,
        index,
        total: totalCards,
        title,
        company,
        location,
        url: jobUrl,
        status: "error",
        score: 0,
        reason: err.message || "Network/server error",
        timestamp: new Date().toISOString(),
      });
      return "error";
    }
  }

  // --- PAGINATION ---

  async function scrollJobsListToBottom() {
    // LinkedIn renders pagination only after you scroll the list container to the bottom.
    const container = getResultsListContainer();
    if (!container) {
      log("No jobs list container found for scroll");
      return;
    }
    log("Scrolling jobs list to bottom to reveal pagination");
    let prev = -1;
    for (let i = 0; i < 10; i++) {
      container.scrollTop = container.scrollHeight;
      await sleep(400);
      if (container.scrollTop === prev) break;
      prev = container.scrollTop;
    }
    await sleep(500);
  }

  function getResultsListContainer() {
    if (betaMode) return getBetaResultsListContainer();
    const candidates = [
      document.querySelector(".scaffold-layout__list"),
      document.querySelector(".jobs-search-results-list"),
      document.querySelector(".scaffold-layout__list-container"),
      document.querySelector("div[data-results-list-top-scroll-sentinel]")?.parentElement || null,
    ].filter(Boolean);

    // Prefer the actual scrollable rail. Some LinkedIn layouts keep list items
    // virtualized under `.scaffold-layout__list`, and scrolling a non-scrollable
    // wrapper can miss cards.
    for (const node of candidates) {
      const el = node;
      if (el.scrollHeight > el.clientHeight + 20) return el;
    }

    return candidates[0] || null;
  }

  function findActivePageNumber() {
    if (betaMode) {
      const st = findBetaPageState();
      return st ? st.current : null;
    }
    // LinkedIn uses several pagination DOMs. Try each.
    const sel = document.querySelector("li.artdeco-pagination__indicator--number.active button, li.artdeco-pagination__indicator--number.selected button, button[aria-current='true']");
    if (sel) {
      const t = sel.textContent.trim();
      const n = parseInt(t, 10);
      if (!isNaN(n)) return n;
      const aria = sel.getAttribute("aria-label") || "";
      const m = aria.match(/Page (\d+)/i);
      if (m) return parseInt(m[1], 10);
    }
    // Newer jobs left-rail pagination exposes "Page X of Y".
    const pageState = document.querySelector(".jobs-search-pagination__page-state");
    if (pageState?.textContent) {
      const m = pageState.textContent.match(/Page\s+(\d+)\s+of\s+(\d+)/i);
      if (m) {
        const current = parseInt(m[1], 10);
        const total = parseInt(m[2], 10);
        if (!isNaN(current) && !isNaN(total) && current <= total) return current;
      }
    }
    return null;
  }

  function findPageState() {
    if (betaMode) return findBetaPageState();
    const pageState = document.querySelector(".jobs-search-pagination__page-state");
    if (!pageState?.textContent) return null;
    const m = pageState.textContent.match(/Page\s+(\d+)\s+of\s+(\d+)/i);
    if (!m) return null;
    const current = parseInt(m[1], 10);
    const total = parseInt(m[2], 10);
    if (isNaN(current) || isNaN(total)) return null;
    return { current, total };
  }

  function findPageButton(pageNum) {
    const candidates = [
      `button[aria-label='Page ${pageNum}']`,
      `button[aria-label="Page ${pageNum}"]`,
      `[data-test-pagination-page-btn='${pageNum}'] button`,
      `li[data-test-pagination-page-btn='${pageNum}'] button`,
    ];
    for (const sel of candidates) {
      const btn = document.querySelector(sel);
      if (btn && !btn.disabled && btn.offsetParent !== null) return btn;
    }
    // Fallback: scan all numbered buttons
    const all = document.querySelectorAll("li.artdeco-pagination__indicator--number button, button[aria-label^='Page ']");
    for (const btn of all) {
      const t = btn.textContent.trim();
      if (parseInt(t, 10) === pageNum && !btn.disabled && btn.offsetParent !== null) return btn;
    }
    return null;
  }

  async function goToNextPage() {
    if (betaMode) return goToNextBetaPage();
    await scrollJobsListToBottom();
    const beforeSignature = getPageSignature();

    const pageState = findPageState();
    if (pageState && pageState.current >= pageState.total) {
      log(`Reached last page (${pageState.current}/${pageState.total}), stopping pagination`);
      return false;
    }

    // Strategy 1: find the active page number and click N+1.
    const active = findActivePageNumber();
    if (active != null) {
      log(`Active page detected: ${active}`);
      const nextBtn = findPageButton(active + 1);
      if (nextBtn) {
        log(`Clicking page ${active + 1}`);
        nextBtn.click();
        await sleep(1200);
        const changed = await waitForPageChange(beforeSignature, 10000);
        if (!changed) {
          log("Page button clicked but page signature did not change", "warn");
          return false;
        }
        return true;
      }
      log(`Page ${active + 1} button not found (likely last page)`);
    }

    // Strategy 2: explicit Next button (older DOM).
    const nextSelectors = [
      "button[aria-label='View next page']",
      "button[aria-label='Next']",
      "button.artdeco-pagination__button--next",
      ".artdeco-pagination__button--next",
      "button.jobs-search-pagination__button--next",
      ".jobs-search-pagination__button--next",
    ];
    for (const sel of nextSelectors) {
      const btn = document.querySelector(sel);
      if (btn && !btn.disabled && btn.offsetParent !== null) {
        log(`Next page via fallback selector: ${sel}`);
        btn.click();
        await sleep(1200);
        const changed = await waitForPageChange(beforeSignature, 10000);
        if (!changed) {
          log("Next button clicked but page signature did not change", "warn");
          return false;
        }
        return true;
      }
    }

    // Strategy 3: URL-based pagination (start=N param).
    try {
      const url = new URL(window.location.href);
      const start = parseInt(url.searchParams.get("start") || "0", 10);
      const newStart = start + 25; // LinkedIn jobs uses 25-per-page
      url.searchParams.set("start", String(newStart));
      await sendNavigating(`Trying URL-based pagination: start=${newStart}`);
      window.location.href = url.toString();
      return "navigating";
    } catch (e) {
      log(`URL pagination failed: ${e.message}`);
    }

    log("No next page available (last page reached)");
    return false;
  }

  async function waitForPageChange(previousSignature, timeoutMs = 10000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline && !stopRequested) {
      const cards = getJobCards();
      const signature = getPageSignature();
      if (cards.length > 0 && signature !== previousSignature) {
        await sleep(600);
        return true;
      }
      await sleep(250);
    }
    return false;
  }

  function getCardStableId(card) {
    const jobId = getCardJobId(card);
    if (jobId) return `job:${jobId}`;
    const href = card.querySelector("a[href*='/jobs/view/']")?.getAttribute("href") || "";
    if (href) return `href:${href}`;
    return "";
  }

  async function processAllCardsOnCurrentPage(pageNum) {
    const seenIds = new Set();
    let processedCount = 0;
    let stagnantPasses = 0;
    const maxPasses = 80;

    for (let pass = 0; pass < maxPasses && !stopRequested; pass++) {
      const cards = getJobCards();
      let foundNew = 0;

      for (const card of cards) {
        if (stopRequested) break;
        const stableId = getCardStableId(card);
        if (!stableId || seenIds.has(stableId)) continue;
        seenIds.add(stableId);
        foundNew++;
        processedCount++;
        await processCard(card, processedCount - 1, processedCount);
        processedJobs++;
        if (jobLimitReached()) {
          log(`Reached job scan limit (${jobLimit}); stopping after ${processedJobs} jobs.`);
          break;
        }
        await sleep(1200);
      }

      // Stop paging through this list once the global limit is hit.
      if (jobLimitReached()) break;

      const container = getResultsListContainer();
      if (!container) {
        log("No list container while scanning page; finishing current page pass");
        break;
      }

      const atBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 6;
      if (foundNew === 0) {
        stagnantPasses++;
      } else {
        stagnantPasses = 0;
      }

      if (atBottom && stagnantPasses >= 2) {
        log(`Page ${pageNum}: reached bottom and no new cards found`);
        break;
      }
      if (stagnantPasses >= 5) {
        log(`Page ${pageNum}: stopping after repeated passes without new cards`);
        break;
      }

      const step = Math.max(300, Math.floor(container.clientHeight * 0.85));
      const nextScrollTop = Math.min(container.scrollTop + step, container.scrollHeight);
      if (nextScrollTop === container.scrollTop) {
        stagnantPasses++;
      } else {
        container.scrollTop = nextScrollTop;
      }
      await sleep(450);
    }

    log(`Page ${pageNum}: processed ${processedCount} unique jobs`);
    return processedCount;
  }

  // --- MAIN SCAN LOOP ---

  async function startScan() {
    log("=== SCAN STARTED ===");
    sendProgress("Starting scan...");

    const initialPageState = findPageState();
    let pageNum = initialPageState?.current || findActivePageNumber() || 1;

    while (!stopRequested) {
      sendProgress(`Scanning page ${pageNum}...`);
      await sleep(1500);

      let cards = getJobCards();
      const health = assessResultsHealth(cards);
      if (health.suspicious) {
        log(`Results health warning on page ${pageNum}: ${health.reason}`, "warn");
        await sleep(1500);
        const retryCards = getJobCards();
        const retryHealth = assessResultsHealth(retryCards);
        if (retryHealth.suspicious) {
          sendDone(
            `Safety stop: LinkedIn layout mismatch detected on page ${pageNum}. ` +
              `${retryHealth.reason} Please refresh and retry after verifying the UI. ` +
              `${stats.checked} checked, ${stats.approved} approved, ${stats.hidden} hidden.`,
          );
          return;
        }
        cards = retryCards;
      }

      if (cards.length === 0) {
        sendDone(`Done. No job cards found on page ${pageNum}. ${stats.checked} checked, ${stats.approved} approved, ${stats.hidden} hidden.`);
        return;
      }

      sendProgress(`Page ${pageNum}: scanning all jobs in list...`);

      const processedOnPage = await processAllCardsOnCurrentPage(pageNum);
      if (stopRequested) {
        sendDone(
          authFailure
            ? `Stopped: ${authFailure}`
            : `Stopped. ${stats.checked} checked, ${stats.approved} approved, ${stats.hidden} hidden.`,
        );
        return;
      }
      if (jobLimitReached()) {
        sendDone(`Reached job scan limit of ${jobLimit}. Scanned ${processedJobs} jobs: ${stats.checked} checked, ${stats.approved} approved, ${stats.hidden} hidden.`);
        return;
      }
      if (processedOnPage === 0) {
        sendDone(`Safety stop: No processable jobs found on page ${pageNum}. ${stats.checked} checked, ${stats.approved} approved, ${stats.hidden} hidden.`);
        return;
      }

      sendProgress(`Page ${pageNum} complete. Moving to next...`);
      const hasNext = await goToNextPage();
      if (hasNext === "navigating") {
        return;
      }
      if (!hasNext) {
        sendDone(`All pages scanned. ${stats.checked} checked, ${stats.approved} approved, ${stats.hidden} hidden.`);
        return;
      }

      pageNum++;
    }

    sendDone(`Stopped. ${stats.checked} checked, ${stats.approved} approved, ${stats.hidden} hidden.`);
  }

  function maybeResumeAfterNavigation() {
    chrome.runtime.sendMessage({ type: "GET_BG_STATE" }, (state) => {
      if (chrome.runtime.lastError || !state?.scanning || !state.resumeAfterNavigation || !state.isScanTab) return;
      chrome.storage.local.get(["extensionApiKey", "betaMode", "jobLimit", "easyApplyMode", "easyApplyMinScore"], (data) => {
        if (!state.scanning || scanning) return;
        scanning = true;
        stopRequested = false;
        serverUrl = state.serverUrl || "";
        apiKey = data.extensionApiKey || "";
        betaMode = !!data.betaMode;
        // Restore the limit and the running count so a scan that paged via a
        // full reload keeps honoring the same job-limit budget.
        jobLimit = normalizeJobLimit(data.jobLimit);
        easyApplyMode = normalizeEasyApplyMode(data.easyApplyMode);
        easyApplyMinScore = normalizeMinScore(data.easyApplyMinScore);
        authFailure = "";
        processedJobs = state.processedJobs || 0;
        stats = state.stats || { checked: 0, approved: 0, hidden: 0, skipped: 0 };
        startScan();
      });
    });
  }

  log("Content script loaded: " + window.location.href);
  maybeResumeAfterNavigation();
})();
