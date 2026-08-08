// --- CONSTANTS ---
const CLOSING_SOON_DAYS = 14;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// --- TAG LABEL LOOKUPS (built once from window.TAGS) ---
let TAG_NAME = { fields: {}, org: {}, eligibility: {}, stages: {} };

function buildTagNameLookups(tags) {
  const toMap = (list) => Object.fromEntries((list || []).map((e) => [e.tag, e.name]));
  TAG_NAME.fields = toMap(tags.fields);
  TAG_NAME.org = toMap(buildOrgTagList(tags));
  TAG_NAME.eligibility = toMap(tags.eligibility);
  TAG_NAME.stages = toMap(tags.stages);
}

// --- DEADLINE MATH ---
// Anchored to Asia/Taipei (+08:00) regardless of the viewer's own timezone, matching
// the schema's implicit-Taipei-time convention (see data/sources/calls.yaml).
function deadlineDate(entry) {
  if (!entry.deadline) return null;
  const time = entry.deadline_time || "23:59";
  return new Date(`${entry.deadline}T${time}:00+08:00`);
}

// Calendar-day difference in Taipei terms, not a fractional-hours calculation — a
// deadline of "today" must count as 0 days regardless of what time it is right now,
// and "yesterday" must always count as negative. (A raw `(date - now) / MS_PER_DAY`
// rounded with Math.ceil gets this wrong: a deadline that passed a few hours ago
// rounds to 0, not negative, and misclassifies a closed call as still open.)
function taipeiDayKey(date) {
  const shifted = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  return Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate());
}

function daysUntil(entry) {
  const [y, m, d] = entry.deadline.split("-").map(Number);
  const deadlineKey = Date.UTC(y, m - 1, d);
  return Math.round((deadlineKey - taipeiDayKey(new Date())) / MS_PER_DAY);
}

function classifyEntry(entry) {
  if (entry.rolling) return "rolling";
  if (!entry.deadline) return "open"; // shouldn't happen once validate.py has run, but don't crash rendering
  const days = daysUntil(entry);
  if (days < 0) return "closed";
  if (days <= CLOSING_SOON_DAYS) return "closing-soon";
  return "open";
}

function formatDeadline(entry) {
  if (entry.rolling) return "常態受理 · 隨時受理";
  const days = daysUntil(entry);
  const dateLabel = entry.deadline + (entry.deadline_time ? ` ${entry.deadline_time}` : "");
  if (days < 0) return `${dateLabel} · 已截止 (${-days} 天前)`;
  if (days === 0) return `${dateLabel} · 今天截止`;
  return `${dateLabel} · 剩 ${days} 天`;
}

// --- RENDER ---
function chipList(tags, values) {
  return (values || [])
    .map((v) => `<span class="tag-chip">${escapeHtml(tags[v] || v)}</span>`)
    .join("");
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function renderRow(entry, stateClass) {
  // agency and school can be the same tag (e.g. an NTU-internal call has both
  // agency: ntu and school: ntu) — dedupe so the chip isn't shown twice.
  const orgValues = Array.from(new Set([entry.agency, entry.school].filter(Boolean)));
  const amount = entry.amount ? `<span class="amount-badge">${escapeHtml(entry.amount)}</span>` : "";
  // "requirements" (official prerequisites, e.g. "must hold an existing grant") is kept
  // visually distinct from "notes" (our own curation caveats, e.g. an NTU sub-deadline).
  const requirements = entry.requirements
    ? `<p class="call-requirements"><strong>資格要求：</strong>${escapeHtml(entry.requirements)}</p>`
    : "";
  const notes = entry.notes ? `<p class="call-notes">${escapeHtml(entry.notes)}</p>` : "";
  return `
    <article class="call-row ${stateClass}">
      <div class="call-deadline">
        <span class="deadline-text">${escapeHtml(formatDeadline(entry))}</span>
        <span class="stage-badge">${escapeHtml(TAG_NAME.stages[entry.stage] || entry.stage)}</span>
        ${amount}
      </div>
      <div class="call-body">
        <a class="call-title" href="${escapeHtml(entry.link)}" target="_blank" rel="noopener">
          ${escapeHtml(entry.title)}
        </a>
        <div class="tag-row">
          ${chipList(TAG_NAME.org, orgValues)}
          ${chipList(TAG_NAME.fields, entry.fields)}
          ${chipList(TAG_NAME.eligibility, entry.eligibility)}
        </div>
        ${requirements}
        ${notes}
      </div>
    </article>`;
}

function renderSection(title, entries, stateClass, { collapsed = false } = {}) {
  if (entries.length === 0) return "";
  const rows = entries.map((e) => renderRow(e, stateClass)).join("");
  const heading = `<h2>${escapeHtml(title)} (${entries.length})</h2>`;
  if (!collapsed) return `<section class="call-section">${heading}${rows}</section>`;
  return `
    <details class="call-section call-section-collapsed">
      <summary>${escapeHtml(title)} (${entries.length})</summary>
      ${rows}
    </details>`;
}

function renderList() {
  const matching = (window.CALLS || []).filter(rowMatchesFilters);

  const buckets = { open: [], rolling: [], closed: [] };
  for (const entry of matching) {
    const cls = classifyEntry(entry);
    if (cls === "rolling") buckets.rolling.push(entry);
    else if (cls === "closed") buckets.closed.push(entry);
    else buckets.open.push({ entry, cls }); // 'open' or 'closing-soon'
  }

  buckets.open.sort((a, b) => deadlineDate(a.entry) - deadlineDate(b.entry));
  buckets.rolling.sort((a, b) => a.title.localeCompare(b.title));
  buckets.closed.sort((a, b) => deadlineDate(b) - deadlineDate(a)); // most-recently-closed first

  const container = document.getElementById("call-list");
  const openRows = buckets.open
    .map(({ entry, cls }) => renderRow(entry, cls))
    .join("");
  const openSection = buckets.open.length
    ? `<section class="call-section"><h2>徵求中 Open (${buckets.open.length})</h2>${openRows}</section>`
    : "";

  container.innerHTML =
    openSection +
    renderSection("常態受理 Rolling", buckets.rolling, "rolling") +
    renderSection("已截止 Closed", buckets.closed, "closed", { collapsed: true });

  if (matching.length === 0) {
    container.innerHTML = `<p class="empty-state">沒有符合篩選條件的計畫。試著取消一些篩選標籤。</p>`;
  }

  document.getElementById("result-count").textContent =
    `顯示 ${matching.length} / ${(window.CALLS || []).length} 筆計畫`;
}

// --- LAST UPDATED ---
// Derived from the freshest `added` (curation date) across all entries, not a build
// timestamp — this tells a visitor how recently the dataset itself was actually checked
// against the official sites, which matters more than when the site was last deployed.
function renderLastUpdated() {
  const dates = (window.CALLS || []).map((e) => e.added).filter(Boolean);
  if (dates.length === 0) return;
  const latest = dates.reduce((a, b) => (a > b ? a : b));
  document.getElementById("last-updated").textContent = `資料最後更新：${latest}`;
}

// --- BOOTSTRAP ---
document.addEventListener("DOMContentLoaded", () => {
  buildTagNameLookups(window.TAGS || {});
  loadFiltersFromUrl();
  buildFilterBar(window.TAGS || {});
  renderList();
  renderLastUpdated();
});
