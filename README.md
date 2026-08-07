# 台灣研究計畫徵求彙整 (Taiwan Funding CFP Tracker)

A public, git-collaborative aggregator of Taiwan research-funding calls — NSTC (國科會)
program solicitations, university research-office announcements — filterable by field,
agency/school, and eligibility, modeled on
[sec-deadlines.github.io](https://sec-deadlines.github.io). Contributions are hand-curated
via pull request against a single YAML data file, the same way sec-deadlines takes PRs
against its conference-deadline dataset.

**Live at <https://hchsiao511.github.io/tw-funding-cfp/>**

## Why

Taiwanese academics currently track funding calls through email blasts and bulletin-
board-style agency pages, where the details that actually matter — deadline, eligibility,
field, amount — are buried inside a linked PDF or detail page, so nothing is scannable or
filterable in one place. This site aggregates them into a single filterable list, kept
current through open community contributions rather than a fragile per-agency scraper.

## What it is

- A single static page (`index.html`) listing funding calls sorted by deadline, with
  tag-chip filters and "closing soon / closed / rolling" visual states computed at render
  time (never hand-maintained as a status field).
- A YAML dataset (`data/sources/calls.yaml`) that anyone can extend via PR — see
  `CONTRIBUTING.md`. CI (`.github/workflows/validate.yml`) validates schema on every PR.
- Deployed to GitHub Pages, rebuilt by `.github/workflows/deploy.yml` on every push to
  `main`.

## What it is not (yet)

- Not automated. Data is fully manually curated — no scraping or RSS polling, even though
  NSTC exposes a feed at `/folksonomy/rss?l=ch`. The schema (`source`, `source_id` fields)
  is designed so automated ingestion could be added later without a rewrite.
- Not multi-school or multi-field yet. Current scope is NSTC + NTU (臺灣大學), CS/IE-
  relevant fields. The `agency`/`school`/`fields`/`eligibility` axes are open-vocabulary
  tags precisely so a second school or a new field domain is a `data/sources/tags.yaml`
  edit, not a schema or code change.

## Contributing

See `CONTRIBUTING.md` for the data schema and how to add or update a call.

## License

MIT — see `LICENSE`.
