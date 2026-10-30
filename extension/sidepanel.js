// Side panel: autofill the application form in the active tab from the
// profile on your Job Finder server, then "Mark as applied".
const $ = (id) => document.getElementById(id);

// This browser's sign-in and, for an admin, whose profile to fill with ("Scan for"
// in the popup; null = the signed-in user). The popup writes both.
let settings = { serverUrl: "", token: "", scanFor: null };
let profileData = null; // { profile, resumes, answers }
let lastMatch = null; // { job, resume }
let lastTop = null; // page context from the top frame's scan
let currentTab = null;
let userPickedResume = false;

function setStatus(text, isError) {
  const el = $("status");
  el.textContent = text || "";
  el.classList.toggle("error", !!isError);
}

async function loadSettings() {
  const d = await chrome.storage.local.get(["serverUrl", "extensionToken", "scanForUserId"]);
  settings = {
    serverUrl: String(d.serverUrl || "").replace(/\/$/, ""),
    token: d.extensionToken || "",
    scanFor: d.scanForUserId || null,
  };
}

async function apiFetch(path, init = {}) {
  if (!settings.serverUrl || !settings.token) {
    throw new Error("Sign in in the extension popup first, then reopen this panel.");
  }
  const headers = { Authorization: `Bearer ${settings.token}` };
  if (settings.scanFor) headers["X-JF-For"] = String(settings.scanFor);
  if (init.json) headers["Content-Type"] = "application/json";
  const res = await fetch(settings.serverUrl + path, {
    method: init.method || (init.json ? "POST" : "GET"),
    headers,
    body: init.json ? JSON.stringify(init.json) : undefined,
  });
  if (init.raw) {
    if (!res.ok) throw new Error(`Server answered HTTP ${res.status}`);
    return res;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Server answered HTTP ${res.status}`);
  return data;
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab || null;
}

async function refreshTab() {
  currentTab = await activeTab();
  $("tabUrl").textContent = currentTab?.url || "(no page)";
  $("matchBox").classList.add("hidden");
  $("resultsCard").classList.add("hidden");
  $("appliedMsg").textContent = "";
  lastMatch = null;
  lastTop = null;
  userPickedResume = false;
  if (profileData) renderResumes();
}

function renderResumes(selectedId) {
  const sel = $("resumeSelect");
  sel.innerHTML = "";
  sel.add(new Option("Don't attach a resume", ""));
  for (const r of profileData?.resumes || []) {
    sel.add(new Option(`${r.name}${r.isDefault ? " (default)" : ""} — ${r.fileName}`, String(r.id)));
  }
  const pick = selectedId ?? (profileData?.resumes || []).find((r) => r.isDefault)?.id;
  if (pick != null) sel.value = String(pick);
}

function placeText(user) {
  return [user.currentLocation, user.targetMarket].filter(Boolean).join(" → ");
}

// Whose profile fills the form, and who is signed in when that is someone else.
function renderWho(me) {
  const el = $("whoLine");
  if (!me) {
    el.textContent = "Not signed in.";
    return;
  }
  const place = placeText(me.user);
  el.textContent =
    `${me.user.name}${place ? ` · ${place}` : ""}` +
    (me.user.id === me.signedIn.id ? "" : ` (filled by ${me.signedIn.name}, picked under “Scan for”)`);
}

async function loadProfile() {
  const [me, data] = await Promise.all([apiFetch("/api/extension/me"), apiFetch("/api/extension/profile")]);
  renderWho(me);
  profileData = data;
  renderResumes();
  const p = profileData.profile || {};
  if (!p.email && !p.firstName) {
    setStatus(`${me.user.name}'s profile is empty — fill it in Admin → Profile & resumes first.`, true);
  }
}

function renderMatch(match) {
  const box = $("matchBox");
  box.innerHTML = "";
  box.classList.remove("hidden");
  if (!match?.job) {
    box.textContent = "Not in your job list yet — “Mark as applied” will add it.";
    box.className = "sub";
    return;
  }
  box.className = "";
  const j = match.job;
  const title = document.createElement("div");
  title.style.fontWeight = "600";
  title.textContent = `${j.title} · ${j.company}`;
  const meta = document.createElement("div");
  meta.className = "sub";
  meta.style.margin = "2px 0 0";
  meta.textContent = `AI ${j.status.toLowerCase()}${j.aiScore != null ? ` · score ${j.aiScore}` : ""}${j.stage ? ` · stage ${j.stage.toLowerCase()}` : ""}`;
  box.appendChild(title);
  box.appendChild(meta);
  if (j.aiReason) {
    const reason = document.createElement("div");
    reason.className = "sub";
    reason.style.margin = "2px 0 0";
    reason.textContent = j.aiReason;
    box.appendChild(reason);
  }
}

const STATUS_STYLE = {
  profile: ["var(--green)", "from profile"],
  resume: ["var(--green)", "resume attached"],
  ai: ["var(--amber)", "AI draft — read it"],
  check: ["var(--amber)", "from your profile — check it fits"],
  missing: ["var(--red)", "needs you"],
};

function renderResults(results) {
  const count = (s) => results.filter((r) => r.status === s).length;
  $("nProfile").textContent = String(count("profile") + count("resume"));
  $("nAi").textContent = String(count("ai") + count("check"));
  $("nMissing").textContent = String(count("missing"));
  const list = $("results");
  list.innerHTML = "";
  const order = { missing: 0, ai: 1, check: 1, resume: 2, profile: 3 };
  for (const r of results.filter((x) => STATUS_STYLE[x.status]).sort((a, b) => order[a.status] - order[b.status])) {
    const li = document.createElement("li");
    const dot = document.createElement("i");
    dot.className = "dot";
    dot.style.background = STATUS_STYLE[r.status][0];
    dot.style.marginTop = "5px";
    const text = document.createElement("div");
    const label = document.createElement("div");
    label.textContent = r.label || "(unlabelled field)";
    const what = document.createElement("div");
    what.className = "what";
    what.textContent = STATUS_STYLE[r.status][1];
    text.appendChild(label);
    text.appendChild(what);
    li.appendChild(dot);
    li.appendChild(text);
    list.appendChild(li);
  }
  $("resultsCard").classList.remove("hidden");
}

function toBase64(bytes) {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  return btoa(bin);
}

function originPattern(url) {
  const u = new URL(url);
  return `${u.protocol}//${u.host}/*`;
}

async function runInFrames(tabId, func, args, frameIds) {
  const target = frameIds ? { tabId, frameIds } : { tabId, allFrames: true };
  const out = await chrome.scripting.executeScript({ target, func, args: args || [] });
  return out.filter((r) => r && r.result != null);
}

$("resumeSelect").addEventListener("change", () => {
  userPickedResume = true;
});

$("fillBtn").addEventListener("click", async () => {
  const tab = currentTab;
  if (!tab?.url || !/^https?:/i.test(tab.url)) {
    setStatus("Open an application form in this tab first.", true);
    return;
  }
  // The permission request must be the first thing in the click: Chrome only
  // shows its prompt during the user's gesture. Known ATS sites are already
  // granted by the manifest, so this returns at once for them.
  let granted = false;
  try {
    granted = await chrome.permissions.request({ origins: [originPattern(tab.url)] });
  } catch (e) {
    setStatus(`Cannot ask for access to this page: ${e.message}`, true);
    return;
  }
  if (!granted) {
    setStatus("Access to this page was refused, so it cannot be filled.", true);
    return;
  }

  $("fillBtn").disabled = true;
  try {
    if (!profileData) {
      setStatus("Loading your profile…");
      await loadProfile();
    }
    setStatus("Reading the form…");
    await chrome.scripting.executeScript({ target: { tabId: tab.id, allFrames: true }, files: ["autofill.js"] });
    const scans = await runInFrames(tab.id, () => (window.__jobFinderAutofill ? window.__jobFinderAutofill.scan() : null));
    const frames = scans.map((s) => ({ frameId: s.frameId, ...s.result })).filter((f) => f.fields && f.fields.length);
    lastTop = scans.find((s) => s.result && s.result.isTop)?.result || null;
    if (!frames.length) {
      setStatus("No form fields found. Open the application form itself (some sites show it after you click Apply).", true);
      return;
    }

    try {
      lastMatch = await apiFetch("/api/extension/match", {
        json: { url: tab.url, title: lastTop?.jobTitle, company: lastTop?.company, pageText: lastTop?.pageText },
      });
      renderMatch(lastMatch);
      if (!userPickedResume && lastMatch.resume) renderResumes(lastMatch.resume.id);
    } catch {
      // Matching is a nice-to-have; filling still works without it.
    }

    const overwrite = $("overwriteChk").checked;
    const answersByFrame = {};
    if ($("aiChk").checked) {
      const questions = [];
      for (const f of frames) {
        for (const field of f.fields) {
          if (field.hasValue && !overwrite) continue;
          if (field.key && !field.aiKey) continue;
          if (!["text", "textarea", "select", "radio", "combobox"].includes(field.kind)) continue;
          if (!field.label || field.label.length < 3) continue;
          questions.push({
            id: `${f.frameId}:${field.id}`,
            label: field.label,
            // A searchable dropdown's options are unknown until it opens: ask
            // for a short answer, which the page then matches to an option.
            kind: field.kind === "combobox" ? "text" : field.kind,
            options: field.options || undefined,
            maxLength: field.maxLength || undefined,
          });
        }
      }
      if (questions.length) {
        setStatus(`Drafting ${questions.length} answer${questions.length === 1 ? "" : "s"} with AI…`);
        try {
          const job = {
            title: lastMatch?.job?.title || lastTop?.jobTitle,
            company: lastMatch?.job?.company || lastTop?.company,
            url: tab.url,
            text: lastTop?.pageText,
          };
          const r = await apiFetch("/api/extension/answers", { json: { questions: questions.slice(0, 40), job } });
          for (const a of r.answers || []) {
            if (!a.answer) continue;
            const cut = a.id.indexOf(":");
            const frameId = a.id.slice(0, cut);
            (answersByFrame[frameId] = answersByFrame[frameId] || {})[a.id.slice(cut + 1)] = a.answer;
          }
        } catch (e) {
          setStatus(`AI answers unavailable (${e.message}) — filling everything else.`, true);
        }
      }
    }

    let resume = null;
    const resumeId = $("resumeSelect").value;
    if (resumeId && frames.some((f) => f.fields.some((x) => x.kind === "file" && x.key === "resume"))) {
      setStatus("Attaching your resume…");
      const res = await apiFetch(`/api/extension/resume/${resumeId}`, { raw: true });
      const bytes = new Uint8Array(await res.arrayBuffer());
      resume = {
        name: decodeURIComponent(res.headers.get("X-File-Name") || "resume.pdf"),
        type: res.headers.get("Content-Type") || "application/pdf",
        base64: toBase64(bytes),
      };
    }

    setStatus("Filling…");
    const all = [];
    for (const f of frames) {
      const out = await runInFrames(
        tab.id,
        (payload) => window.__jobFinderAutofill.fill(payload),
        [{ profile: profileData.profile, answers: answersByFrame[f.frameId] || {}, resume, overwrite }],
        [f.frameId],
      );
      for (const o of out) all.push(...((o.result && o.result.results) || []));
    }
    renderResults(all);
    const missing = all.filter((r) => r.status === "missing").length;
    setStatus(
      missing
        ? `Done — ${missing} field${missing === 1 ? "" : "s"} need you (red). Read the amber AI drafts, then submit yourself.`
        : "Done. Read the amber AI drafts, then submit the form yourself.",
    );
  } catch (e) {
    setStatus(e.message || String(e), true);
  } finally {
    $("fillBtn").disabled = false;
  }
});

$("clearBtn").addEventListener("click", async () => {
  if (!currentTab) return;
  try {
    await runInFrames(currentTab.id, () => (window.__jobFinderAutofill ? window.__jobFinderAutofill.clear() : null));
  } catch {
    // page navigated away or no access — nothing to clear
  }
  $("resultsCard").classList.add("hidden");
});

$("appliedBtn").addEventListener("click", async () => {
  const tab = currentTab;
  if (!tab?.url || !/^https?:/i.test(tab.url)) return;
  $("appliedBtn").disabled = true;
  $("appliedMsg").textContent = "Saving…";
  try {
    let answers = [];
    try {
      const out = await runInFrames(tab.id, () => (window.__jobFinderAutofill ? window.__jobFinderAutofill.collect() : null));
      for (const o of out) answers = answers.concat((o.result && o.result.answers) || []);
    } catch {
      // no access to the page (never filled) — mark as applied without answers
    }
    if (!profileData) await loadProfile().catch(() => {});
    const resumeId = Number($("resumeSelect").value) || null;
    const resumeName = resumeId ? (profileData?.resumes || []).find((r) => r.id === resumeId)?.name || null : null;
    const r = await apiFetch("/api/extension/applications", {
      json: {
        url: tab.url,
        title: lastMatch?.job?.title || lastTop?.jobTitle,
        company: lastMatch?.job?.company || lastTop?.company,
        resumeId,
        resumeName,
        answers,
        saveAnswers: $("saveAnswersChk").checked,
      },
    });
    $("appliedMsg").textContent =
      `Marked as applied${r.created ? " (added to your jobs)" : ""} — a follow-up date is set.` +
      (r.savedAnswers ? ` ${r.savedAnswers} answer${r.savedAnswers === 1 ? "" : "s"} saved to your answer bank.` : "");
  } catch (e) {
    $("appliedMsg").textContent = e.message || String(e);
  } finally {
    $("appliedBtn").disabled = false;
  }
});

chrome.tabs.onActivated.addListener(() => void refreshTab());
chrome.tabs.onUpdated.addListener((tabId, info) => {
  if (currentTab && tabId === currentTab.id && info.status === "complete") void refreshTab();
});

async function start() {
  await loadSettings();
  profileData = null;
  setStatus("");
  if (!settings.token) renderWho(null);
  await refreshTab();
  try {
    await loadProfile();
  } catch (e) {
    setStatus(e.message || String(e), true);
  }
}

// Signing in or out, or picking another user under "Scan for" in the popup,
// switches the profile this panel fills with.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && (changes.extensionToken || changes.scanForUserId || changes.serverUrl)) void start();
});

void start();
