# Editorial Rules

Use this file when selecting, deduplicating, and combining items from `daily-ai-trends` feeds.

## Core principle

Do not treat the feeds as four separate lists to dump in order.
Treat them as inputs into a single daily editorial judgment.

## Selection order

Prioritize items in this order:

1. Cross-source themes appearing in multiple feeds
2. Clear launches, releases, or major announcements
3. Strong original viewpoints from builders
4. High-signal research or infrastructure updates
5. Community validation or debate from Reddit

## Deduplication rules

Merge or compress items when they refer to the same underlying topic.

Examples:
- A GitHub repo is trending and the same project is discussed on X
- A new model appears in Hugging Face papers and is debated on Reddit
- An X launch post leads to Reddit discussion on the same product

When deduplicating:
- keep one main section for the topic
- use the strongest source as the lead
- mention other sources as support
- do not repeat the same story as separate top-level items unless the angles are genuinely different

## Role of each source

### GitHub = project signal
Use GitHub to answer:
- What tools or repos are gaining momentum?
- What open-source workflows are surfacing?

### Hugging Face = research signal
Use HF to answer:
- What research directions are advancing?
- Which new methods or model ideas matter?

### X = builder signal
Use X to answer:
- What are builders launching, arguing, or noticing?
- Which workflow or product shifts are happening in real time?

### Reddit = community signal
Use Reddit to answer:
- What are practitioners reacting to?
- What practical concerns or excitement are showing up?
- Which topics have broader community resonance?

## Scoring heuristics for report inclusion

An item is more report-worthy if it has one or more of these properties:
- appears across multiple sources
- contains a concrete release, benchmark, or product change
- clearly changes how people build, ship, or research AI systems
- reveals strong community attention or disagreement
- adds interpretation, not just noise

An item is less report-worthy if it is:
- purely repetitive
- a low-information repost
- a vague personal opinion without useful signal
- a meme or joke with little product/research relevance

## Reducing noise

When a source contains many weak items:
- keep only the strongest 1-2 items
- summarize the rest as a pattern instead of listing them individually

For X specifically:
- prefer original statements over generic promotional posts
- prefer content with a clear claim over pure links
- prefer posts that change understanding, not just awareness

For Reddit specifically:
- do not overweight meme posts unless they clearly reflect an important shift in community sentiment
- use Reddit to validate or contextualize a trend, not to dominate the whole report

## Handling missing or weak sources

If one source is missing, stale, or low quality on a given day:
- continue the report with the other sources
- do not invent missing coverage
- if needed, briefly note that one source was sparse today

## What a good report should feel like

A strong report should feel like:
- curated
- compressed
- interpretable
- useful for someone who wants to understand the day quickly

It should not feel like:
- four unrelated lists stacked together
- a scraped spreadsheet in paragraph form
- a collection of headlines with no synthesis

## Final editor check

Before finalizing, check:
- Did I identify the main themes, not just the loudest items?
- Did I avoid repeating the same story across sections?
- Did I preserve a balance across product, research, and community signals?
- Did I add interpretation instead of just rephrasing titles?
