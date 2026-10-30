// Popup: sign in to your Job Finder server, pick whose jobs a scan saves
// (admins: "Scan for"), adjust the scan settings (kept on the server for each
// user) and start or follow a LinkedIn scan.
const startBtn = document.getElementById("startBtn");
const statusMsg = document.getElementById("statusMsg");
const checkedCount = document.getElementById("checkedCount");
const approvedCount = document.getElementById("approvedCount");
const hiddenCount = document.getElementById("hiddenCount");
const skippedCount = document.getElementById("skippedCount");
const mainContent = document.getElementById("mainContent");
const notOnLinkedIn = document.getElementById("notOnLinkedIn");
const signInForm = document.getElementById("signInForm");
const serverUrlInput = document.getElementById("serverUrlInput");
const usernameInput = document.getElementById("usernameInput");
const passwordInput = document.getElementById("passwordInput");
const signInBtn = document.getElementById("signInBtn");
const signInMsg = document.getElementById("signInMsg");
const whoLine = document.getElementById("whoLine");
const placeLine = document.getElementById("placeLine");
const signOutBtn = document.getElementById("signOutBtn");
const scanForRow = document.getElementById("scanForRow");
const scanForSelect = document.getElementById("scanForSelect");
const logArea = document.getElementById("logArea");
const sendLogsChk = document.getElementById("sendLogsChk");
const hideApprovedChk = document.getElementById("hideApprovedChk");
const showResultsChk = document.getElementById("showResultsChk");
const betaModeChk = document.getElementById("betaModeChk");
const jobLimitInput = document.getElementById("jobLimitInput");
const easyApplyModeSelect = document.getElementById("easyApplyModeSelect");
const easyApplyMinRow = document.getElementById("easyApplyMinRow");
const easyApplyMinScoreInput = document.getElementById("easyApplyMinScoreInput");

// Shown next to the title, so people can tell which release they are running.
document.getElementById("versionLabel").textContent = `v${chrome.runtime.getManifest().version}`;

// "skip" (default: reject + hide without AI) or "analyze" (judge like any job).
function normalizeEasyApplyMode(raw) {
  return raw === "analyze" ? "analyze" : "skip";
}
// 0..100; anything else becomes 0 (= no extra bar for Easy Apply jobs).
function normalizeMinScore(raw) {
  const n = parseInt(raw, 10);
  if (isNaN(n) || n < 0) return 0;
  return Math.min(100, n);
}
function applyEasyApplyModeUi() {
  easyApplyMinRow.style.display = easyApplyModeSelect.value === "analyze" ? "flex" : "none";
}

const DEFAULT_JOB_LIMIT = 100;
// Normalize the user's "Job scan limit" input into the value the scanner uses:
//   -1            -> unlimited (scan every job)
//   any integer>=1-> that many jobs, then stop
//   empty/invalid -> the default (100)
// 0 and other negatives are treated as invalid and fall back to the default so
// the scanner can never be asked to scan "zero" or a nonsensical count.
function normalizeJobLimit(raw) {
  const n = parseInt(raw, 10);
  if (isNaN(n)) return DEFAULT_JOB_LIMIT;
  if (n === -1) return -1;
  if (n < 1) return DEFAULT_JOB_LIMIT;
  return n;
}

// The side panel must open inside the click (Chrome needs the user gesture),
// so remember this window's id up front.
let currentWindowId = null;
chrome.windows.getCurrent((w) => {
  currentWindowId = w ? w.id : null;
});
document.getElementById("autofillBtn").addEventListener("click", () => {
  if (!chrome.sidePanel || currentWindowId == null) {
    statusMsg.textContent = "The autofill panel needs Chrome 116 or newer.";
    return;
  }
  chrome.sidePanel.open({ windowId: currentWindowId }).then(() => window.close()).catch((e) => {
    statusMsg.textContent = `Could not open the panel: ${e.message}`;
  });
});

const MAX_VISIBLE_RESULTS = 100;
const downloadBtn = document.getElementById("downloadBtn");
const currentJobBox = document.getElementById("currentJobBox");
const currentJobTitle = document.getElementById("currentJobTitle");
const currentJobMeta = document.getElementById("currentJobMeta");
const resultsFeed = document.getElementById("resultsFeed");
const resultsCount = document.getElementById("resultsCount");
const clearResultsBtn = document.getElementById("clearResultsBtn");

let isRunning = false;
let renderedResultIds = new Set();

function appendLogLine(level, message, ts) {
  const t = ts ? new Date(ts).toLocaleTimeString() : new Date().toLocaleTimeString();
  logArea.textContent += `[${t}] ${message}\n`;
  logArea.scrollTop = logArea.scrollHeight;
}

function addLog(msg, level) {
  appendLogLine(level || "info", msg, new Date().toISOString());
  console.log("[JobScanner]", msg);
}

// The Start / Stop button and everything that must not change mid-scan.
function setRunning(running) {
  isRunning = running;
  startBtn.textContent = running ? "Stop Scan" : "Start Scan";
  startBtn.classList.toggle("running", running);
  scanForSelect.disabled = running;
  signOutBtn.disabled = running;
}

// ── Sign-in ─────────────────────────────────────────────────────────────────
// session: the server, this browser's token, the user an admin picked under
// "Scan for" (null = whoever signed in), and the server's last answer to
// /api/extension/me ({ signedIn, user, settings, users }). Kept in
// chrome.storage so the scan and the autofill panel use the same sign-in.
let session = null;

function normalizeServerUrl(raw) {
  const url = String(raw || "").trim().replace(/\/+$/, "");
  return /^https?:\/\/[^\s/]+/i.test(url) ? url : "";
}

async function serverFetch(path, { method = "GET", json, asSelf = false } = {}) {
  const headers = { Authorization: `Bearer ${session.token}` };
  if (session.scanFor && !asSelf) headers["X-JF-For"] = String(session.scanFor);
  if (json !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(`${session.serverUrl}${path}`, {
    method,
    headers,
    body: json !== undefined ? JSON.stringify(json) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `The server answered HTTP ${res.status}`);
    err.status = res.status;
    err.code = data.code || "";
    throw err;
  }
  return data;
}

function placeText(user) {
  return [user.currentLocation, user.targetMarket].filter(Boolean).join(" → ");
}

function showSignIn(message, isInfo) {
  session = null;
  mainContent.hidden = true;
  signInForm.hidden = false;
  signInMsg.textContent = message || "";
  signInMsg.classList.toggle("info", !!isInfo);
  (!serverUrlInput.value ? serverUrlInput : !usernameInput.value ? usernameInput : passwordInput).focus();
}

function renderSession() {
  signInForm.hidden = true;
  mainContent.hidden = false;
  const me = session.me;
  if (!me) {
    whoLine.textContent = "Signed in";
    placeLine.textContent = "";
    scanForRow.hidden = true;
    return;
  }
  whoLine.textContent = `Signed in as ${me.signedIn.name}`;
  const place = placeText(me.user) || "Location and target market not set yet (Admin → Settings)";
  placeLine.textContent = me.user.id === me.signedIn.id ? place : `Scanning for ${me.user.name} · ${place}`;
  // Admins scan for any user; everyone else only for themselves.
  scanForRow.hidden = me.users.length < 2;
  scanForSelect.innerHTML = "";
  for (const u of me.users) {
    const label = `${u.name}${u.id === me.signedIn.id ? " (you)" : ""} · ${placeText(u) || "not set up"}`;
    scanForSelect.add(new Option(label, String(u.id)));
  }
  scanForSelect.value = String(me.user.id);
  scanForSelect.disabled = isRunning;
}

// The scan reads its settings from chrome.storage; the server calls them by these names.
const LOCAL_SETTING_KEYS = {
  easyApplyMode: "easyApplyMode",
  easyApplyMinScore: "easyApplyMinScore",
  jobLimit: "jobLimit",
  hideApproved: "hideApproved",
  betaMode: "betaMode",
  sendLogs: "sendLogsToServer",
};

function toLocalSettings(patch) {
  const out = {};
  for (const [k, v] of Object.entries(patch)) if (LOCAL_SETTING_KEYS[k]) out[LOCAL_SETTING_KEYS[k]] = v;
  return out;
}

// Settings from the server: show them, and keep the copy the scan reads.
function applySettings(s) {
  if (!s) return;
  easyApplyModeSelect.value = normalizeEasyApplyMode(s.easyApplyMode);
  easyApplyMinScoreInput.value = String(normalizeMinScore(s.easyApplyMinScore));
  jobLimitInput.value = String(normalizeJobLimit(s.jobLimit));
  hideApprovedChk.checked = !!s.hideApproved;
  betaModeChk.checked = !!s.betaMode;
  sendLogsChk.checked = !!s.sendLogs;
  applyEasyApplyModeUi();
  chrome.storage.local.set(toLocalSettings(s));
}

// A setting changed here: the scan uses it at once, and the server keeps it for
// every browser this user (or the user scanned for) signs in from.
function saveSetting(patch) {
  chrome.storage.local.set(toLocalSettings(patch));
  if (!session) return;
  serverFetch("/api/extension/settings", { method: "PUT", json: patch })
    .then((r) => {
      if (session && session.me) {
        session.me.settings = r.settings;
        chrome.storage.local.set({ extensionMe: session.me });
      }
    })
    .catch((err) => addLog(`Could not save the setting on the server: ${err.message}`, "warn"));
}

async function signOutLocally(message, isInfo) {
  await chrome.storage.local.remove(["extensionToken", "extensionMe", "scanForUserId"]);
  showSignIn(message, isInfo);
}

// Ask the server who is signed in and with which settings. Run each time the
// popup opens, so a sign-in ended elsewhere shows at once.
async function refreshMe() {
  if (!session) return;
  try {
    const me = await serverFetch("/api/extension/me");
    session.me = me;
    chrome.storage.local.set({ extensionMe: me });
    applySettings(me.settings);
    renderSession();
  } catch (err) {
    if (err.code && err.code.startsWith("scan_for_") && session.scanFor) {
      // The user picked under "Scan for" is gone or disabled: back to yourself.
      addLog(err.message, "warn");
      session.scanFor = null;
      await chrome.storage.local.set({ scanForUserId: null });
      return refreshMe();
    }
    if (err.status === 401 || err.code === "user_disabled") {
      await signOutLocally(err.message);
      return;
    }
    statusMsg.textContent = `Cannot reach the server: ${err.message}`;
  }
}

signInForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const serverUrl = normalizeServerUrl(serverUrlInput.value);
  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  if (!serverUrl) return showSignIn("Enter the server URL, for example https://your-app.vercel.app.");
  if (!username || !password) return showSignIn("Enter your user ID and password.");
  signInBtn.disabled = true;
  signInMsg.classList.add("info");
  signInMsg.textContent = "Signing in…";
  try {
    const res = await fetch(`${serverUrl}/api/extension/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.token) {
      throw new Error(data.error || `The server answered HTTP ${res.status}. Is this your Job Finder URL?`);
    }
    const { token, ...me } = data;
    passwordInput.value = "";
    session = { serverUrl, token, scanFor: null, me };
    // The shared API key of extension 2.0 is not used any more.
    await chrome.storage.local.remove("extensionApiKey");
    await chrome.storage.local.set({ serverUrl, extensionToken: token, extensionMe: me, scanForUserId: null });
    applySettings(me.settings);
    renderSession();
    statusMsg.textContent = "Signed in. Open a LinkedIn job search and click Start Scan.";
    addLog(`Signed in as ${me.signedIn.username} on ${serverUrl}`);
  } catch (err) {
    showSignIn(err instanceof TypeError ? `Cannot reach ${serverUrl}. Check the URL and your connection.` : err.message);
  } finally {
    signInBtn.disabled = false;
  }
});

signOutBtn.addEventListener("click", async () => {
  if (isRunning) {
    statusMsg.textContent = "Stop the scan before signing out.";
    return;
  }
  try {
    await serverFetch("/api/extension/auth", { method: "DELETE", asSelf: true });
  } catch {
    // Already signed out on the server, or offline: forget the sign-in here anyway.
  }
  // The last scan's jobs and log belong to whoever was signed in.
  chrome.runtime.sendMessage({ type: "CLEAR_BG_STATE" }, () => void chrome.runtime.lastError);
  resetStats();
  resultsFeed.innerHTML = "";
  renderedResultIds = new Set();
  resultsCount.textContent = "0";
  logArea.textContent = "";
  downloadBtn.style.display = "none";
  showCurrentJob(null);
  statusMsg.textContent = "Ready.";
  await signOutLocally("Signed out.", true);
});

scanForSelect.addEventListener("change", async () => {
  if (!session || !session.me) return;
  const id = Number(scanForSelect.value);
  session.scanFor = id === session.me.signedIn.id ? null : id;
  await chrome.storage.local.set({ scanForUserId: session.scanFor });
  addLog(`Scan for: ${scanForSelect.selectedOptions[0] ? scanForSelect.selectedOptions[0].textContent : id}`);
  await refreshMe();
});

chrome.storage.local.get(
  [
    "serverUrl",
    "extensionToken",
    "extensionMe",
    "scanForUserId",
    "extensionApiKey",
    "sendLogsToServer",
    "hideApproved",
    "showResults",
    "betaMode",
    "jobLimit",
    "easyApplyMode",
    "easyApplyMinScore",
  ],
  (data) => {
    // The local copies first, so the popup draws at once; the server's answer replaces them.
    easyApplyModeSelect.value = normalizeEasyApplyMode(data.easyApplyMode);
    easyApplyMinScoreInput.value = String(normalizeMinScore(data.easyApplyMinScore));
    applyEasyApplyModeUi();
    if (data.serverUrl) serverUrlInput.value = data.serverUrl;
    if (data.sendLogsToServer) sendLogsChk.checked = true;
    if (data.hideApproved) hideApprovedChk.checked = true;
    if (data.betaMode) betaModeChk.checked = true;
    // Restore the saved job limit (falls back to the default when never set).
    jobLimitInput.value = String(
      data.jobLimit === undefined || data.jobLimit === null
        ? DEFAULT_JOB_LIMIT
        : normalizeJobLimit(data.jobLimit)
    );
    // default ON unless explicitly disabled
    showResultsChk.checked = data.showResults !== false;
    applyShowResults();

    if (!data.extensionToken || !data.serverUrl) {
      showSignIn(
        data.extensionApiKey
          ? "Job Finder 2.1 signs in with your user ID and password instead of the API key."
          : "",
        true,
      );
      return;
    }
    session = {
      serverUrl: data.serverUrl,
      token: data.extensionToken,
      scanFor: data.scanForUserId || null,
      me: data.extensionMe || null,
    };
    renderSession();
    void refreshMe();
  },
);

sendLogsChk.addEventListener("change", () => {
  saveSetting({ sendLogs: sendLogsChk.checked });
});

hideApprovedChk.addEventListener("change", () => {
  saveSetting({ hideApproved: hideApprovedChk.checked });
  addLog(`Hide approved jobs: ${hideApprovedChk.checked ? "ON" : "OFF"}`);
});

easyApplyModeSelect.addEventListener("change", () => {
  const mode = normalizeEasyApplyMode(easyApplyModeSelect.value);
  saveSetting({ easyApplyMode: mode });
  applyEasyApplyModeUi();
  addLog(`Easy Apply jobs: ${mode === "analyze" ? "analyze with AI" : "skip and hide"}`);
});

easyApplyMinScoreInput.addEventListener("change", () => {
  const min = normalizeMinScore(easyApplyMinScoreInput.value);
  easyApplyMinScoreInput.value = String(min);
  saveSetting({ easyApplyMinScore: min });
  addLog(`Easy Apply minimum score: ${min || "same as other jobs"}`);
});

betaModeChk.addEventListener("change", () => {
  saveSetting({ betaMode: betaModeChk.checked });
  addLog(`Analyze AI search page (beta): ${betaModeChk.checked ? "ON" : "OFF"}`);
});

// Persist the job limit as the user edits it, normalizing the stored value and
// reflecting it back into the field so the saved value is always the one used.
function persistJobLimit() {
  const limit = normalizeJobLimit(jobLimitInput.value);
  jobLimitInput.value = String(limit);
  saveSetting({ jobLimit: limit });
  addLog(`Job scan limit: ${limit === -1 ? "all jobs (no limit)" : limit}`);
}
jobLimitInput.addEventListener("change", persistJobLimit);

showResultsChk.addEventListener("change", () => {
  chrome.storage.local.set({ showResults: showResultsChk.checked });
  applyShowResults();
  if (showResultsChk.checked) {
    rehydrateFromBgState();
  }
});

function applyShowResults() {
  const section = document.querySelector(".results-section");
  if (!section) return;
  if (showResultsChk.checked) {
    section.style.display = "";
  } else {
    section.style.display = "none";
    // free DOM memory while disabled
    resultsFeed.innerHTML = "";
    renderedResultIds = new Set();
    resultsCount.textContent = "0";
  }
}

clearResultsBtn.addEventListener("click", () => {
  resultsFeed.innerHTML = "";
  renderedResultIds = new Set();
  resultsCount.textContent = "0";
});

downloadBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "GET_BG_STATE" }, (state) => {
    const logs = (state && state.logs) || [];
    if (logs.length === 0) {
      statusMsg.textContent = "No logs to download.";
      return;
    }
    const content = logs.map((l) => `[${l.ts}] [${l.level}] ${l.message}`).join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `extension-logs-${new Date().toISOString().replace(/[:.]/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    addLog("Logs downloaded.");
  });
});

function sendLogsToServer() {
  if (!sendLogsChk.checked || !session) return;

  chrome.runtime.sendMessage({ type: "GET_BG_STATE" }, (state) => {
    if (!state || !state.logs || state.logs.length === 0) return;
    const payload = {
      logs: state.logs.map((l) => ({ timestamp: l.ts, level: l.level, message: l.message })),
      sessionId: state.sessionId,
    };
    serverFetch("/api/extension/logs", { method: "POST", json: payload })
      .then((data) => {
        console.log("[JobScanner] Logs sent:", data);
      })
      .catch((err) => {
        console.log("[JobScanner] Failed to send logs:", err.message);
      });
  });
}

function showCurrentJob(job) {
  if (!job) {
    currentJobBox.classList.remove("visible");
    return;
  }
  currentJobTitle.textContent = `Analyzing ${job.index + 1}/${job.total}: ${job.title}`;
  const meta = [job.company, job.location].filter(Boolean).join(" — ");
  currentJobMeta.textContent = meta;
  currentJobBox.classList.add("visible");
}

function statusLabel(status) {
  switch (status) {
    case "approved": return "Approved";
    case "rejected": return "Rejected";
    case "easy_apply": return "Easy Apply";
    case "skipped": return "Skipped";
    case "already_processed": return "Already";
    case "analysis_issue": return "Issue";
    case "error": return "Error";
    default: return status || "Unknown";
  }
}

function renderResultCard(r) {
  const card = document.createElement("div");
  card.className = `result-card ${r.status}`;
  card.dataset.id = r.id;

  const row1 = document.createElement("div");
  row1.className = "result-row1";

  const title = document.createElement("div");
  title.className = "result-title";
  title.textContent = `${r.index + 1}. ${r.title}`;

  const badge = document.createElement("span");
  badge.className = `result-badge ${r.status}`;
  const label = statusLabel(r.status);
  const scoreText = r.score != null && r.score > 0 ? ` ${r.score}` : "";
  badge.textContent = label + scoreText;

  row1.appendChild(title);
  row1.appendChild(badge);
  card.appendChild(row1);

  const meta = document.createElement("div");
  meta.className = "result-meta";
  meta.textContent = [r.company, r.location].filter(Boolean).join(" — ");
  if (r.applyMethod === "EASY_APPLY" && r.status !== "easy_apply") {
    const chip = document.createElement("span");
    chip.className = "apply-chip";
    chip.textContent = "Easy Apply";
    meta.appendChild(chip);
  }
  card.appendChild(meta);

  if (r.reason) {
    const reason = document.createElement("div");
    reason.className = "result-reason";
    reason.textContent = r.reason;
    card.appendChild(reason);
  }

  if (r.model) {
    const model = document.createElement("div");
    model.className = "result-model";
    model.textContent = `Judged by ${r.model}`;
    card.appendChild(model);
  }

  return card;
}

function upsertResult(r) {
  if (!r || !r.id) return;
  if (!showResultsChk.checked) return; // user disabled rendering for performance
  const existing = resultsFeed.querySelector(`.result-card[data-id="${CSS.escape(r.id)}"]`);
  const node = renderResultCard(r);
  if (existing) {
    existing.replaceWith(node);
  } else {
    resultsFeed.insertBefore(node, resultsFeed.firstChild);
    renderedResultIds.add(r.id);
  }
  // Enforce a hard ceiling on rendered cards to keep the popup snappy on
  // long scans (≈1000 jobs would otherwise drown the DOM).
  while (resultsFeed.children.length > MAX_VISIBLE_RESULTS) {
    const last = resultsFeed.lastElementChild;
    if (last) {
      const id = last.getAttribute("data-id");
      if (id) renderedResultIds.delete(id);
      last.remove();
    } else {
      break;
    }
  }
  resultsCount.textContent = String(renderedResultIds.size);
}

function rehydrateFromBgState() {
  chrome.runtime.sendMessage({ type: "GET_BG_STATE" }, (state) => {
    if (!state) return;
    setRunning(!!state.scanning);

    updateStats(state.stats || {});
    statusMsg.textContent = state.statusMsg || (state.scanning ? "Scanning..." : "Ready.");

    showCurrentJob(state.currentJob);

    // Replay logs
    logArea.textContent = "";
    (state.logs || []).forEach((l) => appendLogLine(l.level, l.message, l.ts));

    // Replay results (newest first in the feed) only if rendering is enabled
    resultsFeed.innerHTML = "";
    renderedResultIds = new Set();
    if (showResultsChk.checked) {
      const sorted = [...(state.results || [])].sort((a, b) =>
        (a.timestamp || "").localeCompare(b.timestamp || "")
      );
      // Only restore the most recent slice to avoid spiking the DOM at popup open.
      const tail = sorted.slice(-MAX_VISIBLE_RESULTS);
      tail.forEach(upsertResult);
    }

    if (!state.scanning && (state.results || []).length > 0) {
      downloadBtn.style.display = "block";
    }
  });
}

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tab = tabs[0];
  const onLinkedIn = !!(tab && tab.url && tab.url.includes("linkedin.com/jobs"));

  // The main content (shown once signed in) keeps the results feed and the
  // current-job spinner visible even when this is not the LinkedIn tab.
  notOnLinkedIn.style.display = "none";

  if (!onLinkedIn) {
    addLog("Not on a LinkedIn jobs page (showing last scan state).");
    startBtn.disabled = false; // allow Stop while scan runs in the LinkedIn tab
    chrome.runtime.sendMessage({ type: "GET_BG_STATE" }, (state) => {
      if (state && state.scanning) {
        statusMsg.textContent = state.statusMsg || "Scan running in LinkedIn tab.";
      } else {
        statusMsg.textContent = "Open a LinkedIn jobs tab to start a new scan.";
      }
    });
  } else {
    addLog(`On LinkedIn: ${tab.url}`);
  }

  rehydrateFromBgState();
});

startBtn.addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab) return;

    if (isRunning) {
      chrome.runtime.sendMessage({ type: "GET_BG_STATE" }, (state) => {
        const targetTabId = (state && state.scanTabId) || tab.id;
        chrome.tabs.sendMessage(targetTabId, { type: "STOP_SCAN" }, () => {
          if (chrome.runtime.lastError) {
            markScanCancelled("Scan stopped by user.");
          }
        });
        setRunning(false);
        statusMsg.textContent = "Scan stopped by user.";
        addLog("User stopped scan.");
        downloadBtn.style.display = "block";
        sendLogsToServer();
      });
      return;
    }

    if (!session) {
      showSignIn("Sign in first.");
      return;
    }
    const auth = { serverUrl: session.serverUrl, token: session.token, scanFor: session.scanFor };
    const sessionId = `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    chrome.runtime.sendMessage({
      type: "RESET_BG_STATE",
      serverUrl: auth.serverUrl,
      sessionId,
      tabId: tab.id,
    }, () => {
      setRunning(true);
      downloadBtn.style.display = "none";
      statusMsg.textContent = "Starting scan...";
      resetStats();
      resultsFeed.innerHTML = "";
      renderedResultIds = new Set();
      resultsCount.textContent = "0";
      logArea.textContent = "";
      const betaMode = betaModeChk.checked;
      const jobLimit = normalizeJobLimit(jobLimitInput.value);
      const easyApplyMode = normalizeEasyApplyMode(easyApplyModeSelect.value);
      const easyApplyMinScore = normalizeMinScore(easyApplyMinScoreInput.value);
      // Saved (locally and on the server) so a scan that pages via a full
      // reload restores them when the content script resumes after navigation.
      jobLimitInput.value = String(jobLimit);
      saveSetting({ jobLimit, easyApplyMode, easyApplyMinScore });
      const limitLabel = jobLimit === -1 ? "all jobs (no limit)" : `${jobLimit} jobs`;
      const easyLabel = easyApplyMode === "analyze" ? `analyze${easyApplyMinScore ? ` (min ${easyApplyMinScore})` : ""}` : "skip";
      const forLabel = session.me && session.me.user.id !== session.me.signedIn.id ? ` [for: ${session.me.user.name}]` : "";
      addLog(`Starting scan. Server: ${auth.serverUrl}${forLabel}${betaMode ? " [AI search / beta mode]" : ""} [limit: ${limitLabel}] [Easy Apply: ${easyLabel}]`);
      sendStartScan(tab.id, auth, false, betaMode, jobLimit, easyApplyMode, easyApplyMinScore);
    });
  });
});

function sendStartScan(tabId, auth, isRetry, betaMode, jobLimit, easyApplyMode, easyApplyMinScore) {
  chrome.tabs.sendMessage(tabId, {
    type: "START_SCAN",
    serverUrl: auth.serverUrl,
    token: auth.token,
    scanFor: auth.scanFor,
    betaMode: !!betaMode,
    jobLimit: normalizeJobLimit(jobLimit),
    easyApplyMode: normalizeEasyApplyMode(easyApplyMode),
    easyApplyMinScore: normalizeMinScore(easyApplyMinScore),
  }, (response) => {
    if (chrome.runtime.lastError) {
      if (!isRetry) {
        addLog("Content script not found, injecting...", "warn");
        chrome.scripting.executeScript({
          target: { tabId },
          files: ["content.js"],
        }, () => {
          if (chrome.runtime.lastError) {
            addLog(`Injection failed: ${chrome.runtime.lastError.message}`, "error");
            statusMsg.textContent = "Error: cannot inject script. Refresh the LinkedIn page and try again.";
            markScanCancelled(statusMsg.textContent);
            setRunning(false);
            return;
          }
          addLog("Content script injected. Retrying START_SCAN...");
          setTimeout(() => sendStartScan(tabId, auth, true, betaMode, jobLimit, easyApplyMode, easyApplyMinScore), 500);
        });
      } else {
        addLog(`ERROR sending START_SCAN: ${chrome.runtime.lastError.message}`, "error");
        statusMsg.textContent = "Error: content script not responding. Refresh the LinkedIn page and try again.";
        markScanCancelled(statusMsg.textContent);
        setRunning(false);
      }
      return;
    }
    if (response && response.ok === false) {
      const reason = response.reason || "unable to start scan";
      addLog(`ERROR starting scan: ${reason}`, "error");
      statusMsg.textContent = `Error: ${reason}`;
      markScanCancelled(statusMsg.textContent);
      setRunning(false);
    }
  });
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "SCAN_PROGRESS") {
    if (msg.stats) updateStats(msg.stats);
    if (msg.statusMsg) statusMsg.textContent = msg.statusMsg;
    addLog(msg.statusMsg || "progress update");
    if (msg.currentJob !== undefined) showCurrentJob(msg.currentJob);
  }
  if (msg.type === "SCAN_LOG") {
    appendLogLine(msg.level || "debug", msg.message || "", new Date().toISOString());
  }
  if (msg.type === "SCAN_RESULT") {
    if (msg.result) upsertResult(msg.result);
    showCurrentJob(null);
  }
  if (msg.type === "SCAN_DONE") {
    setRunning(false);
    if (msg.stats) updateStats(msg.stats);
    statusMsg.textContent = msg.statusMsg || "Scan complete.";
    addLog(`DONE: ${msg.statusMsg}`);
    downloadBtn.style.display = "block";
    showCurrentJob(null);
    sendLogsToServer();
  }
});

function updateStats(stats) {
  if (!stats) return;
  checkedCount.textContent = stats.checked || 0;
  approvedCount.textContent = stats.approved || 0;
  hiddenCount.textContent = stats.hidden || 0;
  skippedCount.textContent = stats.skipped || 0;
}

function resetStats() {
  checkedCount.textContent = "0";
  approvedCount.textContent = "0";
  hiddenCount.textContent = "0";
  skippedCount.textContent = "0";
}

function markScanCancelled(statusText) {
  chrome.runtime.sendMessage({ type: "SCAN_CANCELLED", statusMsg: statusText }, () => {
    void chrome.runtime.lastError;
  });
}
