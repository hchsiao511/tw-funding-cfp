# Contributing a call

Thanks for helping keep this list current! Almost every contribution is a small edit to
one file: `data/sources/calls.yaml`.

## Adding a call

1. Open `data/sources/calls.yaml` and copy the nearest existing entry as a template.
2. Fill in the fields below. Every field marked required must be present.

```yaml
- id: agency-year-short-slug        # required, unique, kebab-case — see "Choosing an id" below
  title: "官方公告的完整標題"           # required
  title_en: null                     # optional English title
  agency: nstc                       # required — who funds it (nstc | ntu | ...), see data/sources/tags.yaml
  school: null                       # optional — which school's portal/deadline this is scoped through, or null
  fields: [cs]                       # required, at least one — see tags.yaml `fields`
  types: [individual]                # required, at least one — the funding *mechanism*
                                      #   (individual/international/travel/industry/...),
                                      #   see tags.yaml `types` and "Choosing `types`" below
  eligibility: [all-faculty]         # required, at least one — see tags.yaml `eligibility`
  stage: proposal                    # required — concept | proposal | rolling
  opens: 2026-07-01                  # optional ISO date (YYYY-MM-DD)
  deadline: 2026-09-01               # required, unless rolling: true
  deadline_time: null                # optional "HH:MM", defaults to 23:59 if omitted
  rolling: false                     # true = no fixed deadline, reviewed continuously
  amount: null                       # optional free text, e.g. "up to NT$3,000,000/year"
  duration: null                     # optional free text, e.g. "2 years"
  link: "https://..."                # required — the official announcement page
  source: manual                     # manual | nstc-rfp | ntu-rpa
  source_id: null                    # optional — the agency's own record id, if known
  requirements: null                 # optional free text — official prerequisites beyond the
                                      #   `eligibility` tags, especially whether this is an
                                      #   "add-on" proposal requiring an existing grant (see
                                      #   "Requirements vs. notes" below)
  notes: null                        # optional freeform context — our own curation caveats
  added: 2026-08-05                  # required — today's date
```

### Requirements vs. notes

Two different optional free-text fields exist for a reason — keep them separate:

- **`requirements`** is what the *official announcement itself* requires beyond the broad
  `eligibility` tags — most importantly, whether this is an add-on/加值 proposal that
  requires the applicant to already hold an existing grant, or a structural rule like
  "must apply jointly with a foreign partner, single-sided applications are rejected."
  Example: `nstc-2027-startup-round1`'s 拔尖案 tier requires a prior, well-performing
  萌芽案 — that's a `requirements` fact, sourced from the official page.
- **`notes`** is *our own* curation commentary — e.g. "NTU relays this with an earlier
  internal sub-deadline than the NSTC-wide one." It's about how this dataset entry relates
  to other entries or sources, not about the call's own application rules.

### Choosing `fields` tags: the CS/IE hierarchy, `other`, and `unrestricted`

`data/sources/tags.yaml`'s `fields` list is a small hierarchy, not a flat bag of tags:

- **`cs`** is the CS/IE domain tag. **`ai`, `security`, `semiconductor`, `iot`** are its
  subfields (`parent: cs`) — tag a call with the most specific one that applies (e.g. a
  call naming 人工智慧/AI or 半導體/semiconductor in its text gets `ai`/`semiconductor`,
  not just bare `cs`). Selecting the CS chip in the UI automatically includes every
  subfield-tagged call too, so you never need to also add bare `cs` alongside a subfield.
  If a call is clearly CS/IE-relevant but doesn't name one of the four subfields, tag it
  bare `cs`. Add a new subfield tag (with `parent: cs`) if a call names a CS/IE area that
  doesn't fit the existing four — that's a `tags.yaml`-only edit.
- **`other`** is the catch-all for everything not CS/IE-relevant (life sciences,
  humanities, nuclear energy, ...). We deliberately don't maintain fine-grained non-CS
  categories right now — put the actual topic in `notes` instead (prose, not a tag) and
  tag the entry `other`.
- **`unrestricted`** means *the call itself names no field restriction* — a CS researcher
  really could apply. **This is easy to over-apply — read this carefully:** NSTC's own
  list-page category column often says "跨領域"/"不分領域" for calls that are *not*
  actually open to any field, but merely span multiple disciplines *within their own,
  specific, non-CS topic*. For example:
  - `nstc-cornet-42` (a Germany joint-research funding mechanism) names no topic at all —
    a CS researcher's proposal is exactly as eligible as anyone else's. **This is
    `unrestricted`.**
  - `nstc-2026-indigenous-research` (原住民族研究專案計畫) is filed under a category that
    includes "跨領域/不分領域" on the list page, but the call is fundamentally about
    indigenous studies — a CS researcher has no real angle into it just because the
    category label mentions 跨領域. **This is `other`, not `unrestricted`.**

  When in doubt: would a CS/IE researcher's proposal, on a CS/IE topic, actually be
  competitive for this specific call? If the announcement names a topic at all (even a
  broad one like "生命科學" or "原住民族研究"), the answer is almost always no — tag
  `other`. Only tag `unrestricted` for calls that are genuinely topic-free administrative
  mechanisms (exchanges, industry-collaboration platforms, society grants, center pilots).

### Choosing `types` tags: the funding mechanism

`types` is a separate axis from `fields` — it answers "what *kind* of funding is this",
not "what subject". A call is usually more than one type at once:

- **`individual`** — a standard PI-led research grant (the largest category: most
  single-topic NSTC calls like `nstc-2026-xenotransplant`).
- **`international`** — any bilateral/multilateral agreement or cross-border mechanism
  (e.g. `nstc-riken-2027-taiwan-japan`, `nstc-cornet-42`).
- **`travel`** — funds personnel movement/visiting research, domestic or international
  (e.g. `ntu-2026-humanities-visiting` is domestic travel; most bilateral *exchange*
  calls like `nstc-has-2027-hungary-exchange` are both `international` and `travel`).
- **`industry`** — industry-academia collaboration or commercialization
  (e.g. `nstc-2027-startup-round1`, `nstc-health-alliance-rolling`).
- **`talent`** — career-development/talent-cultivation programs, independent of subject
  (e.g. `ntu-2026-higher-ed-research-career`).
- **`infrastructure`** — funds setting up a center, lab, or shared facility rather than a
  single research project (e.g. `nstc-mpi-center-pilot`).
- **`outreach`** — academic-society or public-facing science-promotion funding
  (e.g. `nstc-2026-academic-society-outreach`).
- **`mission`** — large mission-specific national projects tied to a fixed deliverable/
  timeline rather than an open research question (e.g. `nstc-2026-formosat-payload`).

If a call is a genuine bilateral research-collaboration grant (not just a travel/exchange
mechanism), tag `international` alone is usually right; add `travel` only if the funding
is explicitly for personnel visits/exchange rather than research costs.

3. **民國 (ROC) → western year**: NSTC and most Taiwan agency pages use ROC years (民國).
   Convert before writing the entry: western year = ROC year + 1911 (e.g. 民國115年 =
   2026, 民國116年 = 2027). Getting this wrong is the single most common mistake — double
   check every date you copy from a source page.
4. If your call needs a `fields`, `types`, `eligibility`, `agency`, or `school` tag that
   doesn't exist yet in `data/sources/tags.yaml`, add it there **in the same PR** — the
   validator hard-fails on unregistered tags on purpose, so the filter UI's vocabulary
   never drifts out of sync with the data.
5. Open a PR. `.github/workflows/validate.yml` runs automatically and must pass before
   merge.

### Choosing an `id`

Format: `<agency>-<year>-<short-slug>`, e.g. `nstc-2026-nano-innovation`. The year is
embedded because NSTC/NTU calls recur annually under near-identical titles — this keeps
ids collision-free across years and lets past (closed) calls stay in the dataset as
history rather than needing renumbering.

### One call, two deadlines (school internal vs. NSTC)

Universities often relay an NSTC call with an earlier internal deadline. Keep **one entry**
per call, not one per deadline:

- `deadline` / `deadline_time` = the **earliest** deadline (usually the school's internal one),
  and set `school` to that school.
- `notes` names the other deadline and links the school's announcement, e.g.
  `"Deadline shown is NTU's internal deadline (2026-12-31 09:00); NSTC-wide deadline is
  2027-01-07. NTU announcement: https://..."`.
- Keep `link`/`source` pointing at the official NSTC page.

A school-scoped entry with no NSTC counterpart on the list page (e.g. `ntu-2027-women-in-science`)
stays as its own entry.

## Previewing your change locally

```bash
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt   # first time only
.venv/bin/python build.py --check   # validates only, does not write data/calls.js
.venv/bin/python build.py           # validates + regenerates data/calls.js
open index.html                     # preview (works via file://, no server needed)
```

## What the validator checks

See `validate.py` for the exact logic. In short: required fields present, `id` is unique
and kebab-case, dates are valid ISO `YYYY-MM-DD`, `opens` isn't after `deadline`, exactly
one of `rolling`/`deadline` is set, `link` is a well-formed URL, every tag used exists in
`tags.yaml`, and `source` is one of the known values. It also warns (without failing) on
likely duplicate entries.

## Updating an existing call

Edit the entry in place (e.g. a deadline extension) rather than adding a new one — unless
it's a genuinely new funding cycle (a new fiscal year), in which case give it a new `id`
with the new year and leave the old entry as historical record.
