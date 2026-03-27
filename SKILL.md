---
name: daily-ai-trends
description: Read normalized daily AI trend feeds for GitHub Trending, Hugging Face Daily Papers, X builder signals, and Reddit AI trend reports. Use when an agent needs ready-to-consume AI trend data from public upstream feeds, especially for summaries, briefs, AI daily reports, weekly recaps, or monthly rollups. Includes a preparation workflow that checks remote freshness/completeness, falls back to local regeneration when needed, and archives dated snapshots for later reporting.
---

# daily-ai-trends

Use this repository as the canonical AI trend feed layer.

## Default workflow

For casual reading, use the published remote feeds.

Primary entry point:
- `https://raw.githubusercontent.com/Valiant-Cat/daily-ai-trends/main/data/feed-all.json`

Source-specific feeds:
- `https://raw.githubusercontent.com/Valiant-Cat/daily-ai-trends/main/data/feed-github.json`
- `https://raw.githubusercontent.com/Valiant-Cat/daily-ai-trends/main/data/feed-huggingface.json`
- `https://raw.githubusercontent.com/Valiant-Cat/daily-ai-trends/main/data/feed-x.json`
- `https://raw.githubusercontent.com/Valiant-Cat/daily-ai-trends/main/data/feed-reddit.json`

For report generation, do **not** read the remote feeds directly as the final input. Run:

```bash
python3 scripts/prepare_daily_snapshot.py
```

This script:
- checks whether remote `feed-all.json` is fresh enough (default: within 8 hours)
- checks whether `github`, `huggingface`, `x`, and `reddit` all contain data
- falls back to local `npm run generate` if the remote snapshot is stale or incomplete
- archives the final chosen snapshot under `runtime/archives/YYYY-MM-DD/`

## Use this skill for

- Reading current AI trend data
- Powering downstream apps, bots, dashboards, or summaries
- Pulling source-specific trend items without reimplementing collection logic
- Accessing normalized multi-source AI trend data in one place
- Generating AI daily / weekly / monthly reports from stable dated snapshots

## Source notes

- **GitHub**: trending repositories
- **Hugging Face**: daily papers
- **X**: public `follow-builders` feed
- **Reddit**: latest report markdown from `liyedanpdx/reddit-ai-trends`

Treat this repository as a normalized aggregation layer, not the final editorial output.

## Reporting rules

When generating a report:
- Read `references/daily-report-format.md` for the output structure
- Read `references/editorial-rules.md` for selection, deduplication, and synthesis rules
- Read `references/reporting-workflow.md` for snapshot preparation, archive usage, and weekly/monthly extension
- Prefer theme grouping over source-by-source dumping
- Use the feeds as inputs to editorial judgment, not as a final report

## Language / translation rule

When writing in Chinese or another non-English language:
- use `title` and `description` as the primary semantic source
- treat `title_zh` and `description_zh` only as hints
- do not directly trust `_zh` fields when accuracy matters

Preferred workflow:
1. Understand the English `title` and `description`
2. Write a clean summary in the target language
3. Check `_zh` only as an auxiliary hint for names or phrasing

## Snapshot archive rule

Every report run should leave behind a dated snapshot directory under:

```txt
runtime/archives/YYYY-MM-DD/
```

This archive is the basis for:
- same-day report reproducibility
- weekly rollups
- monthly rollups
- historical comparisons across multiple days

## When using the feeds

- Prefer `feed-all.json` unless you only need one source
- Preserve stable field names when building downstream consumers
- Check source-specific metadata such as `mode`, `count`, or `updatedAt`
- Keep upstream attribution intact when reusing upstream-derived content
- For reporting, prefer archived dated snapshots over ad-hoc live reads
