# Reporting Workflow

Use this file when generating a daily / weekly / monthly report from `daily-ai-trends`.

## Daily preparation step

Before writing any report:

1. Run `scripts/prepare_daily_snapshot.py`
2. Let the script decide whether to use:
   - the published remote feeds, or
   - a local regeneration fallback
3. Use the archived snapshot under `runtime/archives/YYYY-MM-DD/` as the canonical input for that report

This guarantees that:
- the report is based on one stable snapshot
- remote data older than 8 hours does not silently pass through
- empty providers trigger a local regeneration attempt
- later weekly/monthly rollups can reuse the same dated snapshots

## Translation / summarization rule

When writing Chinese or bilingual reports:
- treat `title` and `description` as the primary semantic source
- treat `title_zh` and `description_zh` only as hints
- do not directly trust `_zh` fields for final wording when precision matters

Preferred approach:
1. Read the English `title` and `description`
2. Understand the actual meaning
3. Write a clean target-language summary
4. Optionally glance at `_zh` only to catch named entities or phrasing hints

## Archive layout

Each daily snapshot is stored under:

```txt
runtime/archives/YYYY-MM-DD/
├── feed-all.json
├── feed-github.json
├── feed-huggingface.json
├── feed-x.json
├── feed-reddit.json
└── manifest.json
```

Use these dated directories as inputs for:
- daily brief
- weekly recap
- monthly recap
- trend comparison across time

## Weekly / monthly extension

For weekly or monthly reports:
- load multiple dated snapshot folders
- compare repeated themes, not just repeated titles
- prioritize durable trends over one-day spikes
- use `manifest.json` to verify whether a snapshot came from remote data or local fallback regeneration
