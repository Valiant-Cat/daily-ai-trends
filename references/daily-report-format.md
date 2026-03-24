# Daily Report Format

Use this file when turning `daily-ai-trends` feeds into a user-facing AI daily report.

## Goal

Produce a concise, high-signal daily report from the published feeds without sounding like a raw data dump.

Priorities:
1. Surface the most important themes first
2. Group related items across sources
3. Keep the report skimmable
4. Always preserve source links when possible

## Language rules

- If the user explicitly asks for **Chinese**, use the Chinese template
- If the user explicitly asks for **English**, use the English template
- If the user asks for a **bilingual** report, write the Chinese version first and the English version second
- If the user does not specify, default to the language of the current conversation
- Do not produce line-by-line translation unless the user explicitly asks for it

## Chinese default template

Use this structure for Chinese daily reports unless the user requests a different format.

```md
# 今日 AI 日报 | YYYY-MM-DD

## 今日主线
- 2-4 条，概括今天最重要的主题

## 值得关注
### 1. <主题或事件>
- 发生了什么
- 为什么重要
- 可选：相关来源（GitHub / HF / X / Reddit）

### 2. <主题或事件>
- 发生了什么
- 为什么重要

## 分源速览
### GitHub
- 1-3 条

### Hugging Face
- 1-3 条

### X / Builder Signals
- 1-3 条

### Reddit
- 1-3 条

## 今日一句话观察
- 1 条简短判断
```

### 中文风格要求

- 更结论导向
- 更压缩
- 少空话
- 不要只是把标题翻译一遍
- 优先回答：今天真正重要的是什么

## English default template

Use this structure for English daily reports unless the user requests a different format.

```md
# AI Daily Brief | YYYY-MM-DD

## Top themes today
- 2-4 bullets summarizing the biggest themes across sources

## What matters
### 1. <theme or event>
- What happened
- Why it matters
- Optional: supporting sources

### 2. <theme or event>
- What happened
- Why it matters

## Signals by source
### GitHub
- 1-3 items

### Hugging Face
- 1-3 items

### X / Builder Signals
- 1-3 items

### Reddit
- 1-3 items

## One-line takeaway
- 1 short editorial takeaway
```

### English style guidance

- Clear and analytical
- Compact, not newsletter-bloated
- Interpret the signal instead of rephrasing titles
- Prefer synthesis over repetition

## Length guidance

### Short version
Use when the user asks for a brief digest or mobile-friendly summary.
- Total length: ~300-600 Chinese characters or ~200-400 English words
- Main themes: 2-3 bullets
- Major themes: 2 max
- Source-by-source section can be compressed heavily

### Standard version
Default choice.
- Total length: ~600-1200 Chinese characters or ~400-800 English words
- Main themes: 3-4 bullets
- Major themes: 2-4 sections
- Source sections: 1-3 items per source when useful

### Long version
Only when the user explicitly wants a detailed report.
- Add more explanation and source context
- Still prefer grouped themes over long flat lists

## Source usage guidance

### GitHub
Best for:
- Open-source project momentum
- New tooling and infrastructure
- Developer workflow changes

When citing GitHub items, emphasize:
- What the project does
- Why it is trending now
- Why a reader should care

### Hugging Face
Best for:
- New papers
- Research direction shifts
- Technical breakthroughs

When citing HF items, avoid copying the abstract verbatim.
Compress into:
- problem
- method
- significance

### X / Builder Signals
Best for:
- Product launches
- Opinionated takes from builders
- Workflow and market signal changes

When citing X items, prioritize:
- original claims
- launches and clear product updates
- strong viewpoints that help interpret the market

### Reddit
Best for:
- Community reaction
- Emerging practical questions
- Evidence that a topic has broader interest beyond launch tweets

When citing Reddit items, frame them as:
- what the community is reacting to
- what developers/users care about
- whether a topic is gaining broader traction

## Links

Preserve links for major items whenever possible.
If the destination format is chat-friendly, attach the link inline with the relevant bullet or heading.

## Minimum quality bar

A finished daily report should answer:
- What mattered today?
- Why did it matter?
- What patterns connect the sources?

If the report does not answer those three questions, rewrite it.
