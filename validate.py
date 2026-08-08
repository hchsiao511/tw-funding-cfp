"""Schema validation for data/sources/calls.yaml and tags.yaml.

Used by build.py (both `--check` and normal builds always validate first) and by
.github/workflows/validate.yml on pull requests. Collects every problem before
returning, rather than stopping at the first one, so a contributor doesn't have to
re-run CI once per mistake.
"""
import re
import sys
from datetime import date
from urllib.parse import urlparse

import yaml


class _StringDatesLoader(yaml.SafeLoader):
    """SafeLoader with the implicit timestamp resolver disabled.

    PyYAML normally auto-converts date-like scalars (e.g. `2026-09-21`) into
    datetime.date objects *during parsing*, before our own validation ever runs. That
    means a malformed date like `2026-13-40` crashes with a raw Python traceback deep in
    PyYAML's constructor instead of a clean "ERROR: ... is not a valid date" message.
    Keeping dates as plain strings lets validate() below own all date parsing and error
    reporting, and lets one bad date be reported alongside every other problem in the
    same run instead of aborting the load entirely.
    """


_StringDatesLoader.yaml_implicit_resolvers = {
    first_char: [(tag, regexp) for tag, regexp in resolvers if tag != "tag:yaml.org,2002:timestamp"]
    for first_char, resolvers in yaml.SafeLoader.yaml_implicit_resolvers.items()
}


def load_yaml(path):
    with open(path, encoding="utf-8") as f:
        return yaml.load(f, Loader=_StringDatesLoader)


ID_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
TIME_RE = re.compile(r"^([01]\d|2[0-3]):([0-5]\d)$")
REQUIRED_FIELDS = ["id", "title", "agency", "fields", "types", "eligibility", "stage", "link", "source", "added"]
VALID_SOURCES = {"manual", "nstc-rfp", "ntu-rpa"}
TAG_GROUPS = ["fields", "types", "agencies", "schools", "eligibility", "stages"]


def load_tag_sets(tags_doc):
    """tags.yaml -> {group_name: {tag, ...}} for membership checks."""
    if not isinstance(tags_doc, dict):
        raise ValueError("tags.yaml must be a mapping of group -> list of {tag, name}")
    tag_sets = {}
    for group in TAG_GROUPS:
        entries = tags_doc.get(group) or []
        tag_sets[group] = {e["tag"] for e in entries if isinstance(e, dict) and "tag" in e}
    return tag_sets


def _parse_iso_date(value, field, entry_id, errors):
    if value is None:
        return None
    try:
        return date.fromisoformat(str(value))
    except ValueError:
        errors.append(f"entry {entry_id}: {field} = {value!r} is not a valid ISO date (YYYY-MM-DD)")
        return None


def validate(calls, tags_doc):
    """Returns (errors, warnings), both lists of human-readable strings."""
    errors = []
    warnings = []

    if not isinstance(calls, list):
        return (["calls.yaml must be a top-level YAML list"], [])

    tag_sets = load_tag_sets(tags_doc)

    seen_ids = set()
    seen_dupe_keys = {}

    for entry in calls:
        entry_id = entry.get("id", "<missing id>") if isinstance(entry, dict) else "<non-mapping entry>"

        if not isinstance(entry, dict):
            errors.append(f"entry {entry_id}: must be a mapping, got {type(entry).__name__}")
            continue

        # 2. required fields (deadline handled separately alongside rolling)
        for field in REQUIRED_FIELDS:
            if entry.get(field) in (None, "", []):
                errors.append(f"entry {entry_id}: missing required field '{field}'")

        # 3. id uniqueness + format
        if entry_id in seen_ids:
            errors.append(f"entry {entry_id}: duplicate id")
        seen_ids.add(entry_id)
        if entry_id != "<missing id>" and not ID_RE.match(str(entry_id)):
            errors.append(f"entry {entry_id}: id must match {ID_RE.pattern}")

        # 4. date validity
        opens = _parse_iso_date(entry.get("opens"), "opens", entry_id, errors)
        deadline = _parse_iso_date(entry.get("deadline"), "deadline", entry_id, errors)
        _parse_iso_date(entry.get("added"), "added", entry_id, errors)
        deadline_time = entry.get("deadline_time")
        if deadline_time is not None and not TIME_RE.match(str(deadline_time)):
            errors.append(f"entry {entry_id}: deadline_time = {deadline_time!r} is not HH:MM")

        # 5. opens <= deadline
        if opens is not None and deadline is not None and opens > deadline:
            errors.append(f"entry {entry_id}: opens ({opens}) is after deadline ({deadline})")

        # 6. rolling XOR deadline
        rolling = bool(entry.get("rolling", False))
        has_deadline = entry.get("deadline") is not None
        if not rolling and not has_deadline:
            errors.append(f"entry {entry_id}: must set either 'deadline' or 'rolling: true'")
        elif rolling and has_deadline:
            warnings.append(f"entry {entry_id}: has both 'rolling: true' and a 'deadline' set")

        # 7. link well-formed
        link = entry.get("link")
        if link:
            parsed = urlparse(str(link))
            if parsed.scheme not in ("http", "https") or not parsed.netloc:
                errors.append(f"entry {entry_id}: link {link!r} is not a well-formed http(s) URL")

        # 8. tag membership (hard fail)
        def check_tags(field_name, group_name, required=True):
            values = entry.get(field_name)
            if values is None:
                return
            if isinstance(values, str):
                values = [values]
            for v in values:
                if v not in tag_sets[group_name]:
                    errors.append(
                        f"entry {entry_id}: {field_name} value '{v}' is not registered in "
                        f"tags.yaml's '{group_name}' list"
                    )

        check_tags("fields", "fields")
        check_tags("types", "types")
        check_tags("eligibility", "eligibility")
        check_tags("agency", "agencies")
        check_tags("school", "schools")
        check_tags("stage", "stages")

        # 10. source enum
        source = entry.get("source")
        if source is not None and source not in VALID_SOURCES:
            errors.append(f"entry {entry_id}: source '{source}' must be one of {sorted(VALID_SOURCES)}")

        # 9. soft duplicate warning
        title = str(entry.get("title", "")).strip().lower()
        dupe_key = (entry.get("agency"), title, entry.get("deadline"))
        if title and dupe_key in seen_dupe_keys:
            warnings.append(
                f"entry {entry_id}: looks like a duplicate of {seen_dupe_keys[dupe_key]} "
                f"(same agency, title, and deadline)"
            )
        else:
            seen_dupe_keys[dupe_key] = entry_id

    return errors, warnings


def main():
    try:
        calls = load_yaml("data/sources/calls.yaml")
        tags_doc = load_yaml("data/sources/tags.yaml")
    except yaml.YAMLError as e:
        print(f"ERROR: could not parse YAML: {e}")
        sys.exit(1)

    errors, warnings = validate(calls, tags_doc)
    for w in warnings:
        print(f"WARNING: {w}")
    for e in errors:
        print(f"ERROR: {e}")
    if errors:
        print(f"\n{len(errors)} error(s), {len(warnings)} warning(s).")
        sys.exit(1)
    print(f"OK: {len(calls)} entries valid ({len(warnings)} warning(s)).")


if __name__ == "__main__":
    main()
