---
name: daily-ai-trends
description: Read normalized daily AI trend feeds for GitHub Trending, Hugging Face Daily Papers, X builder signals, and Reddit AI trend reports. Use when an agent needs ready-to-consume AI trend data from public upstream feeds without rebuilding the data locally, especially for summaries, briefs, or AI daily reports.
---

# daily-ai-trends

Use this repository as a **published feed source**.

## Default behavior

Read the already-published feeds directly from the canonical raw GitHub URLs.

Primary entry point:
- `https://raw.githubusercontent.com/Valiant-Cat/daily-ai-trends/main/data/feed-all.json`

Source-specific feeds:
- `https://raw.githubusercontent.com/Valiant-Cat/daily-ai-trends/main/data/feed-github.json`
- `https://raw.githubusercontent.com/Valiant-Cat/daily-ai-trends/main/data/feed-huggingface.json`
- `https://raw.githubusercontent.com/Valiant-Cat/daily-ai-trends/main/data/feed-x.json`
- `https://raw.githubusercontent.com/Valiant-Cat/daily-ai-trends/main/data/feed-reddit.json`

## Use this skill for

- Reading current AI trend data
- Powering downstream apps, bots, dashboards, or summaries
- Pulling source-specific trend items without reimplementing collection logic
- Accessing normalized multi-source AI trend data in one place
- Generating AI daily reports from the published feeds

## Source notes

- **GitHub**: trending repositories
- **Hugging Face**: daily papers
- **X**: public `follow-builders` feed
- **Reddit**: latest report markdown from `liyedanpdx/reddit-ai-trends`

Treat this repository as a normalized aggregation layer.

## For AI daily reports

When generating a daily report from these feeds:
- Read `references/daily-report-format.md` for the recommended report structure
- Read `references/editorial-rules.md` for selection, deduplication, and synthesis rules
- Prefer theme grouping over source-by-source dumping
- Use the feeds as inputs to editorial judgment, not as a final report

## When using the feeds

- Prefer `feed-all.json` unless you only need one source
- Preserve stable field names when building downstream consumers
- Check source-specific metadata such as `mode`, `count`, or `updatedAt` when available
- Keep upstream attribution intact when reusing upstream-derived content
