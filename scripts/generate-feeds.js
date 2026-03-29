const fs = require('fs');
const path = require('path');
const https = require('https');
const cheerio = require('cheerio');

const X_FALLBACK_FEED_URL = 'https://raw.githubusercontent.com/zarazhangrui/follow-builders/main/feed-x.json';
const REDDIT_REPORT_EN_URL = 'https://raw.githubusercontent.com/liyedanpdx/reddit-ai-trends/main/reports/latest_report_en.md';
const REDDIT_REPORT_ZH_URL = 'https://raw.githubusercontent.com/liyedanpdx/reddit-ai-trends/main/reports/latest_report_zh.md';
const DATA_DIR = path.join(__dirname, '..', 'data');

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function writeJson(filename, value) {
  fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(value, null, 2));
}

function httpsGetText(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0', ...headers } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 400) {
          return reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 300)}`));
        }
        resolve(data);
      });
    }).on('error', reject);
  });
}

async function fetchJson(url) {
  return JSON.parse(await httpsGetText(url));
}

async function fetchText(url) {
  return httpsGetText(url);
}

async function fetchHtml(url) {
  return httpsGetText(url);
}

function truncateText(text, maxLength = 220) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  return normalized.slice(0, maxLength - 1).trimEnd() + '…';
}

function normalizeText(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function normalizeTweetText(text) {
  return String(text || '').replace(/https?:\/\/\S+/g, ' ').replace(/\s+/g, ' ').trim();
}

function titleCaseHeuristic(text, maxLength = 84) {
  const clean = normalizeTweetText(text)
    .replace(/^['"“”]+/, '')
    .replace(/['"“”]+$/, '')
    .trim();
  if (!clean) return 'Untitled signal';

  const sentenceSplit = clean.split(/(?<=[.!?。！？])\s+/)[0] || clean;
  const firstClause = sentenceSplit.split(/\s[-—–:]\s/)[0] || sentenceSplit;
  return truncateText(firstClause, maxLength);
}

function formatRelativeAge(isoString) {
  if (!isoString) return 'recent';
  const ms = Date.now() - new Date(isoString).getTime();
  const hours = Math.max(1, Math.round(ms / (1000 * 60 * 60)));
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function scoreTweet(tweet) {
  const likes = Number(tweet.likes || 0);
  const retweets = Number(tweet.retweets || 0);
  const replies = Number(tweet.replies || 0);
  const createdAt = tweet.createdAt ? new Date(tweet.createdAt).getTime() : Date.now();
  const ageHours = Math.max(1, (Date.now() - createdAt) / (1000 * 60 * 60));
  const text = normalizeTweetText(tweet.text || '');
  const words = text ? text.split(' ').filter(Boolean) : [];
  const wordCount = words.length;
  const uniqueWordCount = new Set(words.map(w => w.toLowerCase().replace(/[^a-z0-9]/gi, ''))).size;
  const uniqueRatio = wordCount > 0 ? uniqueWordCount / wordCount : 0;
  const mentionCount = (text.match(/@[a-zA-Z0-9_]+/g) || []).length;
  const questionCount = (text.match(/\?/g) || []).length;
  const numberCount = (text.match(/\d+/g) || []).length;
  const newlineCount = (String(tweet.text || '').match(/\n/g) || []).length;

  const engagement = likes + retweets * 2 + replies * 1.5;
  const freshnessBoost = Math.max(0, 24 - ageHours) * 0.15;
  const lengthScore = Math.min(12, wordCount * 0.35);
  const uniquenessScore = Math.min(8, uniqueRatio * 10);
  const structureScore = Math.min(4, newlineCount * 0.8) + Math.min(2, questionCount * 0.5) + Math.min(2, numberCount * 0.4);
  const mentionPenalty = Math.max(0, mentionCount - 2) * 1.2;
  return engagement + freshnessBoost + lengthScore + uniquenessScore + structureScore - mentionPenalty;
}

function restoreProtectedTerms(text) {
  return String(text || '')
    .replace(/法学硕士/g, 'LLM')
    .replace(/法学硕士s/g, 'LLMs');
}

async function translateText(text) {
  if (!text || text.trim() === '') return text;
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q=${encodeURIComponent(text)}`;
    const data = JSON.parse(await httpsGetText(url));
    if (data && data[0]) return restoreProtectedTerms(data[0].map(item => item[0]).join(''));
    return restoreProtectedTerms(text);
  } catch {
    return restoreProtectedTerms(text);
  }
}

function parseArgs() {
  const arg = process.argv.find(v => v.startsWith('--only='));
  return { only: arg ? arg.split('=')[1] : null };
}

function baseItem({ id, title, title_zh, description, description_zh, authors, url, score, meta }) {
  return {
    id,
    title,
    title_zh,
    description,
    description_zh,
    authors,
    url,
    score,
    meta: meta || {}
  };
}

function looksMostlyEnglish(text) {
  const value = String(text || '').trim();
  if (!value) return false;
  const asciiLetters = (value.match(/[A-Za-z]/g) || []).length;
  const cjkChars = (value.match(/[\u4e00-\u9fff]/g) || []).length;
  return asciiLetters > 8 && cjkChars < 2;
}

async function buildGitHubFeed() {
  const html = await fetchHtml('https://github.com/trending');
  const $ = cheerio.load(html);
  const articles = $('article.Box-row').toArray();
  const items = [];

  for (let i = 0; i < Math.min(articles.length, 15); i++) {
    const el = articles[i];
    const titleLink = $(el).find('h2.h3 a').first();
    const repoUrl = 'https://github.com' + titleLink.attr('href');
    const repoTitle = titleLink.text().replace(/\s+/g, '').replace(/^\//, '');
    const repoDesc = $(el).find('p.col-9.color-fg-muted').text().trim() || 'No description available';
    const language = $(el).find('span[itemprop="programmingLanguage"]').text().trim() || 'Mixed';
    const starLink = $(el).find('a[href$="/stargazers"]').first();
    const stars = starLink.length > 0 ? starLink.text().trim() : '0';

    const [owner, repo] = repoTitle.split('/');
    items.push(baseItem({
      id: repoTitle.replace(/\//g, '-'),
      title: repo || repoTitle,
      title_zh: repo || repoTitle,
      description: repoDesc,
      description_zh: await translateText(repoDesc),
      authors: owner || repoTitle,
      url: repoUrl,
      score: Number(String(stars).replace(/[^\d.]/g, '') || 0),
      meta: {
        source: 'github',
        stars,
        language,
        repo: repoTitle,
        owner: owner || '',
        repoName: repo || repoTitle
      }
    }));
  }

  return {
    source: 'github',
    updatedAt: new Date().toISOString(),
    count: items.length,
    items
  };
}

async function buildHuggingFaceFeed() {
  const data = await fetchJson('https://huggingface.co/api/daily_papers');
  const items = [];

  for (const item of (Array.isArray(data) ? data.slice(0, 15) : [])) {
    items.push(baseItem({
      id: item.paper.id,
      title: item.paper.title,
      title_zh: await translateText(item.paper.title),
      description: item.paper.summary,
      description_zh: await translateText(item.paper.summary),
      authors: item.paper.authors.map(a => a.name).join(', '),
      url: 'https://huggingface.co/papers/' + item.paper.id,
      score: Number(item.paper.upvotes || 0),
      meta: {
        source: 'huggingface',
        upvotes: String(item.paper.upvotes || 0),
        paperId: item.paper.id
      }
    }));
  }

  return {
    source: 'huggingface',
    updatedAt: new Date().toISOString(),
    count: items.length,
    items
  };
}

async function buildXFeed() {
  const xFeed = await fetchJson(X_FALLBACK_FEED_URL);
  const tweets = (xFeed?.x || [])
    .flatMap(builder => (builder.tweets || []).map(tweet => ({ builder, tweet })))
    .filter(({ tweet }) => tweet && tweet.text && tweet.url)
    .slice(0, 15);

  const items = [];
  for (const { builder, tweet } of tweets) {
    const cleanText = truncateText(tweet.text, 240);
    const title = titleCaseHeuristic(tweet.text, 90);
    const itemScore = Number(scoreTweet(tweet).toFixed(2));
    items.push(baseItem({
      id: tweet.id,
      title,
      title_zh: await translateText(title),
      description: cleanText,
      description_zh: await translateText(cleanText),
      authors: builder.name,
      url: tweet.url,
      score: itemScore,
      meta: {
        source: 'x',
        handle: `@${builder.handle}`,
        bio: truncateText(builder.bio || '', 96),
        likes: String(tweet.likes || 0),
        retweets: String(tweet.retweets || 0),
        replies: String(tweet.replies || 0),
        age: formatRelativeAge(tweet.createdAt),
        createdAt: tweet.createdAt,
        xSource: 'follow-builders'
      }
    }));
  }

  return {
    source: 'x',
    updatedAt: new Date().toISOString(),
    count: items.length,
    mode: 'follow-builders',
    items
  };
}

function extractSection(markdown, heading) {
  const marker = `## ${heading}`;
  const start = markdown.indexOf(marker);
  if (start === -1) return '';
  const afterStart = start + marker.length;
  const rest = markdown.slice(afterStart);
  const next = rest.search(/\n##\s+/);
  if (next === -1) return rest.trim();
  return rest.slice(0, next).trim();
}

function parseMarkdownLink(cell) {
  const m = cell.match(/^\[(.*?)\]\((.*?)\)$/);
  if (!m) return { text: cell.trim(), url: '' };
  return { text: m[1].trim(), url: m[2].trim() };
}

function parseMarkdownTable(section) {
  const lines = section.split('\n').map(l => l.trim()).filter(Boolean);
  const tableLines = lines.filter(l => l.startsWith('|'));
  if (tableLines.length < 3) return [];
  const rows = [];
  for (let i = 2; i < tableLines.length; i++) {
    const line = tableLines[i];
    const cols = line.split('|').slice(1, -1).map(c => c.trim());
    rows.push(cols);
  }
  return rows;
}

function buildRedditMetricsMap(markdown, heading) {
  const table = parseMarkdownTable(extractSection(markdown, heading));
  const map = new Map();
  for (const row of table) {
    const [titleCell, communityCell, score, comments, category, posted] = row;
    const title = parseMarkdownLink(titleCell);
    const community = parseMarkdownLink(communityCell || '');
    map.set(title.url, {
      title: title.text,
      subreddit: community.text,
      subredditUrl: community.url,
      score: String(score || '0'),
      comments: String(comments || '0'),
      category: category || '',
      posted: posted || ''
    });
  }
  return map;
}

function extractSubsection(section, headingRegex) {
  const match = section.match(headingRegex);
  if (!match) return '';
  const start = match.index;
  const rest = section.slice(start);
  const endMatch = rest.slice(match[0].length).match(/\n###\s+\*\*|\n####\s+\*\*\d+\.|\n## /);
  if (!endMatch) return rest;
  return rest.slice(0, match[0].length + endMatch.index);
}

function splitHighlightBlocks(section) {
  const lines = String(section || '').split('\n');
  const blocks = [];
  let current = [];

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (/^\s*-\s+\*\*/.test(line)) {
      if (current.length) blocks.push(current.join('\n').trim());
      current = [line];
      continue;
    }
    if (current.length) current.push(line);
  }

  if (current.length) blocks.push(current.join('\n').trim());
  return blocks;
}

function parseHighlightHeadline(line) {
  const trimmed = String(line || '').trim();
  const patterns = [
    /^-\s+\*\*\[(.*?)\]\((https?:\/\/[^)]+)\)\*\*\s*-?\s*(.*)$/i,
    /^-\s+\*\*\[(.*?)\]\*\*\s*-?\s*(.*)$/i,
    /^-\s+\*\*(.*?)\*\*\s*-?\s*(.*)$/i,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (!match) continue;
    if (pattern === patterns[0]) {
      return {
        title: normalizeText(match[1]),
        url: match[2]?.trim() || '',
        remainder: match[3] || ''
      };
    }
    return {
      title: normalizeText(match[1]),
      url: '',
      remainder: match[2] || ''
    };
  }
  return null;
}

function extractHighlightUrl(block, headingUrl = '') {
  const postLinkMatch = block.match(/(?:Post link:|帖子链接：)\s*\[[^\]]*\]\((https?:\/\/[^)]+)\)/i);
  if (postLinkMatch) return postLinkMatch[1].trim();

  const linkedPostLabel = block.match(/\[Post link\]\((https?:\/\/[^)]+)\)/i);
  if (linkedPostLabel) return linkedPostLabel[1].trim();

  const firstRedditLink = block.match(/https?:\/\/(?:www\.)?reddit\.com\/comments\/[A-Za-z0-9]+/i);
  return (headingUrl || firstRedditLink?.[0] || '').trim();
}

function isWhyItMattersLine(line) {
  return /^(?:[-*]\s*)?\*?Why it matters[:：]/i.test(line) || /^(?:[-*]\s*)?\*?为何重要[:：]/i.test(line);
}

function isPostLinkLine(line) {
  return /^(?:[-*]\s*)?(?:Post link:|帖子链接：)/i.test(line) || /^\[Post link\]\(/i.test(line);
}

function cleanHighlightTitle(text) {
  return normalizeText(String(text || '').replace(/[*_`]/g, ' ').replace(/&nbsp;/g, ' '));
}

function cleanHighlightSummarySegment(text) {
  let cleaned = String(text || '')
    .replace(/^详细内容：/, '')
    .replace(/^What happened:/i, '')
    .replace(/\[Post link\]\((https?:\/\/[^)]+)\)/gi, '')
    .replace(/(?:Post link:|帖子链接：)\s*\[[^\]]*\]\((https?:\/\/[^)]+)\)/gi, '')
    .replace(/\(Score:\s*[\d,]+,\s*Comments:\s*[\d,]+\)\s*$/gi, '')
    .replace(/\*Why it matters[:：]\*.*$/i, '')
    .replace(/为何重要[:：].*$/i, '')
    .replace(/[*_`]/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .trim();

  cleaned = cleaned.replace(/^[-*]\s*/, '').trim();
  return normalizeText(cleaned);
}

function parseHighlightEntries(section) {
  const blocks = splitHighlightBlocks(section);
  const entries = [];
  const seen = new Set();

  for (const block of blocks) {
    const lines = block.split('\n').map(line => line.trim()).filter(Boolean);
    if (!lines.length) continue;

    const headline = parseHighlightHeadline(lines[0]);
    if (!headline) continue;

    const url = extractHighlightUrl(block, headline.url);
    if (!url || seen.has(url)) continue;

    const summaryParts = [];
    const firstLineSummary = cleanHighlightSummarySegment(headline.remainder);
    if (firstLineSummary && !isWhyItMattersLine(firstLineSummary) && !isPostLinkLine(firstLineSummary)) {
      summaryParts.push(firstLineSummary);
    }

    for (const line of lines.slice(1)) {
      if (/^#{3,}\s*/.test(line)) break;
      if (/^-\s+\*\*/.test(line)) continue;
      if (isWhyItMattersLine(line) || isPostLinkLine(line)) continue;
      const cleaned = cleanHighlightSummarySegment(line);
      if (cleaned) summaryParts.push(cleaned);
    }

    seen.add(url);
    entries.push({
      title: cleanHighlightTitle(headline.title),
      url,
      summary: truncateText(normalizeText(summaryParts.join(' ')), 260)
    });
  }

  return entries;
}

async function buildRedditFeed() {
  const [en, zh] = await Promise.all([fetchText(REDDIT_REPORT_EN_URL), fetchText(REDDIT_REPORT_ZH_URL)]);
  if (!en) throw new Error('Could not fetch reddit-ai-trends latest_report_en.md');

  const metricsMap = buildRedditMetricsMap(en, "Today's Trending Posts");
  const enTrend = extractSection(en, 'Trend Analysis');
  const zhTrend = zh ? extractSection(zh, '趋势分析') : '';
  const enHighlights = parseHighlightEntries(enTrend).filter(entry => metricsMap.has(entry.url));
  const zhHighlights = zhTrend ? parseHighlightEntries(zhTrend) : [];
  const zhMap = new Map(zhHighlights.map(entry => [entry.url, entry]));

  const highlightMap = new Map(enHighlights.map(entry => [entry.url, entry]));
  const topRows = Array.from(metricsMap.entries()).slice(0, 10);

  const rawItems = topRows.map(([url, metrics], index) => {
    const highlight = highlightMap.get(url);
    const zhEntry = zhMap.get(url);
    const hasHighlight = Boolean(highlight?.summary);
    const fallbackDescription = `${metrics.title || 'This Reddit thread'} is a high-engagement post in ${metrics.subreddit || 'Reddit'} (category: ${metrics.category || 'Discussion'}, comments: ${metrics.comments || '0'}).`;

    return baseItem({
      id: url.split('/').pop() || `reddit-highlight-${index}`,
      title: highlight?.title || metrics.title || `Reddit Highlight ${index + 1}`,
      title_zh: zhEntry?.title || '',
      description: hasHighlight ? highlight.summary : fallbackDescription,
      description_zh: hasHighlight ? (zhEntry?.summary || '') : '',
      authors: metrics.subreddit || 'Reddit',
      url,
      score: Number(metrics.score || 0),
      meta: {
        source: 'reddit',
        subreddit: metrics.subreddit || '',
        subredditUrl: metrics.subredditUrl || '',
        comments: metrics.comments || '0',
        category: metrics.category || '',
        posted: metrics.posted || '',
        redditSource: 'liyedanpdx/reddit-ai-trends',
        section: hasHighlight ? 'today-highlights' : 'today-table-fallback'
      }
    });
  }).map(item => baseItem(item));

  const items = [];
  for (const item of rawItems) {
    const finalTitleZh = item.title_zh && !looksMostlyEnglish(item.title_zh)
      ? item.title_zh
      : await translateText(item.title);
    const finalDescriptionZh = item.description_zh && !looksMostlyEnglish(item.description_zh)
      ? item.description_zh
      : await translateText(item.description);

    items.push({
      ...item,
      title_zh: finalTitleZh,
      description_zh: finalDescriptionZh
    });
  }

  return {
    source: 'reddit',
    updatedAt: new Date().toISOString(),
    count: items.length,
    mode: 'report-highlights',
    upstream: 'liyedanpdx/reddit-ai-trends',
    items
  };
}

function errorFeed(source, error) {
  return {
    source,
    updatedAt: new Date().toISOString(),
    count: 0,
    mode: 'error',
    error: error.message,
    items: []
  };
}

async function buildSourceSafely(source, builder) {
  try {
    return await builder();
  } catch (error) {
    console.error(`[${source}] failed:`, error.message);
    return errorFeed(source, error);
  }
}

async function main() {
  ensureDataDir();
  const { only } = parseArgs();
  const generatedAt = new Date().toISOString();
  const feedAll = { generatedAt };

  if (!only || only === 'github') {
    const github = await buildSourceSafely('github', buildGitHubFeed);
    writeJson('feed-github.json', github);
    feedAll.github = github;
  }

  if (!only || only === 'huggingface') {
    const huggingface = await buildSourceSafely('huggingface', buildHuggingFaceFeed);
    writeJson('feed-huggingface.json', huggingface);
    feedAll.huggingface = huggingface;
  }

  if (!only || only === 'x') {
    const x = await buildSourceSafely('x', buildXFeed);
    writeJson('feed-x.json', x);
    feedAll.x = x;
  }

  if (!only || only === 'reddit') {
    const reddit = await buildSourceSafely('reddit', buildRedditFeed);
    writeJson('feed-reddit.json', reddit);
    feedAll.reddit = reddit;
  }

  if (!only) writeJson('feed-all.json', feedAll);
  console.log(`Generated feeds${only ? ` (${only})` : ''}.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
