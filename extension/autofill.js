// Job Finder autofill engine. Injected on demand (by the side panel) into the
// application page and its frames; exposes window.__jobFinderAutofill with
// scan(), fill(), collect() and clear(). It fills from the candidate profile,
// attaches the resume, writes drafted answers, colours every field it touched
// (green = profile, amber = AI draft, red = needs you) and never submits.
(() => {
  if (window.__jobFinderAutofill) return;

  const ATTR = "data-jf-id";
  // check = filled from the profile but worth a look (e.g. salary units).
  const COLORS = { profile: "#16a34a", resume: "#16a34a", ai: "#d97706", check: "#d97706", missing: "#dc2626" };
  let counter = 0;
  let lastResults = [];

  // ── helpers ────────────────────────────────────────────────────────────────
  // Required markers forms put after a label: *, ✱ (Lever), ∗, ＊.
  const clean = (s) =>
    String(s || "")
      .replace(/\s+/g, " ")
      // "Resume/CV ✱ATTACH RESUME/CV…": keep the label, drop what follows the marker.
      .replace(/\s*[✱∗＊]\s*\S.*$/, "")
      .replace(/\s*[*✱∗＊]+\s*$/, "")
      .replace(/\s*\((required|optional)\)\s*$/i, "")
      .trim()
      .slice(0, 300);
  const textOf = (el) => (el && el.textContent ? el.textContent.replace(/\s+/g, " ").trim() : "");

  // A label's own words, without the controls / options nested inside it.
  function labelText(node) {
    if (!node) return "";
    const copy = node.cloneNode(true);
    for (const c of copy.querySelectorAll("input, select, textarea, option, button, [role='listbox']")) c.remove();
    return textOf(copy);
  }

  // Button-ish words that are not a field's real label ("Attach", "Upload"…).
  const GENERIC_LABEL = /^(attach|upload|browse|choose( a)? file|select( a)? file|add( a)? file|drop( files)?( here)?|click to upload|enter manually|select\.{0,3})$/i;

  function isVisible(el) {
    if (el.type === "hidden" || el.hidden || el.closest("[hidden], [aria-hidden='true']")) return false;
    const win = el.ownerDocument.defaultView;
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const s = win.getComputedStyle(n);
      if (s.display === "none" || s.visibility === "hidden") return false;
    }
    return true;
  }

  function byIds(doc, ids) {
    return ids
      .split(/\s+/)
      .map((id) => labelText(doc.getElementById(id)))
      .join(" ")
      .trim();
  }

  // The first informative label, in order of reliability.
  function labelFor(el) {
    const doc = el.ownerDocument;
    const candidates = [];
    const push = (t) => {
      const c = clean(t);
      if (c && !GENERIC_LABEL.test(c)) candidates.push(c);
    };
    const by = el.getAttribute("aria-labelledby");
    if (by) push(byIds(doc, by));
    if (el.id) push(labelText(doc.querySelector(`label[for="${CSS.escape(el.id)}"]`)));
    push(labelText(el.closest("label")));
    const group = el.closest("[role='group'][aria-labelledby], [role='radiogroup'][aria-labelledby]");
    if (group) push(byIds(doc, group.getAttribute("aria-labelledby")));
    push(el.getAttribute("aria-label"));
    if (el.type === "radio" || el.type === "checkbox") {
      const fs = el.closest("fieldset");
      push(labelText(fs && fs.querySelector("legend")));
    }
    if (candidates.length) return candidates[0];
    // The closest label-like element BEFORE the field in its container (not a
    // neighbouring field's label further down the row).
    let node = el;
    for (let i = 0; i < 4 && node; i++) {
      node = node.parentElement;
      if (!node) break;
      const cands = [...node.querySelectorAll("label, legend, [class*='label' i], [class*='question' i], h3, h4")].filter(
        (c) => !c.contains(el) && labelText(c) && !GENERIC_LABEL.test(clean(labelText(c))) && c.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING,
      );
      if (cands.length) return clean(labelText(cands[cands.length - 1]));
    }
    return clean(el.getAttribute("placeholder") || el.getAttribute("name") || "");
  }

  // The question of a radio group: legend, radiogroup label, or the nearest
  // text above the options that is not itself an option label.
  function groupLabel(els) {
    const first = els[0];
    const doc = first.ownerDocument;
    const fs = first.closest("fieldset");
    const legend = fs && fs.querySelector("legend");
    if (legend && labelText(legend)) return clean(labelText(legend));
    const rg = first.closest("[role='radiogroup'], [role='group']");
    if (rg) {
      const by = rg.getAttribute("aria-labelledby");
      const t = by ? byIds(doc, by) : "";
      if (t) return clean(t);
      if (rg.getAttribute("aria-label")) return clean(rg.getAttribute("aria-label"));
    }
    const optionTexts = new Set(els.map((e) => optionLabel(e).trim()));
    let node = first.parentElement;
    while (node && !els.every((e) => node.contains(e))) node = node.parentElement;
    for (let i = 0; i < 3 && node; i++, node = node.parentElement) {
      const cands = [...node.querySelectorAll("label, legend, [class*='label' i], [class*='question' i], h3, h4, p")].filter(
        (c) =>
          labelText(c) &&
          !optionTexts.has(labelText(c)) &&
          !els.some((e) => c.contains(e)) &&
          c.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING,
      );
      if (cands.length) return clean(labelText(cands[cands.length - 1]));
    }
    return clean(first.getAttribute("name") || "");
  }

  function optionLabel(radio) {
    if (radio.id) {
      const l = radio.ownerDocument.querySelector(`label[for="${CSS.escape(radio.id)}"]`);
      if (l && labelText(l)) return labelText(l);
    }
    const wrap = radio.closest("label");
    if (wrap && labelText(wrap)) return labelText(wrap);
    const next = radio.nextElementSibling;
    if (next && textOf(next)) return textOf(next);
    return radio.value || "";
  }

  function detectAts() {
    const h = location.hostname;
    // Hostnames first; the DOM check only catches Greenhouse forms embedded on a company site.
    if (/greenhouse\.io$/.test(h)) return "greenhouse";
    if (/lever\.co$/.test(h)) return "lever";
    if (/ashbyhq\.com$/.test(h)) return "ashby";
    if (/workable\.com$/.test(h)) return "workable";
    if (/smartrecruiters\.com$/.test(h)) return "smartrecruiters";
    if (/personio\.(de|com)$/.test(h)) return "personio";
    if (/recruitee\.com$/.test(h)) return "recruitee";
    if (/teamtailor\.com$/.test(h)) return "teamtailor";
    if (/myworkdayjobs\.com$/.test(h)) return "workday";
    if (document.querySelector("#grnhse_app, #application_form, form[action*='greenhouse']")) return "greenhouse";
    return "generic";
  }

  // ATS-specific field names/ids → profile keys. Checked before label matching.
  const ADAPTERS = {
    greenhouse: {
      first_name: "firstName",
      last_name: "lastName",
      preferred_name: "firstName",
      email: "email",
      phone: "phone",
      resume: "resume",
      cover_letter: "coverLetter",
      "candidate-location": "location",
      "job_application[location]": "location",
    },
    lever: {
      name: "fullName",
      email: "email",
      phone: "phone",
      org: "currentCompany",
      location: "location",
      "urls[LinkedIn]": "linkedin",
      "urls[GitHub]": "github",
      "urls[Portfolio]": "portfolio",
      "urls[Other]": "portfolio",
      resume: "resume",
      comments: "coverLetter",
    },
    ashby: {
      _systemfield_name: "fullName",
      _systemfield_email: "email",
      _systemfield_phone: "phone",
      _systemfield_resume: "resume",
      _systemfield_location: "location",
      _systemfield_linkedin: "linkedin",
    },
    workable: {
      firstname: "firstName",
      lastname: "lastName",
      email: "email",
      phone: "phone",
      address: "location",
      resume: "resume",
      cover_letter: "coverLetter",
    },
    smartrecruiters: {
      firstName: "firstName",
      lastName: "lastName",
      email: "email",
      confirmEmail: "email",
      phoneNumber: "phone",
      linkedInProfileUrl: "linkedin",
      location: "location",
    },
    personio: { first_name: "firstName", last_name: "lastName", email: "email", phone: "phone" },
    recruitee: {
      "candidate[name]": "fullName",
      "candidate[email]": "email",
      "candidate[phone]": "phone",
      "candidate[cv]": "resume",
      "candidate[cover_letter]": "coverLetter",
    },
    teamtailor: {
      "candidate[first_name]": "firstName",
      "candidate[last_name]": "lastName",
      "candidate[email]": "email",
      "candidate[phone]": "phone",
      "candidate[resume]": "resume",
      "candidate[linkedin_url]": "linkedin",
    },
  };

  // Generic label rules, in priority order (first match wins).
  const RULES = [
    ["coverLetter", /cover letter|motivation(al)? letter/i],
    ["resume", /\bresume\b|\bcv\b|curriculum vitae/i],
    ["firstName", /\b(first|given|fore)[\s_-]*name\b|^first$|\bfname\b/i],
    ["lastName", /\b(last|family|sur)[\s_-]*name\b|surname|\blname\b/i],
    ["email", /e-?mail/i],
    ["phone", /phone|mobile|telephone|\btel\b/i],
    ["linkedin", /linked\s*in/i],
    ["github", /github/i],
    ["portfolio", /portfolio|website|personal (site|page|url)|\bblog\b|homepage|other (url|link)/i],
    ["fullName", /^(your\s+|full\s+|legal\s+|candidate\s+)?name$/i],
    ["timezone", /time\s*zone/i],
    ["city", /^city\b|\bcity\b(?!.*country)/i],
    ["country", /^country\b|country of residence|\bcountry\b/i],
    ["location", /^(current\s+)?location\b|where are you (based|located)|current (city|address)|^address\b/i],
    ["currentCompany", /current (company|employer)|^(company|employer)$/i],
    ["currentTitle", /current (job )?(title|role|position)/i],
    ["yearsExperience", /years of (professional |relevant )?experience|how many years/i],
    ["salary", /salary|compensation|pay (expectation|range)|expected (pay|rate|salary)|rate expectation|desired (pay|rate)/i],
    ["noticePeriod", /notice period/i],
    ["availableFrom", /start date|when can you start|earliest (possible )?start|availability|available to start/i],
    ["sponsorship", /sponsor|visa/i],
    ["workAuthorization", /authori[sz]ed to work|work authori[sz]ation|eligible to work|right to work|work permit|legally (able|permitted|allowed)/i],
    ["relocate", /relocat/i],
    ["remote", /remote|work (mode|arrangement|location preference)|hybrid|on-?site/i],
    ["gender", /gender|\bsex\b/i],
    ["ethnicity", /\brace\b|ethnic/i],
    ["veteran", /veteran/i],
    ["disability", /disabilit/i],
    ["hearAbout", /how did you (hear|find|learn)|where did you (hear|find|see)|referral source|^source$/i],
    ["pronouns", /pronoun/i],
  ];

  // Keys the AI answers (it sees the profile and the exact question). When no
  // AI answer comes back, the profile value is used but marked "check".
  const AI_KEYS = new Set(["coverLetter", "workAuthorization", "salary"]);

  function mapKey(field, ats) {
    const adapter = ADAPTERS[ats] || {};
    const adapted = [field.name, field.elId].map((attr) => attr && adapter[attr]).find(Boolean);
    // Upload fields: the resume, or a cover-letter / other document we leave alone.
    if (field.kind === "file") {
      if (adapted === "resume") return "resume";
      const hint = `${field.label} ${field.name} ${field.elId}`;
      if (adapted === "coverLetter" || /cover|motivation|letter|portfolio|transcript|other/i.test(hint)) return "coverLetterFile";
      return "resume";
    }
    if (adapted) return adapted;
    const probe = `${field.label} ${field.autocomplete || ""}`.trim();
    for (const [key, re] of RULES) {
      // "Please confirm your resume is in English" is a question, not the upload.
      if (key === "resume") continue;
      if (re.test(field.label) || (field.autocomplete && re.test(field.autocomplete))) {
        // "Company name", "School name" are not the candidate's name.
        if (key === "fullName" && /company|school|university|employer|reference/i.test(probe)) continue;
        return key;
      }
    }
    if (field.autocomplete) {
      const ac = { "given-name": "firstName", "family-name": "lastName", name: "fullName", email: "email", tel: "phone", "country-name": "country", "address-level2": "city", url: "portfolio" };
      if (ac[field.autocomplete]) return ac[field.autocomplete];
    }
    return null;
  }

  // ── field discovery ────────────────────────────────────────────────────────
  // Read live (not cached from the scan): you may type while the AI drafts.
  function hasValueNow(f) {
    const el = f.els[0];
    switch (f.kind) {
      case "radio":
        return f.els.some((e) => e.checked);
      case "checkbox":
        return el.checked;
      case "file":
        return !!(el.files && el.files.length);
      case "select":
        return !!el.value && el.selectedIndex > 0;
      case "combobox":
        return !!comboSelection(el);
      default:
        return !!String(el.value || "").trim();
    }
  }

  function discover(doc) {
    const fields = [];
    const groups = new Map();
    for (const el of doc.querySelectorAll("input, textarea, select")) {
      const tag = el.tagName.toLowerCase();
      const type = tag === "input" ? (el.getAttribute("type") || "text").toLowerCase() : tag;
      if (["hidden", "submit", "button", "image", "reset", "search", "password"].includes(type)) continue;
      if (el.disabled || el.readOnly) continue;
      if (type !== "file" && !isVisible(el)) continue;
      if (type === "radio") {
        const key = el.name || `__radio_${counter++}`;
        if (!groups.has(key)) {
          const g = { kind: "radio", els: [], name: el.name };
          groups.set(key, g);
          fields.push(g);
        }
        groups.get(key).els.push(el);
        continue;
      }
      // Searchable dropdowns (react-select on Greenhouse, Ashby, Workable…) are
      // text inputs with role="combobox": typing only filters, an option must be picked.
      const combobox = el.getAttribute("role") === "combobox" || el.getAttribute("aria-autocomplete") === "list";
      const kind = combobox
        ? "combobox"
        : type === "textarea"
          ? "textarea"
          : type === "select"
            ? "select"
            : type === "file"
              ? "file"
              : type === "checkbox"
                ? "checkbox"
                : type === "number"
                  ? "number"
                  : type === "date"
                    ? "date"
                    : "text";
      fields.push({ kind, els: [el], name: el.getAttribute("name") || "" });
    }
    for (const f of fields) {
      const el = f.els[0];
      if (!el.getAttribute(ATTR)) el.setAttribute(ATTR, `f${counter++}`);
      f.id = el.getAttribute(ATTR);
      f.elId = el.id || "";
      f.label = f.kind === "radio" ? groupLabel(f.els) : labelFor(el);
      f.autocomplete = (el.getAttribute("autocomplete") || "").toLowerCase();
      f.required =
        f.els.some((e) => e.required || e.getAttribute("aria-required") === "true") ||
        !!el.closest("[role='group'][aria-required='true'], [role='radiogroup'][aria-required='true']") ||
        /[*✱]\s*$/.test(textOf(el.id ? doc.querySelector(`label[for="${CSS.escape(el.id)}"]`) : null));
      f.maxLength = el.maxLength > 0 ? el.maxLength : null;
      if (f.kind === "select") {
        f.options = [...el.options]
          .filter((o) => o.value !== "" && !/^(select|choose|please select|--)/i.test(o.text.trim()))
          .map((o) => o.text.trim());
      } else if (f.kind === "radio") {
        f.options = f.els.map(optionLabel);
      }
      f.hasValue = hasValueNow(f);
    }
    return fields;
  }

  // ── values ─────────────────────────────────────────────────────────────────
  const DECLINE_RE = /decline|prefer not|don.?t wish|do not wish|not to (say|answer|disclose)|rather not/i;

  function boolText(v) {
    return v === true ? "Yes" : v === false ? "No" : "";
  }

  function profileValue(key, p, field) {
    const exp = (p.experience || [])[0];
    switch (key) {
      case "firstName":
        return p.firstName;
      case "lastName":
        return p.lastName;
      case "fullName":
        return [p.firstName, p.lastName].filter(Boolean).join(" ");
      case "email":
        return p.email;
      case "phone":
        return p.phone;
      case "linkedin":
        return p.linkedin;
      case "github":
        return p.github;
      case "portfolio":
        return p.portfolio || p.github;
      case "city":
        return p.city;
      case "country":
        return p.country;
      case "location":
        return [p.city, p.country].filter(Boolean).join(", ");
      case "timezone":
        return p.timezone;
      case "currentCompany":
        return exp && (!exp.end || /present|now|current/i.test(exp.end)) ? exp.company : "";
      case "currentTitle":
        return (exp && exp.title) || p.headline;
      case "yearsExperience":
        return p.yearsExperience != null ? String(p.yearsExperience) : "";
      case "salary": {
        if (field.kind === "number") {
          const m = String(p.salaryExpectation || "").replace(/[,\s](?=\d{3})/g, "").match(/\d+(\.\d+)?/);
          return m ? m[0] : "";
        }
        return p.salaryExpectation;
      }
      case "workAuthorization":
        return field.kind === "text" || field.kind === "textarea" ? p.workAuthorization : "";
      case "noticePeriod":
        return p.noticePeriod;
      case "availableFrom":
        return p.availableFrom;
      case "sponsorship":
        return boolText(p.needsSponsorship);
      case "relocate":
        return boolText(p.willingToRelocate);
      case "remote":
        return field.kind === "text" || field.kind === "textarea" ? p.remotePreference : "";
      case "gender":
        return (p.eeo && p.eeo.gender) || "Decline to self-identify";
      case "ethnicity":
        return (p.eeo && p.eeo.ethnicity) || "Decline to self-identify";
      case "veteran":
        return (p.eeo && p.eeo.veteran) || "Decline to self-identify";
      case "disability":
        return (p.eeo && p.eeo.disability) || "Decline to self-identify";
      case "hearAbout":
        return "LinkedIn";
      default:
        return "";
    }
  }

  // Pick the option that best matches a wanted value.
  function chooseOption(options, wanted) {
    if (!wanted || !options.length) return -1;
    const w = wanted.trim().toLowerCase();
    let i = options.findIndex((o) => o.trim().toLowerCase() === w);
    if (i >= 0) return i;
    if (DECLINE_RE.test(wanted)) {
      i = options.findIndex((o) => DECLINE_RE.test(o));
      if (i >= 0) return i;
    }
    if (w === "yes" || w === "no") {
      i = options.findIndex((o) => new RegExp(`^${w}\\b`, "i").test(o.trim()));
      if (i >= 0) return i;
    }
    i = options.findIndex((o) => o.toLowerCase().includes(w));
    if (i >= 0) return i;
    i = options.findIndex((o) => w.includes(o.trim().toLowerCase()) && o.trim().length > 2);
    if (i >= 0) return i;
    if (w === "linkedin") {
      i = options.findIndex((o) => /job board|online|website|internet/i.test(o));
      if (i < 0) i = options.findIndex((o) => /^other/i.test(o.trim()));
    }
    return i;
  }

  // ── searchable dropdowns (comboboxes) ─────────────────────────────────────
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // The value a combobox currently shows as selected (react-select renders it
  // in a sibling "single-value" element; the input itself stays empty).
  function comboSelection(input) {
    const box = input.closest("[class*='container' i], [class*='select' i]") || input.parentElement;
    const single = box && box.querySelector("[class*='single-value' i], [class*='singleValue' i], [class*='multi-value' i]");
    return single ? textOf(single) : "";
  }

  function visibleOptions(input) {
    const doc = input.ownerDocument;
    const listId = input.getAttribute("aria-controls") || input.getAttribute("aria-owns");
    const scope = (listId && doc.getElementById(listId)) || doc;
    return [...scope.querySelectorAll("[role='option']")].filter((o) => isVisible(o) && textOf(o));
  }

  function press(el, key) {
    for (const type of ["keydown", "keyup"]) {
      el.dispatchEvent(new KeyboardEvent(type, { key, code: key, bubbles: true, cancelable: true }));
    }
  }

  // Type the wanted value, wait for the filtered options, click the best one.
  async function pickComboOption(input, wanted) {
    if (!wanted) return false;
    input.focus();
    setNativeValue(input, wanted, { blur: false });
    press(input, "ArrowDown");
    let options = [];
    for (let i = 0; i < 10 && options.length === 0; i++) {
      await sleep(80);
      options = visibleOptions(input);
    }
    const idx = chooseOption(
      options.map((o) => textOf(o)),
      wanted,
    );
    if (idx < 0) {
      setNativeValue(input, "", { blur: false });
      press(input, "Escape");
      return false;
    }
    const opt = options[idx];
    for (const type of ["mousedown", "mouseup", "click"]) {
      opt.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: input.ownerDocument.defaultView }));
    }
    await sleep(60);
    return !!comboSelection(input) || !String(input.value || "").trim();
  }

  // ── writing ────────────────────────────────────────────────────────────────
  function setNativeValue(el, value, opts = {}) {
    const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : el.tagName === "SELECT" ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, "value");
    if (desc && desc.set) desc.set.call(el, value);
    else el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    if (opts.blur !== false) el.dispatchEvent(new Event("blur", { bubbles: true }));
  }

  async function fillField(field, value) {
    const el = field.els[0];
    if (field.kind === "combobox") return pickComboOption(el, value);
    if (field.kind === "select") {
      const options = [...el.options];
      const labels = options.map((o) => o.text.trim());
      const idx = chooseOption(labels, value);
      if (idx < 0) return false;
      setNativeValue(el, options[idx].value);
      return true;
    }
    if (field.kind === "radio") {
      const idx = chooseOption(field.options, value);
      if (idx < 0) return false;
      const radio = field.els[idx];
      radio.click();
      if (!radio.checked) {
        radio.checked = true;
        radio.dispatchEvent(new Event("change", { bubbles: true }));
      }
      return true;
    }
    if (field.kind === "checkbox") return false; // consent boxes are always yours to tick
    const text = field.maxLength ? String(value).slice(0, field.maxLength) : String(value);
    setNativeValue(el, text);
    return true;
  }

  function attachFile(input, file) {
    const bin = atob(file.base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const dt = new DataTransfer();
    dt.items.add(new File([bytes], file.name, { type: file.type }));
    input.files = dt.files;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    return !!(input.files && input.files.length);
  }

  function highlightTarget(field) {
    const el = field.els[0];
    if (field.kind === "radio") return el.closest("fieldset") || el.parentElement?.parentElement || el;
    if (field.kind === "file" && !isVisible(el)) return el.closest("[class*='upload' i], [class*='drop' i], [class*='attach' i], label, div") || el;
    return el;
  }

  function paint(field, status) {
    const target = highlightTarget(field);
    if (!target || !target.style) return;
    target.setAttribute("data-jf-status", status);
    target.style.outline = `2px solid ${COLORS[status]}`;
    target.style.outlineOffset = "2px";
    target.title =
      status === "ai"
        ? "Drafted by AI — read before submitting"
        : status === "check"
          ? "From your profile — check it fits this question"
          : status === "missing"
            ? "Needs your answer"
            : target.title;
  }

  function overlay(results) {
    if (window !== window.top) return;
    let box = document.getElementById("jf-autofill-box");
    if (!box) {
      box = document.createElement("div");
      box.id = "jf-autofill-box";
      box.style.cssText =
        "position:fixed;right:16px;bottom:16px;z-index:2147483647;background:#111827;color:#f9fafb;font:12px/1.4 system-ui,sans-serif;padding:10px 12px;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.25);max-width:280px";
      document.body.appendChild(box);
    }
    const n = (s) => results.filter((r) => r.status === s).length;
    box.innerHTML = "";
    const title = document.createElement("div");
    title.style.cssText = "font-weight:600;margin-bottom:4px";
    title.textContent = "Job Finder autofill";
    box.appendChild(title);
    const rows = [
      [COLORS.profile, `${n("profile") + n("resume")} filled from your profile`],
      [COLORS.ai, `${n("ai") + n("check")} to read (AI drafts / check)`],
      [COLORS.missing, `${n("missing")} need you`],
    ];
    for (const [color, text] of rows) {
      const row = document.createElement("div");
      const dot = document.createElement("span");
      dot.style.cssText = `display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px;background:${color}`;
      row.appendChild(dot);
      row.appendChild(document.createTextNode(text));
      box.appendChild(row);
    }
    const note = document.createElement("div");
    note.style.cssText = "margin-top:6px;opacity:.75";
    note.textContent = "Nothing was submitted. Review, then submit yourself.";
    box.appendChild(note);
    const btn = document.createElement("button");
    btn.textContent = "Clear highlights";
    btn.style.cssText = "margin-top:6px;background:#374151;color:#f9fafb;border:0;border-radius:6px;padding:3px 8px;cursor:pointer;font:inherit";
    btn.addEventListener("click", () => api.clear());
    box.appendChild(btn);
  }

  // ── public API ─────────────────────────────────────────────────────────────
  function pageContext() {
    const og = (p) => document.querySelector(`meta[property="og:${p}"]`)?.getAttribute("content") || "";
    const h1 = textOf(document.querySelector("h1, .app-title, .posting-headline h2"));
    // "Job Application for <role> at <company>" (Greenhouse), "<company> - <role>" (Lever).
    const fromTitle = document.title.match(/application for (.+?) at (.+)$/i);
    const leverTitle = /lever\.co$/.test(location.hostname) ? document.title.split(" - ") : [];
    const company =
      (fromTitle && fromTitle[2].trim()) ||
      (leverTitle.length > 1 ? leverTitle[0].trim() : "") ||
      textOf(document.querySelector(".company-name, [class*='company-name' i]")) ||
      og("site_name");
    const main = document.querySelector("main, #content, .content, [class*='job-description' i], .posting-page, body");
    return {
      jobTitle: ((fromTitle && fromTitle[1].trim()) || h1 || (leverTitle.length > 1 ? leverTitle.slice(1).join(" - ").trim() : "") || og("title") || document.title).slice(0, 300),
      company: company.replace(/^at\s+/i, "").slice(0, 200),
      pageText: textOf(main).slice(0, 6000),
    };
  }

  let fieldsCache = [];

  const api = {
    scan() {
      const ats = detectAts();
      fieldsCache = discover(document);
      for (const f of fieldsCache) f.key = mapKey(f, ats);
      return {
        url: location.href,
        isTop: window === window.top,
        ats,
        ...(window === window.top ? pageContext() : {}),
        fields: fieldsCache.map((f) => ({
          id: f.id,
          label: f.label,
          kind: f.kind,
          key: f.key,
          aiKey: !!(f.key && AI_KEYS.has(f.key)),
          required: !!f.required,
          options: f.options || null,
          maxLength: f.maxLength,
          hasValue: !!f.hasValue,
        })),
      };
    },

    // payload: { profile, answers: { [fieldId]: text }, resume: { name, type, base64 } | null, overwrite }
    async fill(payload) {
      const profile = payload.profile || {};
      const answers = payload.answers || {};
      if (!fieldsCache.length) api.scan();
      const results = [];
      for (const f of fieldsCache) {
        const base = { id: f.id, label: f.label, kind: f.kind };
        if (hasValueNow(f) && !payload.overwrite) {
          results.push({ ...base, status: "kept" });
          continue;
        }
        if (f.kind === "file") {
          if (f.key === "resume" && payload.resume && attachFile(f.els[0], payload.resume)) {
            paint(f, "resume");
            results.push({ ...base, status: "resume", value: payload.resume.name });
          } else if (f.required) {
            paint(f, "missing");
            results.push({ ...base, status: "missing" });
          } else {
            results.push({ ...base, status: "skipped" });
          }
          continue;
        }
        const aiKey = !!(f.key && AI_KEYS.has(f.key));
        const fromProfile = f.key ? profileValue(f.key, profile, f) : "";
        if (!aiKey && fromProfile && (await fillField(f, fromProfile))) {
          paint(f, "profile");
          results.push({ ...base, status: "profile", value: fromProfile });
          continue;
        }
        const drafted = answers[f.id];
        if (drafted && (await fillField(f, drafted))) {
          paint(f, "ai");
          results.push({ ...base, status: "ai", value: drafted });
          continue;
        }
        if (aiKey && fromProfile && (await fillField(f, fromProfile))) {
          paint(f, "check");
          results.push({ ...base, status: "check", value: fromProfile });
          continue;
        }
        if (f.required || f.kind === "checkbox") {
          paint(f, "missing");
          results.push({ ...base, status: "missing" });
        } else {
          results.push({ ...base, status: "skipped" });
        }
      }
      lastResults = results;
      overlay(results);
      return { results };
    },

    // The free-text answers as they are now (after your edits), for "Mark as applied".
    collect() {
      const out = [];
      for (const f of fieldsCache) {
        if (!["text", "textarea", "select", "radio", "combobox"].includes(f.kind)) continue;
        if (f.key && !AI_KEYS.has(f.key)) continue; // plain profile facts are not "answers"
        const el = f.els[0];
        let value = "";
        if (f.kind === "combobox") {
          value = comboSelection(el);
        } else if (f.kind === "radio") {
          const i = f.els.findIndex((e) => e.checked);
          value = i >= 0 ? f.options[i] : "";
        } else if (f.kind === "select") {
          value = el.selectedIndex > 0 ? el.options[el.selectedIndex].text.trim() : "";
        } else {
          value = String(el.value || "").trim();
        }
        if (value && f.label) out.push({ question: f.label, answer: value });
      }
      return { answers: out, results: lastResults };
    },

    clear() {
      for (const el of document.querySelectorAll("[data-jf-status]")) {
        el.style.outline = "";
        el.style.outlineOffset = "";
        el.removeAttribute("data-jf-status");
      }
      document.getElementById("jf-autofill-box")?.remove();
      return true;
    },
  };

  window.__jobFinderAutofill = api;
})();
