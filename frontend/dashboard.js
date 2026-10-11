/* =========================================================
   Hawkeye dashboard

   HOW TO CONNECT THE BACKEND LATER
   1. Set CONFIG.USE_BACKEND = true and CONFIG.BASE_URL to your API.
   2. Make GET  {BASE_URL}/dashboard?range=7d|30d|90d  return the same
      JSON shape that buildSample() returns below.
   3. Make POST {BASE_URL}/actions  accept { opportunityId } (optional).
   4. Fill ROUTES with the real page URLs as the other pages are built.
   Nothing else in this file needs to change: every card, number, chart
   point and list row is drawn from that one JSON object.
   ========================================================= */

"use strict";

/* ---------- Config ---------- */
const CONFIG = {
  USE_BACKEND: false,
  BASE_URL: "http://localhost:8000/api",
  SAMPLE_DELAY: 350, // ms, makes the loading state visible with sample data
};

// Leave a route as "" until that page exists. Clicking it shows a pop-up instead.
const ROUTES = {
  dashboard: "dashboard.html",
  customer: "",
  insights: "",
  approvals: "",
  history: "",
};

const ROUTE_LABELS = {
  dashboard: "Dashboard",
  customer: "Customer",
  insights: "AI Insights",
  approvals: "Approvals",
  history: "Action History",
};

const RANGE_LABELS = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
};

/* ---------- Small helpers ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Escape anything that came from data before putting it in HTML
const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function money(v) {
  if (v >= 1e6) return "$" + +(v / 1e6).toFixed(1) + "M";
  if (v >= 1e3) return "$" + Math.round(v / 1e3) + "K";
  return "$" + v;
}

function fmt(value, format) {
  if (typeof value !== "number") return String(value ?? "");
  if (format === "percent") return value + "%";
  if (format === "money") return money(value);
  return value.toLocaleString("en-US");
}

/* ---------- Icons (inline SVG, static markup only) ---------- */
const ICONS = {
  layout: '<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  sparkles: '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/>',
  check: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  calendar: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
  trending: '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
  menu: '<line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  alert: '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>',
  arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  loader: '<path d="M21 12a9 9 0 1 1-6.219-8.56"/>',
};

const icon = (name, size = 20) =>
  `<svg class="icon" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[name] || ""}</svg>`;

/* =========================================================
   DATA LAYER  (the only place that talks to a backend)
   ========================================================= */
async function http(path, options = {}) {
  const res = await fetch(CONFIG.BASE_URL + path, {
    headers: { "Content-Type": "application/json" /* add Authorization here later */ },
    ...options,
  });
  if (!res.ok) throw new Error("Request failed (" + res.status + ")");
  return res.json();
}

const api = {
  async getDashboard(range) {
    if (!CONFIG.USE_BACKEND) {
      await sleep(CONFIG.SAMPLE_DELAY);
      return buildSample(range);
    }
    return http("/dashboard?range=" + encodeURIComponent(range));
  },

  async createAction(opportunityId) {
    if (!CONFIG.USE_BACKEND) {
      await sleep(500);
      return { ok: true };
    }
    return http("/actions", { method: "POST", body: JSON.stringify({ opportunityId }) });
  },
};

/* ---------- Sample data (same shape the backend should return) ---------- */
const SAMPLE_NUMBERS = {
  "7d": { approvals: 34, delta: "+6%", confidence: 93, open: 4, coverage: 81, rate: 90, sla: 97, signals: 11, active: 9, change: "+9%", trend: [18, 24, 21, 29, 26, 33, 30], opp: [12000, 5000, 9000, 16000] },
  "30d": { approvals: 128, delta: "+12%", confidence: 94, open: 7, coverage: 86, rate: 92, sla: 98, signals: 24, active: 24, change: "+18%", trend: [42, 55, 48, 62, 57, 71, 66], opp: [42000, 18000, 31000, 56000] },
  "90d": { approvals: 371, delta: "+15%", confidence: 94, open: 12, coverage: 88, rate: 93, sla: 98, signals: 58, active: 41, change: "+22%", trend: [118, 142, 131, 160, 149, 181, 170], opp: [118000, 52000, 87000, 163000] },
};

function buildSample(range) {
  const n = SAMPLE_NUMBERS[range] || SAMPLE_NUMBERS["30d"];
  const note = "Illustrative sample data";
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return {
    range,
    insights: { activeSignals: n.active, note },
    hero: {
      note,
      title: "Workspace performance",
      badge: {
        label: "AI-driven",
        detail: "The figures in this panel are produced by Hawkeye's AI agent from your connected customer signals. Every number can be traced back to its evidence.",
      },
      metrics: [
        { id: "totalApprovals", label: "Total approvals", value: n.approvals, format: "number", note: n.delta + " vs last period", detail: "Actions the agent proposed that a person reviewed and approved in this period.", route: "approvals" },
        { id: "aiConfidence", label: "AI confidence", value: n.confidence, format: "percent", note: "High accuracy trend", detail: "How often the agent's explanations matched the evidence a reviewer checked.", route: "insights" },
        { id: "openActions", label: "Open actions", value: n.open, format: "number", note: "Needs attention", detail: "Proposed actions still waiting for a human decision.", route: "approvals" },
      ],
      subMetrics: [
        { id: "coverage", label: "Customer coverage", value: n.coverage, format: "percent", detail: "Share of customers with fresh signals from at least three connected sources.", route: "customer" },
        { id: "approvalRate", label: "Approval rate", value: n.rate, format: "percent", detail: "Share of proposed actions that reviewers approved.", route: "approvals" },
        { id: "sla", label: "SLA met", value: n.sla, format: "percent", detail: "Share of actions reviewed within the agreed response time.", route: "history" },
      ],
    },
    stats: [
      { id: "approvals", label: "Approvals", value: n.approvals, format: "number", note, icon: "check", detail: "Approved actions in the selected period.", route: "approvals" },
      { id: "signals", label: "AI signals", value: n.signals, format: "number", note, icon: "sparkles", detail: "Risk and opportunity signals the agent has detected.", route: "insights" },
      { id: "customers", label: "Customers", value: 312, format: "number", note, icon: "users", detail: "Customers currently monitored in this workspace.", route: "customer" },
    ],
    trend: {
      title: "Activity trend",
      note,
      change: n.change,
      unit: "signals",
      points: days.map((label, i) => ({ label, value: n.trend[i] })),
    },
    opportunities: {
      title: "Revenue Opportunity",
      items: [
        { id: "upsell", name: "Upsell/Cross-sell", amount: n.opp[0], sample: "12 accounts", next: "offer premium upgrades" },
        { id: "winback", name: "Win-back campaigns", amount: n.opp[1], sample: "9 inactive customers", next: "send win-back offers" },
        { id: "newlogo", name: "New logo pipeline", amount: n.opp[2], sample: "7 qualified leads", next: "schedule tailored demos" },
        { id: "expansion", name: "Expansion renewals", amount: n.opp[3], sample: "4 renewal accounts", next: "propose expansion plans" },
      ],
    },
  };
}

/* =========================================================
   STATE
   ========================================================= */
const state = { range: "30d", data: null, requestId: 0, lastFocus: null };
let registry = {}; // key -> item, so clicks can open the right pop-up

/* =========================================================
   TOAST (top right)
   ========================================================= */
const TOAST_TIME = 4000;
let toastTimer = null;

function removeToast(toast) {
  if (!toast || !toast.isConnected) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return toast.remove();
  toast.classList.add("leaving");
  toast.addEventListener("animationend", () => toast.remove(), { once: true });
}

function showToast(type, title, message) {
  const stack = $("#toast-stack");
  clearTimeout(toastTimer);
  stack.replaceChildren();

  const toast = document.createElement("div");
  toast.className = "toast " + type;
  toast.style.setProperty("--toast-time", TOAST_TIME + "ms");
  toast.setAttribute("role", type === "error" ? "alert" : "status");
  toast.innerHTML =
    `<div class="toast-icon">${icon(type === "error" ? "alert" : "check", 22)}</div>` +
    `<div><p class="toast-title"></p><p class="toast-text"></p></div>` +
    `<button type="button" class="toast-close" aria-label="Dismiss notification">${icon("x", 18)}</button>` +
    `<div class="toast-timer"></div>`;
  $(".toast-title", toast).textContent = title;
  $(".toast-text", toast).textContent = message;
  $(".toast-close", toast).addEventListener("click", () => {
    clearTimeout(toastTimer);
    removeToast(toast);
  });
  stack.append(toast);
  toastTimer = setTimeout(() => removeToast(toast), TOAST_TIME);
}

/* =========================================================
   MODAL (pop-up)
   ========================================================= */
function closeModal(restoreFocus = true) {
  const root = $("#modal-root");
  if (!root.firstChild) return;
  root.replaceChildren();
  document.body.classList.remove("lock");
  if (restoreFocus && state.lastFocus && state.lastFocus.isConnected) state.lastFocus.focus();
}

function openModal({ eyebrow = "", title = "", value = "", note = "", body = "", content = null, actions = [] }) {
  closeModal(false);
  state.lastFocus = document.activeElement;

  const root = $("#modal-root");
  root.innerHTML =
    `<div class="backdrop"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">` +
    `<button class="modal-x" type="button" aria-label="Close">${icon("x", 18)}</button>` +
    (eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : "") +
    `<h3 id="modal-title">${esc(title)}</h3>` +
    (value !== "" ? `<p class="modal-value">${esc(value)}</p>` : "") +
    (note ? `<p class="modal-note">${esc(note)}</p>` : "") +
    (body ? `<p class="modal-body">${esc(body)}</p>` : "") +
    `<div class="modal-extra"></div><div class="modal-actions"></div></div></div>`;

  const backdrop = $(".backdrop", root);
  const modal = $(".modal", root);
  if (content) $(".modal-extra", modal).append(content);

  const buttons = {};
  actions.forEach((a) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "mbtn " + (a.variant || "ghost");
    b.textContent = a.label;
    b.addEventListener("click", () => a.onClick(b));
    $(".modal-actions", modal).append(b);
    buttons[a.label] = b;
  });

  backdrop.addEventListener("mousedown", (e) => {
    if (e.target === backdrop) closeModal();
  });
  $(".modal-x", modal).addEventListener("click", () => closeModal());

  // Keep Tab inside the pop-up
  modal.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;
    const focusable = $$("button:not(:disabled), [tabindex]:not([tabindex='-1'])", modal);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  document.body.classList.add("lock");
  const primary = $(".mbtn.primary", modal) || $(".mbtn", modal) || $(".modal-x", modal);
  primary.focus();
  return { modal, buttons };
}

/* ---------- Pop-up recipes ---------- */
function openDetail(item) {
  const actions = [{ label: "Close", variant: "ghost", onClick: () => closeModal() }];
  if (item.route && item.route !== "dashboard") {
    actions.unshift({
      label: "Open " + (ROUTE_LABELS[item.route] || item.route),
      variant: "primary",
      onClick: () => {
        closeModal(false);
        go(item.route);
      },
    });
  }
  openModal({
    eyebrow: RANGE_LABELS[state.range] || "Details",
    title: item.label,
    value: item.value === undefined ? "" : fmt(item.value, item.format),
    note: item.note || "",
    body: item.detail || "",
    actions,
  });
}

function openComingSoon(route) {
  const label = ROUTE_LABELS[route] || "This";
  openModal({
    eyebrow: "Not connected yet",
    title: label + " page",
    body: "This page will open here once it is built and linked. Your dashboard data and layout stay exactly as they are.",
    actions: [{ label: "Got it", variant: "primary", onClick: () => closeModal() }],
  });
}

function openOpportunity(opp) {
  const { buttons } = openModal({
    eyebrow: "Revenue opportunity",
    title: opp.name,
    value: money(opp.amount),
    note: "Sample: " + opp.sample,
    body: "Suggested next step: " + opp.next + ". The agent will draft the action and wait for a person to approve it.",
    actions: [
      {
        label: "Create action",
        variant: "primary",
        onClick: async (btn) => {
          btn.disabled = true;
          btn.innerHTML = icon("loader", 18) + " Creating";
          $("svg", btn).style.animation = "shimmer 0s";
          try {
            await api.createAction(opp.id);
            closeModal();
            showToast("success", "Action drafted", "Next step for " + opp.name + " is waiting for approval.");
          } catch (err) {
            btn.disabled = false;
            btn.textContent = "Create action";
            showToast("error", "Could not create action", err.message || "Please try again.");
          }
        },
      },
      { label: "Close", variant: "ghost", onClick: () => closeModal() },
    ],
  });
  return buttons;
}

/* ---------- Export ---------- */
function csvCell(v) {
  const s = String(v ?? "");
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function toCSV(d) {
  const rows = [["Section", "Label", "Value", "Note"]];
  rows.push(["Report", "Date range", RANGE_LABELS[d.range] || d.range, ""]);
  d.hero.metrics.forEach((m) => rows.push([d.hero.title, m.label, fmt(m.value, m.format), m.note || ""]));
  d.hero.subMetrics.forEach((m) => rows.push([d.hero.title, m.label, fmt(m.value, m.format), ""]));
  d.stats.forEach((s) => rows.push(["Totals", s.label, fmt(s.value, s.format), s.note || ""]));
  d.trend.points.forEach((p) => rows.push([d.trend.title, p.label, p.value, d.trend.unit]));
  d.opportunities.items.forEach((o) =>
    rows.push([d.opportunities.title, o.name, money(o.amount), "Sample: " + o.sample + "; Next: " + o.next])
  );
  return "\ufeff" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
}

function downloadFile(name, text, mime) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function openExport() {
  if (!state.data) return;
  let format = "csv";

  const options = [
    { id: "csv", title: "CSV spreadsheet", sub: "Opens in Excel or Google Sheets" },
    { id: "json", title: "JSON data", sub: "Raw data, useful for other tools" },
    { id: "pdf", title: "PDF (print)", sub: "Opens the print dialog, choose Save as PDF" },
  ];

  const group = document.createElement("div");
  group.className = "choices";
  group.setAttribute("role", "radiogroup");
  group.setAttribute("aria-label", "Export format");
  options.forEach((o) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "choice";
    b.setAttribute("role", "radio");
    b.setAttribute("aria-checked", String(o.id === format));
    b.innerHTML = `<strong>${esc(o.title)}</strong><span>${esc(o.sub)}</span>`;
    b.addEventListener("click", () => {
      format = o.id;
      $$(".choice", group).forEach((c) => c.setAttribute("aria-checked", String(c === b)));
    });
    group.append(b);
  });

  openModal({
    eyebrow: RANGE_LABELS[state.range],
    title: "Export report",
    body: "Choose a format for the current dashboard.",
    content: group,
    actions: [
      {
        label: "Download",
        variant: "primary",
        onClick: () => {
          const d = state.data;
          const stamp = "hawkeye-report-" + d.range;
          closeModal();
          if (format === "csv") downloadFile(stamp + ".csv", toCSV(d), "text/csv;charset=utf-8");
          else if (format === "json") downloadFile(stamp + ".json", JSON.stringify(d, null, 2), "application/json");
          else setTimeout(() => window.print(), 150);
          showToast("success", "Report exported", format === "pdf" ? "Choose Save as PDF in the print dialog." : "Your " + format.toUpperCase() + " file is downloading.");
        },
      },
      { label: "Cancel", variant: "ghost", onClick: () => closeModal() },
    ],
  });
}

/* =========================================================
   NAVIGATION
   ========================================================= */
function closeSidebar() {
  $("#sidebar").classList.remove("open");
  $("#scrim").hidden = true;
  $("#menu-btn").setAttribute("aria-expanded", "false");
}

/* Customer directory demo data. Replace this array with your API response later. */
const CUSTOMER_RECORDS = [
  ["Aarav Sharma","TechNova 1","Technology",9000000001,5750,"2026-10-08","2026-10-18",55],
  ["Priya Verma","GrowthHub 2","Retail",9000000002,6500,"2026-10-06","2026-10-21",90],
  ["Rahul Patel","CloudWorks 3","Finance",9000000003,7250,"2026-10-04","2026-10-24",20],
  ["Neha Gupta","RetailPro 4","Healthcare",9000000004,8000,"2026-10-02","2026-10-27",55],
  ["Rohan Mehta","DataSphere 5","Manufacturing",9000000005,8750,"2026-09-30","2026-10-30",90],
  ["Ananya Sharma","TechNova 6","Technology",9000000006,9500,"2026-09-28","2026-11-02",20],
  ["Karan Verma","GrowthHub 7","Retail",9000000007,10250,"2026-09-26","2026-11-05",55],
  ["Sneha Patel","CloudWorks 8","Finance",9000000008,11000,"2026-09-24","2026-11-08",90],
  ["Vivek Gupta","RetailPro 9","Healthcare",9000000009,11750,"2026-09-22","2026-11-11",20],
].map((r,i)=>({id:i+1,name:r[0],email:`customer${i+1}@example.com`,company:r[1],industry:r[2],phone:r[3],revenue:r[4],purchase:r[5],renewal:r[6],usage:r[7]}));

function showCustomerView() {
  $("#ai-view").hidden = true;
  const view = $("#customer-view");
  $("#content").hidden = true;
  view.hidden = false;
  $(".topbar h1").textContent = "Customer";
  $(".eyebrow-text").textContent = "Workspace / Customer directory";
  $(".actions").hidden = true;
  $$(".nav-item").forEach(a => { a.removeAttribute("aria-current"); if(a.dataset.route === "customer") a.setAttribute("aria-current","page"); });
  view.innerHTML = `<div class="customer-head"><div><h2>Customer directory</h2><p>Explore your connected customer accounts · Demo sample data</p></div><label class="customer-search-label">Search customers<input id="customer-search" type="search" placeholder="Search name, company or industry" autocomplete="off" /></label></div><div id="customer-grid" class="customer-grid"></div>`;
  const grid = $("#customer-grid");
  function draw(q="") {
    const matches = CUSTOMER_RECORDS.filter(c => [c.name,c.company,c.industry].some(v=>v.toLowerCase().includes(q.toLowerCase())));
    grid.innerHTML = matches.map(c=>`<button class="customer-card" type="button" data-customer="${c.id}" aria-label="View ${esc(c.name)} details"><h3>${esc(c.name)}</h3><p class="customer-email">${esc(c.email)}</p><dl>${[["Company",c.company],["Industry",c.industry],["Phone",c.phone],["Monthly revenue",c.revenue.toFixed(2)],["Last purchase",c.purchase],["Renewal",c.renewal],["Usage",c.usage+"%"]].map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl><small>Demo sample data</small></button>`).join("") || '<p>No matching customers found.</p>';
  }
  draw();
  $("#customer-search").addEventListener("input",e=>draw(e.target.value));
  grid.addEventListener("click",e=>{const card=e.target.closest("[data-customer]");if(!card)return;const c=CUSTOMER_RECORDS.find(c=>c.id===Number(card.dataset.customer));openDetail({label:c.name,value:c.company,note:c.industry,detail:`Email: ${c.email} · Phone: ${c.phone} · Monthly revenue: $${c.revenue.toFixed(2)} · Renewal: ${c.renewal} · Usage: ${c.usage}%. Demo customer account.`});});
  window.scrollTo({top:0,behavior:"smooth"});
}

function showDashboardView() {
  $("#content").hidden = false;
  $("#customer-view").hidden = true;
  $("#ai-view").hidden = true;
  $(".topbar h1").textContent = "Dashboard";
  $(".eyebrow-text").textContent = "Workspace overview";
  $(".actions").hidden = false;
  $$(".nav-item").forEach(a=>{a.removeAttribute("aria-current");if(a.dataset.route==="dashboard")a.setAttribute("aria-current","page");});
}

function go(route) {
  closeSidebar();
  if (route === "customer") { showCustomerView(); return; }
  if (route === "insights") { showAIInsights(); return; }
  if (route === "approvals") { showApprovals(); return; }
  if (route === "history") { showActionHistory(); return; }
  if (route === "dashboard") {
    showDashboardView();
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  const url = ROUTES[route];
  if (url) window.location.href = url;
  else openComingSoon(route);
}

/* =========================================================
   RENDERING (everything below is drawn from `state.data`)
   ========================================================= */
function reg(key, item) {
  registry[key] = item;
  return esc(key);
}

function renderSidebar(d) {
  $("#ins-value").textContent = d.insights.activeSignals + " active signals";
  $("#ins-note").textContent = d.insights.note || "";
  registry["insights:summary"] = {
    label: "Active signals",
    value: d.insights.activeSignals,
    format: "number",
    note: d.insights.note,
    detail: "Risk and opportunity signals the agent is tracking right now.",
    route: "insights",
  };
}

function renderHero(h) {
  const el = $("#hero");
  const badgeKey = reg("hero:badge", { label: h.badge.label, detail: h.badge.detail });
  el.innerHTML =
    `<div class="hero-top"><div><p class="hero-note">${esc(h.note)}</p><h2>${esc(h.title)}</h2></div>` +
    `<button class="pill-btn light" type="button" data-open="${badgeKey}">${icon("sparkles", 16)}${esc(h.badge.label)}</button></div>` +
    `<div class="metrics">` +
    h.metrics
      .map(
        (m) =>
          `<button class="metric" type="button" data-open="${reg("metric:" + m.id, m)}">` +
          `<span class="m-label">${esc(m.label)}</span><span class="m-value">${esc(fmt(m.value, m.format))}</span><span class="m-note">${esc(m.note)}</span></button>`
      )
      .join("") +
    `</div><div class="subs">` +
    h.subMetrics
      .map(
        (m) =>
          `<button class="subcard" type="button" data-open="${reg("sub:" + m.id, m)}">` +
          `<span class="s-label">${esc(m.label)}</span><span class="s-value">${esc(fmt(m.value, m.format))}</span></button>`
      )
      .join("") +
    `</div>`;
}

function renderStats(stats) {
  $("#stats").innerHTML = stats
    .map(
      (s) =>
        `<button class="stat-card" type="button" data-open="${reg("stat:" + s.id, s)}">` +
        `<span class="stat-top"><span class="stat-label">${esc(s.label)}</span><span class="stat-chip stat-icon">${icon(s.icon || "check", 18)}</span></span>` +
        `<span class="stat-value">${esc(fmt(s.value, s.format))}</span><span class="stat-note">${esc(s.note)}</span></button>`
    )
    .join("");
}

function renderTrendShell(t) {
  const changeKey = reg("trend:change", {
    label: "Change vs previous period",
    value: t.change,
    note: RANGE_LABELS[state.range],
    detail: "Total activity compared with the previous period of the same length.",
  });
  $("#trend").innerHTML =
    `<div class="card-head"><div><h3>${esc(t.title)}</h3><p class="card-sub">${esc(t.note)}</p></div>` +
    `<button class="pill-btn soft" type="button" data-open="${changeKey}">${icon("trending", 14)}${esc(t.change)}</button></div>` +
    `<div class="chart" id="chart"></div>`;
  drawChart();
}

function renderOpps(o) {
  $("#opps").innerHTML =
    `<div class="card-head"><h3>${esc(o.title)}</h3><span class="stat-chip" aria-hidden="true">${icon("sparkles", 18)}</span></div>` +
    `<div class="opp-list">` +
    o.items
      .map(
        (i) =>
          `<button class="opp" type="button" data-opp="${esc(i.id)}">` +
          `<span class="opp-row"><span class="opp-name">${esc(i.name)}</span><span class="opp-amount">${esc(money(i.amount))}</span></span>` +
          `<span class="opp-meta">Sample: ${esc(i.sample)}</span><span class="opp-meta">Next: ${esc(i.next)}</span></button>`
      )
      .join("") +
    `</div>`;
}

function render(d) {
  registry = {};
  state.data = d;
  $("#range-label").textContent = RANGE_LABELS[d.range] || RANGE_LABELS[state.range];
  renderSidebar(d);
  renderHero(d.hero);
  renderStats(d.stats);
  renderTrendShell(d.trend);
  renderOpps(d.opportunities);
}

/* ---------- Chart ---------- */
function drawChart() {
  const box = $("#chart");
  const t = state.data && state.data.trend;
  if (!box || !t || !t.points.length) return;

  const W = Math.max(box.clientWidth, 280);
  const H = 250;
  const pad = { t: 28, r: 30, b: 40, l: 30 };
  const pts = t.points;
  const vals = pts.map((p) => p.value);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const span = hi - lo || 1;
  const min = Math.max(0, lo - span * 0.6);
  const max = hi + span * 0.35;
  const x = (i) => pad.l + i * ((W - pad.l - pad.r) / Math.max(1, pts.length - 1));
  const y = (v) => pad.t + (1 - (v - min) / (max - min)) * (H - pad.t - pad.b);

  const line = pts.map((p, i) => (i ? "L" : "M") + x(i).toFixed(1) + " " + y(p.value).toFixed(1)).join(" ");
  const area = line + " L" + x(pts.length - 1).toFixed(1) + " " + (H - pad.b) + " L" + x(0).toFixed(1) + " " + (H - pad.b) + " Z";

  let grid = "";
  for (let k = 0; k < 4; k++) {
    const gy = pad.t + (k * (H - pad.t - pad.b)) / 3;
    grid += `<line class="grid-line" x1="${pad.l}" x2="${W - pad.r}" y1="${gy.toFixed(1)}" y2="${gy.toFixed(1)}"/>`;
  }

  const dots = pts
    .map(
      (p, i) =>
        `<g class="pt" tabindex="0" role="button" data-i="${i}" aria-label="${esc(p.label)}: ${esc(p.value)} ${esc(t.unit || "")}">` +
        `<circle cx="${x(i).toFixed(1)}" cy="${y(p.value).toFixed(1)}" r="18" fill="transparent"/>` +
        `<circle class="dot" cx="${x(i).toFixed(1)}" cy="${y(p.value).toFixed(1)}" r="5"/></g>`
    )
    .join("");

  const labels = pts
    .map((p, i) => `<text class="x-label" x="${x(i).toFixed(1)}" y="${H - 14}" text-anchor="middle">${esc(p.label)}</text>`)
    .join("");

  box.innerHTML =
    `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(t.title)} by day">` +
    `<defs><linearGradient id="area-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#0552e0" stop-opacity="0.18"/><stop offset="1" stop-color="#0552e0" stop-opacity="0"/></linearGradient></defs>` +
    grid +
    `<path d="${area}" fill="url(#area-fill)"/>` +
    `<path class="series" d="${line}"/>` +
    dots +
    labels +
    `</svg><div class="tip" hidden></div>`;

  box._geom = { x, y, W };
}

function chartPoint(i) {
  const t = state.data.trend;
  const p = t.points[i];
  const avg = t.points.reduce((s, q) => s + q.value, 0) / t.points.length;
  const diff = Math.round(((p.value - avg) / avg) * 100);
  return {
    label: p.label + " activity",
    value: p.value,
    format: "number",
    note: t.unit,
    detail: `${p.value} ${t.unit} on ${p.label}, which is ${Math.abs(diff)}% ${diff >= 0 ? "above" : "below"} the average for this period.`,
  };
}

function showTip(i) {
  const box = $("#chart");
  if (!box || !box._geom) return;
  const t = state.data.trend;
  const p = t.points[i];
  const tip = $(".tip", box);
  const { x, y, W } = box._geom;
  tip.textContent = p.label + " · " + p.value + " " + (t.unit || "");
  tip.hidden = false;
  tip.style.left = Math.min(Math.max(x(i), 70), W - 70) + "px";
  tip.style.top = y(p.value) - 14 + "px";
  $$(".pt", box).forEach((g, idx) => g.classList.toggle("active", idx === i));
}

function hideTip() {
  const box = $("#chart");
  if (!box) return;
  const tip = $(".tip", box);
  if (tip) tip.hidden = true;
  $$(".pt.active", box).forEach((g) => g.classList.remove("active"));
}

/* =========================================================
   LOADING
   ========================================================= */
async function loadData() {
  const id = ++state.requestId;
  const content = $("#content");
  content.classList.add("loading");
  content.setAttribute("aria-busy", "true");

  let data;
  try {
    data = await api.getDashboard(state.range);
  } catch (err) {
    if (id !== state.requestId) return;
    showToast("error", "Could not load live data", "Showing sample data instead.");
    data = buildSample(state.range);
  }
  if (id !== state.requestId) return; // a newer request replaced this one

  render(data);
  content.classList.remove("loading");
  content.removeAttribute("aria-busy");
}

/* =========================================================
   EVENTS
   ========================================================= */
function setRange(range) {
  closeRangeMenu();
  if (range === state.range) return;
  state.range = range;
  $("#range-label").textContent = RANGE_LABELS[range];
  buildRangeMenu();
  loadData().then(() => showToast("success", "Date range updated", "Showing " + RANGE_LABELS[range].toLowerCase() + "."));
}

function buildRangeMenu() {
  $("#range-menu").innerHTML = Object.entries(RANGE_LABELS)
    .map(
      ([key, label]) =>
        `<button type="button" role="menuitemradio" aria-checked="${key === state.range}" data-range="${key}">${esc(label)}${key === state.range ? icon("check", 16) : ""}</button>`
    )
    .join("");
}

function openRangeMenu() {
  $("#range-menu").hidden = false;
  $("#range-btn").setAttribute("aria-expanded", "true");
  const current = $('#range-menu [aria-checked="true"]') || $("#range-menu button");
  current.focus();
}

function closeRangeMenu(returnFocus = false) {
  if ($("#range-menu").hidden) return;
  $("#range-menu").hidden = true;
  $("#range-btn").setAttribute("aria-expanded", "false");
  if (returnFocus) $("#range-btn").focus();
}

function init() {
  // Icons for the static markup
  $$("[data-icon]").forEach((el) => el.insertAdjacentHTML("afterbegin", icon(el.dataset.icon, Number(el.dataset.size) || 20)));
  buildRangeMenu();

  // Sidebar navigation
  $$(".nav-item").forEach((a) =>
    a.addEventListener("click", (e) => {
      e.preventDefault();
      go(a.dataset.route);
    })
  );
  $("#insights-card").addEventListener("click", () => go("insights"));
  $("#logo-btn").addEventListener("click", () => {
    closeSidebar();
    loadData().then(() => showToast("success", "Dashboard refreshed", "You are seeing the latest data."));
  });

  // Mobile menu
  $("#menu-btn").addEventListener("click", () => {
    const open = !$("#sidebar").classList.contains("open");
    $("#sidebar").classList.toggle("open", open);
    $("#scrim").hidden = !open;
    $("#menu-btn").setAttribute("aria-expanded", String(open));
  });
  $("#scrim").addEventListener("click", closeSidebar);

  // Range + export
  $("#range-btn").addEventListener("click", () => ($("#range-menu").hidden ? openRangeMenu() : closeRangeMenu()));
  $("#range-menu").addEventListener("click", (e) => {
    const b = e.target.closest("[data-range]");
    if (b) setRange(b.dataset.range);
  });
  $("#range-menu").addEventListener("keydown", (e) => {
    const items = $$("#range-menu button");
    const i = items.indexOf(document.activeElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      items[(i + 1) % items.length].focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      items[(i - 1 + items.length) % items.length].focus();
    }
  });
  document.addEventListener("click", (e) => {
    if (!$("#range-wrap").contains(e.target)) closeRangeMenu();
  });
  $("#export-btn").addEventListener("click", openExport);

  // Cards, metrics, pills, opportunities (event delegation, so re-renders keep working)
  $("#content").addEventListener("click", (e) => {
    const opp = e.target.closest("[data-opp]");
    if (opp) {
      const item = state.data.opportunities.items.find((o) => o.id === opp.dataset.opp);
      if (item) openOpportunity(item);
      return;
    }
    const pt = e.target.closest(".pt");
    if (pt) return openDetail(chartPoint(Number(pt.dataset.i)));

    const open = e.target.closest("[data-open]");
    if (open && registry[open.dataset.open]) openDetail(registry[open.dataset.open]);
  });

  // Chart hover and keyboard
  const content = $("#content");
  content.addEventListener("pointermove", (e) => {
    const box = e.target.closest("#chart");
    if (!box || !box._geom) return;
    const rect = box.getBoundingClientRect();
    const px = e.clientX - rect.left;
    let best = 0;
    let dist = Infinity;
    state.data.trend.points.forEach((_, i) => {
      const d = Math.abs(box._geom.x(i) - px);
      if (d < dist) {
        dist = d;
        best = i;
      }
    });
    showTip(best);
  });
  content.addEventListener("pointerleave", hideTip);
  content.addEventListener("pointerout", (e) => {
    if (!e.relatedTarget || !e.relatedTarget.closest || !e.relatedTarget.closest("#chart")) hideTip();
  });
  content.addEventListener("focusin", (e) => {
    const pt = e.target.closest && e.target.closest(".pt");
    if (pt) showTip(Number(pt.dataset.i));
  });
  content.addEventListener("focusout", (e) => {
    if (e.target.closest && e.target.closest(".pt")) hideTip();
  });
  content.addEventListener("keydown", (e) => {
    const pt = e.target.closest && e.target.closest(".pt");
    if (pt && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      openDetail(chartPoint(Number(pt.dataset.i)));
    }
  });

  // Redraw the chart when its width changes
  let frame = 0;
  const watch = new ResizeObserver(() => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(drawChart);
  });
  watch.observe($("#trend"));

  // Escape closes whatever is open
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if ($("#modal-root").firstChild) closeModal();
    else if (!$("#range-menu").hidden) closeRangeMenu(true);
    else closeSidebar();
  });

  // Greet the person who just signed in
  let user = "";
  try {
    user = sessionStorage.getItem("hawkeye_user") || "";
    sessionStorage.removeItem("hawkeye_user");
  } catch (err) {
    /* storage can be blocked; greeting is optional */
  }

  loadData().then(() => {
    if (user) showToast("success", "Welcome back, " + user, "Your workspace is ready.");
  });
}

document.addEventListener("DOMContentLoaded", init);

/* Hawkeye AI Insights: API-first with genuine deterministic offline risk scoring. */
const AI_ACCOUNTS=[
{id:'acme',name:'Acme Technologies',email:'customer@example.com',lastMeetingAt:'2026-09-19',nextStep:'',championReplied:false,usageChangePct:-50,renewalDate:'2026-11-01',tickets:3},
{id:'technova',name:'TechNova',email:'technova@example.com',lastMeetingAt:'2026-10-02',nextStep:'Schedule adoption review',championReplied:true,usageChangePct:-12,renewalDate:'2026-11-26',tickets:1},
{id:'growthhub',name:'GrowthHub',email:'growthhub@example.com',lastMeetingAt:'2026-10-08',nextStep:'Quarterly business review',championReplied:true,usageChangePct:18,renewalDate:'2027-01-09',tickets:0},
{id:'cloudworks',name:'CloudWorks',email:'cloudworks@example.com',lastMeetingAt:'2026-09-15',nextStep:'',championReplied:false,usageChangePct:-35,renewalDate:'2026-10-23',tickets:2}
];
let aiSelected='acme',aiAnalysis=null,aiCurrentAccount=null,aiLastDecision=null,aiBackend=false;
const aiDateUTC=x=>{const d=new Date(x);return Date.UTC(d.getFullYear(),d.getMonth(),d.getDate());};
const aiDays=(a,b)=>Math.floor((aiDateUTC(b)-aiDateUTC(a))/86400000);
function aiLocalAnalyze(a){let score=0;const evidence=[];const add=(points,signal,value,reason)=>{score+=points;evidence.push({points,signal,value,reason});};const days=aiDays(a.lastMeetingAt,new Date());if(days>=21)add(20,'Last meeting',days+' days ago','No recent meeting is recorded.');else if(days>=14)add(12,'Last meeting',days+' days ago','The last meeting was over two weeks ago.');if(!a.nextStep?.trim())add(20,'Next step','Missing','No follow-up step is recorded.');if(a.championReplied===false)add(20,'Champion reply','No reply recorded','The customer champion has not replied.');const u=Number(a.usageChangePct||0);if(u<=-30)add(25,'Product usage',u+'%','Product usage has dropped sharply.');else if(u<=-15)add(18,'Product usage',u+'%','Product usage is declining.');else if(u<=-5)add(10,'Product usage',u+'%','Product usage is slightly down.');const renewal=-aiDays(a.renewalDate,new Date());if(renewal>=0&&renewal<=45)add(20,'Renewal',renewal+' days away','The renewal is approaching.');else if(renewal>45&&renewal<=90)add(12,'Renewal',renewal+' days away','The renewal is within 90 days.');score=Math.min(score,100);const level=score>=65?'High':score>=35?'Medium':'Low';return {riskScore:score,riskLevel:level,evidence,summary:evidence.length?level+' risk based on '+evidence.map(x=>x.reason.toLowerCase()).join(' '):'No elevated risk signals were found in the available account data.',recommendedAction:level==='High'?'Contact the champion, confirm the renewal plan, and schedule a recovery meeting.':level==='Medium'?'Confirm the next customer touchpoint and update the account plan.':'Continue the current customer cadence and record the next milestone.',emailSubject:'A quick check-in',emailBody:`Hi ${a.name} team,\n\nI wanted to check in and hear how things are going. Are your priorities and upcoming milestones still on track?\n\nIf useful, I would be happy to set up a short conversation and agree on next steps.\n\nBest,\nCustomer Success Team`,provider:'Local fallback'};}
async function aiFetch(url,options){const response=await fetch(url,options);const data=await response.json();if(!response.ok)throw Error(data.error||'Request failed');return data;}
function showAIInsights(){
 $('#content').hidden=true;$('#customer-view').hidden=true;$('#ai-view').hidden=false;$('.topbar h1').textContent='AI Insights';$('.eyebrow-text').textContent='Workspace / AI customer intelligence';$('.actions').hidden=true;
 $$('.nav-item').forEach(a=>{a.removeAttribute('aria-current');if(a.dataset.route==='insights')a.setAttribute('aria-current','page');});
 $('#ai-view').innerHTML=`<div class="ai-panel"><div class="ai-heading"><div><span class="ai-kicker">HAWKEYE INTELLIGENCE</span><h2>AI Customer Intelligence</h2><p>Evidence-based risk analysis, customer outreach, and human approval.</p></div><span id="ai-mode" class="ai-demo">Checking backend…</span></div><label class="ai-label" for="ai-customer">Select Customer</label><select id="ai-customer" class="ai-select"></select><div id="ai-metrics" class="ai-metrics"></div><button type="button" id="ai-analyze" class="ai-analyze">✧ Analyze with AI</button><div id="ai-result" aria-live="polite"></div></div>`;
 const select=$('#ai-customer');AI_ACCOUNTS.forEach(a=>{const option=document.createElement('option');option.value=a.id;option.textContent=a.name;select.append(option);});select.value=aiSelected;
 select.addEventListener('change',e=>{aiSelected=e.target.value;aiAnalysis=null;aiLastDecision=null;drawAIMetrics();$('#ai-result').replaceChildren();});$('#ai-analyze').addEventListener('click',runAIAnalysis);
 drawAIMetrics();refreshAIHistory();aiFetch('/api/accounts').then(data=>{if(Array.isArray(data)){AI_ACCOUNTS.splice(0,AI_ACCOUNTS.length,...data);aiBackend=true;$('#ai-mode').textContent='Backend connected · AI optional';drawAIMetrics();}}).catch(()=>{$('#ai-mode').textContent='Offline mode · Local risk engine';});
}
function drawAIMetrics(){const a=AI_ACCOUNTS.find(x=>x.id===aiSelected);if(!a)return;const days=-aiDays(a.renewalDate,new Date());$('#ai-metrics').innerHTML=`<div><span>Usage trend</span><strong class="${a.usageChangePct<0?'ai-negative':'ai-positive'}">${a.usageChangePct>0?'+':''}${a.usageChangePct}%</strong></div><div><span>Renewal</span><strong>${days>=0?days+' days':'Past due'}</strong></div><div><span>Open tickets</span><strong>${a.tickets}</strong></div>`;}
async function runAIAnalysis(){const button=$('#ai-analyze');button.disabled=true;button.textContent='Analyzing account evidence…';const account=AI_ACCOUNTS.find(x=>x.id===aiSelected);try{let result;try{result=await aiFetch('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({accountId:account.id})});aiBackend=true;}catch{result={account,analysis:aiLocalAnalyze(account)};aiBackend=false;}aiCurrentAccount=result.account;aiAnalysis=result.analysis;aiLastDecision=null;drawAIResult();}finally{button.disabled=false;button.textContent='✧ Analyze with AI';}}
function drawAIResult(){
 const a=aiAnalysis,root=$('#ai-result');
 root.innerHTML=`<div class="ai-results"><div class="ai-risk-heading"><h3>AI Risk Assessment</h3><span class="ai-risk ai-${a.riskLevel.toLowerCase()}">${a.riskLevel.toUpperCase()} RISK · ${a.riskScore}/100</span></div><p id="ai-reason"></p><h4>Risk evidence</h4><ul id="ai-evidence" class="ai-evidence"></ul><div class="ai-action"><h3>Recommended Next Action</h3><p id="ai-action-text"></p></div><div class="ai-email-heading"><h3>AI-Generated Email Draft</h3><span id="ai-provider"></span></div><label class="ai-label" for="ai-subject">Email subject</label><input id="ai-subject" class="ai-select" maxlength="300"><label class="ai-label" for="ai-email">Email body</label><textarea id="ai-email" class="ai-email" rows="9"></textarea><div class="ai-review"><button type="button" class="ai-approve" id="ai-queue">Send draft to Approvals →</button></div><p class="ai-disclaimer">Drafts are queued for manager review. Approve, reject, and edit actions are available only on the Approvals page. No email is sent automatically.</p></div>`;
 $('#ai-reason').textContent=a.summary;$('#ai-action-text').textContent=a.recommendedAction;$('#ai-provider').textContent=a.provider+(a.warning?' · fallback used':'');$('#ai-subject').value=a.emailSubject;$('#ai-email').value=a.emailBody;
 const list=$('#ai-evidence');a.evidence.forEach(e=>{const li=document.createElement('li');li.textContent=`${e.signal}: ${e.value} (+${e.points}) — ${e.reason}`;list.append(li);});if(!a.evidence.length){const li=document.createElement('li');li.textContent='No elevated risk signals.';list.append(li);}
 $('#ai-queue').addEventListener('click',queueAIDraft);
}
function readDrafts(){try{return JSON.parse(localStorage.getItem('hawkeye_pending_drafts')||'[]');}catch{return [];}}
function writeDrafts(items){localStorage.setItem('hawkeye_pending_drafts',JSON.stringify(items));}
async function queueAIDraft(){
 const subject=$('#ai-subject').value.trim(),body=$('#ai-email').value.trim();if(!subject||!body){showToast('error','Missing email details','Enter a subject and body.');return;}
 const draft={id:'draft-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),accountId:aiCurrentAccount.id,accountName:aiCurrentAccount.name,to:aiCurrentAccount.email,subject,body,riskScore:aiAnalysis.riskScore,riskLevel:aiAnalysis.riskLevel,provider:aiAnalysis.provider,createdAt:new Date().toISOString(),status:'PENDING'};
 try{if(aiBackend){const response=await aiFetch('/api/drafts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(draft)});draft.id=response.id;draft.storage='server';}else throw Error('offline');}catch{const drafts=readDrafts();drafts.unshift(draft);writeDrafts(drafts);draft.storage='browser';}
 showToast('success','Draft queued','Open Approvals to review, edit, approve or reject.');go('approvals');
}
async function loadDrafts(){let drafts=readDrafts();try{const remote=await aiFetch('/api/drafts');aiBackend=true;drafts=[...remote,...drafts];}catch{}return drafts;}
async function showApprovals(){
 $('#content').hidden=true;$('#customer-view').hidden=true;$('#ai-view').hidden=false;$('.topbar h1').textContent='Approvals';$('.eyebrow-text').textContent='Workspace / Manager review';$('.actions').hidden=true;
 $$('.nav-item').forEach(a=>{a.removeAttribute('aria-current');if(a.dataset.route==='approvals')a.setAttribute('aria-current','page');});
 $('#ai-view').innerHTML='<div class="ai-panel"><div class="ai-heading"><div><span class="ai-kicker">HUMAN-IN-THE-LOOP</span><h2>Email Approvals</h2><p>Review AI-generated drafts, edit the message, and decide whether to approve or reject.</p></div><span class="ai-demo" id="approval-count">Loading…</span></div><div id="approval-list" aria-live="polite"></div></div>';
 const drafts=await loadDrafts();const pending=drafts.filter(x=>x.status==='PENDING');$('#approval-count').textContent=pending.length+' pending';const target=$('#approval-list');if(!pending.length){target.innerHTML='<div class="approval-empty"><h3>No drafts awaiting approval</h3><p>Go to AI Insights, analyze a customer, and select “Send draft to Approvals”.</p><button class="ai-approve" id="go-insights">Open AI Insights</button></div>';$('#go-insights').onclick=()=>go('insights');return;}
 pending.forEach(d=>{const card=document.createElement('article');card.className='approval-card';card.innerHTML='<div class="approval-card-head"><div><h3></h3><p class="approval-recipient"></p></div><span class="approval-status">PENDING REVIEW</span></div><label class="ai-label">Subject<input class="ai-select approval-subject" maxlength="300"></label><label class="ai-label">Email draft<textarea class="ai-email approval-body" rows="8"></textarea></label><div class="ai-review"><button class="ai-reject approval-reject">Reject</button><button class="ai-approve approval-save">Save edits</button><button class="ai-approve approval-approve">Approve</button></div><p class="approval-feedback" role="status"></p>';
 card.querySelector('h3').textContent=d.accountName;card.querySelector('.approval-recipient').textContent='To: '+d.to+' · Risk: '+d.riskLevel+' ('+d.riskScore+'/100)';card.querySelector('.approval-subject').value=d.subject;card.querySelector('.approval-body').value=d.body;
 const decide=async(status)=>{const subject=card.querySelector('.approval-subject').value.trim(),body=card.querySelector('.approval-body').value.trim();if(!subject||!body){showToast('error','Missing email details','Subject and body are required.');return;}const update={subject,body,status};try{if(d.storage==='server'||(!d.id.startsWith('draft-'))){await aiFetch('/api/drafts/'+encodeURIComponent(d.id),{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(update)});}else{const all=readDrafts(),item=all.find(x=>x.id===d.id);if(item)Object.assign(item,update);writeDrafts(all);}}catch(e){showToast('error','Could not save',e.message);return;}showToast('success',status==='PENDING'?'Changes saved':'Decision recorded',status==='PENDING'?'Draft updated.':status==='APPROVED'?'Approved. No email has been sent.':'Draft rejected.');if(status!=='PENDING')showApprovals();};
 card.querySelector('.approval-save').onclick=()=>decide('PENDING');card.querySelector('.approval-approve').onclick=()=>decide('APPROVED');card.querySelector('.approval-reject').onclick=()=>decide('REJECTED');target.append(card);
 });
}
async function saveAIDecision(status){const subject=$('#ai-subject').value.trim(),body=$('#ai-email').value.trim();if(!subject||!body){showToast('error','Missing email details','Enter both a subject and message.');return;}const record={accountId:aiCurrentAccount.id,accountName:aiCurrentAccount.name,status,subject,body,riskScore:aiAnalysis.riskScore,riskLevel:aiAnalysis.riskLevel,provider:aiAnalysis.provider,createdAt:new Date().toISOString()};try{if(aiBackend){const result=await aiFetch('/api/decisions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(record)});record.id=result.id;}else throw Error('offline');}catch{record.id='offline-'+Date.now();const old=JSON.parse(localStorage.getItem('hawkeye_decisions')||'[]');old.unshift(record);localStorage.setItem('hawkeye_decisions',JSON.stringify(old.slice(0,100)));}aiLastDecision=record;$('#ai-decision').textContent=`${status} · Decision saved ${aiBackend&&record.id&&!record.id.startsWith('offline-')?'on local server':'in this browser'}. No email has been sent.`;$('#ai-decision').className='ai-decision '+(status==='APPROVED'?'ai-decision-yes':'ai-decision-no');$('#ai-send-area').replaceChildren();if(status==='APPROVED'&&aiBackend&&!record.id.startsWith('offline-')){const button=document.createElement('button');button.className='ai-approve';button.textContent='Send approved email';button.addEventListener('click',()=>sendAIEmail(button));$('#ai-send-area').append(button);}refreshAIHistory();showToast('success','Decision saved',status==='APPROVED'?'Approved — sending still requires a separate action.':'Draft rejected.');}
async function sendAIEmail(button){if(!aiLastDecision||aiLastDecision.status!=='APPROVED')return;button.disabled=true;button.textContent='Sending…';try{await aiFetch('/api/decisions/'+encodeURIComponent(aiLastDecision.id)+'/send',{method:'POST'});button.remove();$('#ai-decision').textContent='Email sent successfully. Delivery request recorded.';refreshAIHistory();showToast('success','Email sent','Approved email submitted to delivery provider.');}catch(e){button.disabled=false;button.textContent='Send approved email';showToast('error','Email not sent',e.message);}}
async function refreshAIHistory(){const target=$('#ai-history-list');if(!target)return;let items=[];try{if(aiBackend)items=await aiFetch('/api/history');}catch{}try{items=[...items,...JSON.parse(localStorage.getItem('hawkeye_decisions')||'[]')];}catch{}target.replaceChildren();if(!items.length){target.textContent='No decisions recorded yet.';return;}items.slice(0,12).forEach(item=>{const div=document.createElement('div');div.className='ai-history-row';div.textContent=`${item.accountName} · ${item.status} · ${new Date(item.createdAt).toLocaleString()}`;target.append(div);});}


/* Action History: reviewed drafts, sourced from the same approval records. */
async function showActionHistory(){
  $('#content').hidden=true;
  $('#customer-view').hidden=true;
  $('#ai-view').hidden=false;
  $('.topbar h1').textContent='Action History';
  $('.eyebrow-text').textContent='Workspace / Review audit trail';
  $('.actions').hidden=true;
  $$('.nav-item').forEach(a=>{a.removeAttribute('aria-current');if(a.dataset.route==='history')a.setAttribute('aria-current','page');});
  const root=$('#ai-view');
  root.innerHTML=`<div class="ai-panel history-panel"><div class="ai-heading"><div><span class="ai-kicker">HAWKEYE · DECISION LOG</span><h2>Action History</h2><p>Approved and rejected email drafts from the Approvals workspace. Approval does not mean an email was sent.</p></div><span class="ai-demo" id="history-count">Loading…</span></div><div class="history-summary" id="history-summary"></div><div class="history-controls"><label class="ai-label" for="history-filter">Decision status<select id="history-filter" class="ai-select"><option value="ALL">All decisions</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option></select></label><label class="ai-label" for="history-search">Search customer or email<input id="history-search" class="ai-select" placeholder="Search customer, recipient, subject…"></label></div><div id="history-records" aria-live="polite"></div></div>`;
  let drafts=[];
  try{drafts=await loadDrafts();}catch{}
  // The drafts endpoint retains the complete reviewed email and its final status.
  // Legacy decisions are included for compatibility with earlier versions.
  let legacy=[];
  try{const res=await aiFetch('/api/history');if(Array.isArray(res))legacy=res;}catch{}
  try{const local=JSON.parse(localStorage.getItem('hawkeye_decisions')||'[]');if(Array.isArray(local))legacy.push(...local);}catch{}
  const byId=new Map();
  for(const record of [...legacy,...drafts]){
    if(!['APPROVED','REJECTED','SENT'].includes(record.status))continue;
    const id=String(record.id||'legacy-'+record.accountName+'-'+record.createdAt);
    byId.set(id, {...(byId.get(id)||{}),...record});
  }
  const items=[...byId.values()].sort((a,b)=>new Date(b.updatedAt||b.createdAt||0)-new Date(a.updatedAt||a.createdAt||0));
  const approved=items.filter(x=>x.status==='APPROVED'||x.status==='SENT').length;
  const rejected=items.filter(x=>x.status==='REJECTED').length;
  $('#history-count').textContent=items.length+' reviewed';
  const summary=$('#history-summary');
  for(const [label,count] of [['Total reviewed',items.length],['Approved',approved],['Rejected',rejected]]){
    const card=document.createElement('div');card.className='history-stat';
    const num=document.createElement('strong');num.textContent=count;
    const name=document.createElement('span');name.textContent=label;
    card.append(num,name);summary.append(card);
  }
  const render=()=>{
    const filter=$('#history-filter').value;
    const search=$('#history-search').value.trim().toLowerCase();
    const matching=items.filter(d=>(filter==='ALL'||(filter==='APPROVED'?['APPROVED','SENT'].includes(d.status):d.status==='REJECTED'))&&[d.accountName,d.to,d.subject].some(v=>String(v||'').toLowerCase().includes(search)));
    const target=$('#history-records');target.replaceChildren();
    if(!matching.length){const empty=document.createElement('div');empty.className='approval-empty';empty.textContent=items.length?'No decisions match these filters.':'No approved or rejected emails yet. Review a draft in Approvals to see it here.';target.append(empty);return;}
    matching.forEach(d=>{
      const card=document.createElement('article');card.className='history-record';
      const head=document.createElement('div');head.className='history-record-head';
      const title=document.createElement('div');
      const h=document.createElement('h3');h.textContent=d.accountName||'Customer account';
      const recipient=document.createElement('p');recipient.textContent='To: '+(d.to||'Recipient unavailable');
      title.append(h,recipient);
      const badge=document.createElement('span');badge.className='history-badge '+(d.status==='REJECTED'?'history-rejected':'history-approved');badge.textContent=d.status==='SENT'?'APPROVED · SENT':d.status;
      head.append(title,badge);card.append(head);
      const date=document.createElement('p');date.className='history-date';const when=d.updatedAt||d.createdAt;date.textContent='Decision: '+(when?new Date(when).toLocaleString():'Date unavailable')+(d.riskLevel?' · '+d.riskLevel+' risk':'');card.append(date);
      const subject=document.createElement('p');subject.className='history-subject';subject.textContent='Subject: '+(d.subject||'Not available in legacy record');card.append(subject);
      if(d.body){const details=document.createElement('details');details.className='history-details';const toggle=document.createElement('summary');toggle.textContent='View reviewed email';const body=document.createElement('pre');body.textContent=d.body;details.append(toggle,body);card.append(details);}
      else {const note=document.createElement('p');note.className='history-date';note.textContent='Email body unavailable for this older decision record.';card.append(note);}
      target.append(card);
    });
  };
  $('#history-filter').addEventListener('change',render);
  $('#history-search').addEventListener('input',render);
  render();
}

// Demo logout: clear the current login identity and return to the login screen.
document.getElementById("logout-btn")?.addEventListener("click", () => {
  sessionStorage.removeItem("hawkeye_user");
  window.location.href = "login.html";
});
