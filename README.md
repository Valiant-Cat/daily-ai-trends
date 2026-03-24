[English](README.md) | [中文](README_CN.md)

# daily-ai-trends

A daily AI trends feed layer covering:
- GitHub Trending
- Hugging Face Daily Papers
- X builder signals
- Reddit AI trend reports

## Overview

`daily-ai-trends` is a reusable data/feed layer for AI trend discovery.
It is designed to support websites, bots, dashboards, digests, and agent workflows that need normalized AI trend data from multiple upstream sources.

- **For humans:** one example consumer is **https://echo.xbreak.ai/**
- **For AI agents:** this repo can be consumed via the bundled `SKILL.md`

The goal is to separate **trend collection** from **trend presentation**.
Downstream consumers can read normalized JSON feeds from this repo without owning source-specific scraping, parsing, or aggregation logic.

## Data sources

This project currently builds normalized feeds from:

- **GitHub** — GitHub Trending page
- **Hugging Face** — Daily Papers API
- **X** — public `follow-builders` feed
- **Reddit** — latest report artifacts from `liyedanpdx/reddit-ai-trends`

This repository is intentionally focused on feed generation and normalization. Product-level fallback logic, UI decisions, and presentation strategies are better handled by downstream consumers.

## Attribution

This project builds on or consumes outputs from the following upstream/open projects:

- **follow-builders** by Zara Zhang Rui  
  Repo: https://github.com/zarazhangrui/follow-builders
- **reddit-ai-trends** by Liyedan PDX  
  Repo: https://github.com/liyedanpdx/reddit-ai-trends

If you reuse this project or redistribute its generated feeds, please keep appropriate attribution—especially where upstream-derived data is preserved.

## License

This project is released under the **MIT License**. See [LICENSE](./LICENSE).

Note that upstream data sources and integrated projects may carry their own licenses and attribution requirements. Reuse should respect both this repository's MIT license and any applicable upstream terms.

## Generated outputs

Generated feed files live under `data/`:

- `feed-github.json`
- `feed-huggingface.json`
- `feed-x.json`
- `feed-reddit.json`
- `feed-all.json`

## Local usage

```bash
npm install
npm run generate
```

## GitHub Actions

The included workflow generates feeds daily and commits updated JSON files back to the repository.
