// --- FILTER STATE ---
// Three filter groups, each a Set of active tags. "org" merges tags.yaml's `agencies`
// and `schools` lists (a call's agency and school are matched as one combined axis —
// e.g. clicking "NTU" should surface both NTU-funded calls and NSTC calls relayed
// through NTU's portal).
const ACTIVE_FILTERS = {
  field: new Set(),
  org: new Set(),
  eligibility: new Set(),
};

const URL_PARAM_BY_GROUP = { field: "field", org: "org", eligibility: "eligibility" };

// Field tags marked `unrestricted: true` in tags.yaml (currently just "unrestricted"
// itself) impose no field restriction on the call — a generic bilateral exchange program
// names no topic, so it matches every field filter. This is deliberately narrow: it must
// NOT be inferred from a broad "interdisciplinary"-sounding category, since NSTC's own
// 跨領域 label also covers calls that are topically specific but merely span multiple
// disciplines within their own subject (e.g. indigenous studies) — those get `other`,
// not `unrestricted`. See CONTRIBUTING.md.
let UNRESTRICTED_FIELD_TAGS = new Set();

// `parent: cs` tags (ai/security/semiconductor/iot) are CS/IE subfields — selecting the
// `cs` domain chip should also surface every entry tagged with one of its children, not
// just entries tagged bare `cs`. Maps childTag -> parentDomainTag.
let FIELD_PARENT = {};

function buildFieldHierarchy(tags) {
  const fields = tags.fields || [];
  UNRESTRICTED_FIELD_TAGS = new Set(fields.filter((t) => t.unrestricted).map((t) => t.tag));
  FIELD_PARENT = Object.fromEntries(fields.filter((t) => t.parent).map((t) => [t.tag, t.parent]));
}

// --- BUILD ORG TAG DICTIONARY (agencies ∪ schools, schools' names win on tag collision) ---
function buildOrgTagList(tags) {
  const byTag = new Map();
  for (const entry of tags.agencies || []) byTag.set(entry.tag, entry.name);
  for (const entry of tags.schools || []) byTag.set(entry.tag, entry.name);
  return Array.from(byTag, ([tag, name]) => ({ tag, name }));
}

// --- URL SYNC ---
function loadFiltersFromUrl() {
  const params = new URLSearchParams(location.search);
  for (const [group, paramName] of Object.entries(URL_PARAM_BY_GROUP)) {
    const raw = params.get(paramName);
    if (!raw) continue;
    raw.split(",").filter(Boolean).forEach((tag) => ACTIVE_FILTERS[group].add(tag));
  }
}

function syncUrlFromFilters() {
  const params = new URLSearchParams();
  for (const [group, paramName] of Object.entries(URL_PARAM_BY_GROUP)) {
    if (ACTIVE_FILTERS[group].size > 0) {
      params.set(paramName, Array.from(ACTIVE_FILTERS[group]).join(","));
    }
  }
  const query = params.toString();
  const newUrl = location.pathname + (query ? `?${query}` : "");
  try {
    // Some browsers (and file:// origins in particular) can reject replaceState.
    // The shareable-URL feature is a nice-to-have — it must never take down filtering.
    history.replaceState(null, "", newUrl);
  } catch (e) {
    console.warn("could not update URL with active filters:", e);
  }
}

// --- CHIP UI ---
function buildFilterBar(tags) {
  buildFieldHierarchy(tags);
  const bar = document.getElementById("filter-bar");
  bar.innerHTML = "";
  bar.appendChild(buildFieldFilterGroup(tags.fields || []));
  bar.appendChild(buildFilterGroup("org", "補助 / 學校 Agency / School", buildOrgTagList(tags)));
  bar.appendChild(buildFilterGroup("eligibility", "資格 Eligibility", tags.eligibility || []));
}

function buildChip(group, tag, name) {
  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = "chip";
  chip.textContent = name;
  chip.dataset.group = group;
  chip.dataset.tag = tag;
  chip.setAttribute("aria-pressed", ACTIVE_FILTERS[group].has(tag) ? "true" : "false");
  if (ACTIVE_FILTERS[group].has(tag)) chip.classList.add("active");
  chip.addEventListener("click", () => toggleChip(group, tag, chip));
  return chip;
}

function buildFilterGroup(group, label, tagList) {
  const wrap = document.createElement("div");
  wrap.className = "filter-group";

  const heading = document.createElement("span");
  heading.className = "filter-group-label";
  heading.textContent = label;
  wrap.appendChild(heading);

  const chips = document.createElement("div");
  chips.className = "filter-chips";
  for (const { tag, name } of tagList) chips.appendChild(buildChip(group, tag, name));
  wrap.appendChild(chips);
  return wrap;
}

// The Field group is rendered as three visually distinct clusters rather than one flat
// chip row: CS/IE (the `cs` domain tag plus its `parent: cs` subfields), Other (every
// other non-unrestricted field tag), and Any Field (tags.yaml's `unrestricted` tags).
// This keeps the CS-specific subfields visually grouped as a hierarchy instead of mixed
// in with unrelated categories.
function buildFieldFilterGroup(fields) {
  const wrap = document.createElement("div");
  wrap.className = "filter-group";

  const heading = document.createElement("span");
  heading.className = "filter-group-label";
  heading.textContent = "領域 Field";
  wrap.appendChild(heading);

  const csCluster = fields.filter((t) => t.tag === "cs" || t.parent === "cs");
  const unrestrictedCluster = fields.filter((t) => t.unrestricted);
  const otherCluster = fields.filter((t) => !csCluster.includes(t) && !unrestrictedCluster.includes(t));

  const clusters = document.createElement("div");
  clusters.className = "field-clusters";
  clusters.appendChild(buildFieldCluster("資訊工程 CS / IE", csCluster));
  clusters.appendChild(buildFieldCluster("其他領域 Other", otherCluster));
  clusters.appendChild(buildFieldCluster("不限領域 Any Field", unrestrictedCluster));
  wrap.appendChild(clusters);
  return wrap;
}

function buildFieldCluster(label, tagList) {
  const cluster = document.createElement("div");
  cluster.className = "field-cluster";

  const subLabel = document.createElement("span");
  subLabel.className = "field-cluster-label";
  subLabel.textContent = label;
  cluster.appendChild(subLabel);

  const chips = document.createElement("div");
  chips.className = "filter-chips";
  for (const { tag, name } of tagList) chips.appendChild(buildChip("field", tag, name));
  cluster.appendChild(chips);
  return cluster;
}

function toggleChip(group, tag, chipEl) {
  const set = ACTIVE_FILTERS[group];
  if (set.has(tag)) {
    set.delete(tag);
    chipEl.classList.remove("active");
    chipEl.setAttribute("aria-pressed", "false");
  } else {
    set.add(tag);
    chipEl.classList.add("active");
    chipEl.setAttribute("aria-pressed", "true");
  }
  syncUrlFromFilters();
  renderList();
}

// --- MATCHING ---
// AND across groups, OR within a group: a row passes a group if that group has no
// active tags, or if the row's values for that group intersect the active set.
function rowMatchesFilters(entry) {
  return (
    fieldGroupMatches(ACTIVE_FILTERS.field, entry.fields) &&
    groupMatches(ACTIVE_FILTERS.org, [entry.agency, entry.school].filter(Boolean)) &&
    groupMatches(ACTIVE_FILTERS.eligibility, entry.eligibility)
  );
}

function groupMatches(activeSet, rowValues) {
  if (activeSet.size === 0) return true;
  return (rowValues || []).some((v) => activeSet.has(v));
}

// Field group has two extra rules on top of groupMatches:
// 1. Child -> parent: a row tagged with a CS subfield (ai/security/semiconductor/iot)
//    also matches when the `cs` domain chip is active, even without a literal `cs` tag.
//    This does NOT run in reverse — selecting a specific subfield chip stays narrow and
//    does not match a row tagged only with the broader `cs` domain.
// 2. Unrestricted: a row tagged `unrestricted` (see UNRESTRICTED_FIELD_TAGS above)
//    matches every field filter, since the call itself imposes no field restriction.
function fieldGroupMatches(activeSet, rowFields) {
  if (activeSet.size === 0) return true;
  const rf = rowFields || [];
  if (groupMatches(activeSet, rf)) return true;
  if (rf.some((v) => FIELD_PARENT[v] && activeSet.has(FIELD_PARENT[v]))) return true;
  return rf.some((v) => UNRESTRICTED_FIELD_TAGS.has(v));
}
