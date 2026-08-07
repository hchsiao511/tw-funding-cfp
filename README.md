# 台灣研究計畫徵求彙整 (Taiwan Funding CFP Tracker) — north star

A public, git-collaborative aggregator of Taiwan research-funding calls — NSTC (國科會)
program solicitations, university research-office announcements — filterable by field,
agency/school, and eligibility, modeled on
[sec-deadlines.github.io](https://sec-deadlines.github.io). Contributions are hand-curated
via pull request against a single YAML data file, the same way sec-deadlines takes PRs
against its conference-deadline dataset.

**Live at <https://hchsiao511.github.io/tw-funding-cfp/>** · repo:
<https://github.com/hchsiao511/tw-funding-cfp>

## What it is

- A single static page (`index.html`) listing funding calls sorted by deadline, with
  tag-chip filters and "closing soon / closed / rolling" visual states computed at render
  time (never hand-maintained as a status field).
- A YAML dataset (`data/sources/calls.yaml`) that anyone can extend via PR — see
  `CONTRIBUTING.md`. CI (`.github/workflows/validate.yml`) validates schema on every PR.
- Deployed to GitHub Pages, rebuilt by `.github/workflows/deploy.yml` on every merge to
  `main`.

## What it is not (yet)

- Not automated. MVP data ingestion is fully manual curation — no scraping or RSS polling,
  even though NSTC exposes a feed at `/folksonomy/rss?l=ch`. The schema (`source`,
  `source_id` fields) is designed so automated ingestion can be added later without a
  rewrite, but it isn't built yet.
- Not multi-school or multi-field yet. MVP scope is NSTC + NTU (臺灣大學), CS-adjacent
  fields. The `agency`/`school`/`fields`/`eligibility` axes are open-vocabulary tags
  precisely so a second school or a non-CS field is a `data/sources/tags.yaml` edit, not a
  schema or code change.

## Origin (frozen)

Created 2026-08-05, growing out of an idea-stage placeholder from 2026-07-04
("製作一個網站，綜整國科會等各部會的各式計畫申請補助，方便查詢"). The problem being
solved: Taiwanese academics currently track funding calls through email blasts and
bulletin-board-style agency pages, where the details that actually matter — deadline,
eligibility, field, amount — are buried inside a linked PDF or detail page, so nothing is
scannable or filterable in one place. Modeled explicitly on sec-deadlines.github.io's
data-file-plus-PR collaboration model rather than building a scraper, since manual curation
plus open collaboration was judged more sustainable for a small volunteer-run dataset than
fragile per-agency scrapers. Decisions at inception: public GitHub repo + GitHub Pages from
day one (not developed privately first), fully manual MVP data ingestion, plain
HTML/CSS/JS frontend with a small Python build script (no framework, no Node toolchain) —
consistent with this workspace's other static sites (`research/website`, `tools/siohsioh`).
