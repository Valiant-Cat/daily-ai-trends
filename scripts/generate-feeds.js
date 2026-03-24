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
  try {
    return JSON.parse(await httpsGetText(url));
  } catch {
    return null;
  }
}

async function fetchText(url) {
  try {
    return await httpsGetText(url);
  } catch {
    return null;
  }
}

async function fetchHtml(url) {
  return httpsGetText(url);
}

function truncateText(text, maxLength = 220) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  return normalized.slice(0, maxLength - 1).trimEnd() + '…';
}

function formatRelativeAge(isoString) {
  if (!isoString) return 'recent';
  const ms = Date.now() - new Date(isoString).getTime();
  const hours = Math.max(1, Math.round(ms / (1000 * 60 * 60)));
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function normalizeTweetText(text) {
  return String(text || '').replace(/https?:\/\/\S+/g, ' ').replace(/\s+/g, ' ').trim();
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

async function translateText(text) {
  if (!text || text.trim() === '') return text;
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q=${encodeURIComponent(text)}`;
    const data = await fetchJson(url);
    if (data && data[0]) return data[0].map(item => item[0]).join('');
    return text;
  } catch {
    return text;
  }
}

function parseArgs() {
  const arg = process.argv.find(v => v.startsWith('--only='));
  return { only: arg ? arg.split('=')[1] : null };
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

    items.push({
      id: repoTitle.replace(/\//g, '-'),
      title: repoTitle,
      title_zh: repoTitle,
      description: repoDesc,
      description_zh: await translateText(repoDesc),
      url: repoUrl,
      stars,
      language
    });
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
    items.push({
      id: item.paper.id,
      title: item.paper.title,
      title_zh: await translateText(item.paper.title),
      description: item.paper.summary,
      description_zh: await translateText(item.paper.summary),
      url: 'https://huggingface.co/papers/' + item.paper.id,
      upvotes: String(item.paper.upvotes || 0),
      authors: item.paper.authors.map(a => a.name).join(', ')
    });
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
    .sort((a, b) => scoreTweet(b.tweet) - scoreTweet(a.tweet))
    .slice(0, 15);

  const items = [];
  for (const { builder, tweet } of tweets) {
    const cleanText = truncateText(tweet.text, 240);
    const normalized = normalizeTweetText(tweet.text);
    items.push({
      id: tweet.id,
      title: `${builder.name} · @${builder.handle}`,
      title_zh: `${builder.name} · @${builder.handle}`,
      description: cleanText,
      description_zh: await translateText(cleanText),
      url: tweet.url,
      handle: `@${builder.handle}`,
      author: builder.name,
      bio: truncateText(builder.bio || '', 96),
      likes: String(tweet.likes || 0),
      retweets: String(tweet.retweets || 0),
      replies: String(tweet.replies || 0),
      age: formatRelativeAge(tweet.createdAt),
      createdAt: tweet.createdAt,
      wordCount: normalized ? normalized.split(' ').filter(Boolean).length : 0,
      score: Number(scoreTweet(tweet).toFixed(2)),
      xSource: 'follow-builders'
    });
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
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(^## ${escaped}\\n[\\s\\S]*?)(?=^## |\\Z)`, 'm');
  const match = markdown.match(regex);
  return match ? match[1] : '';
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

async function buildRedditFeed() {
  const [en, zh] = await Promise.all([fetchText(REDDIT_REPORT_EN_URL), fetchText(REDDIT_REPORT_ZH_URL)]);
  if (!en) {
    return {
      source: 'reddit',
      updatedAt: new Date().toISOString(),
      count: 0,
      mode: 'error',
      error: 'Could not fetch reddit-ai-trends latest_report_en.md',
      items: []
    };
  }

  const todaySectionEn = extractSection(en, "Today's Trending Posts");
  const todaySectionZh = zh ? (extractSection(zh, '今日热门帖子') || extractSection(zh, '今日热门帖子'.replace(/ /g,''))) : '';
  const rowsEn = parseMarkdownTable(todaySectionEn);
  const rowsZh = parseMarkdownTable(todaySectionZh);
  const items = [];

  for (let i = 0; i < Math.min(rowsEn.length, 15); i++) {
    const [titleCell, communityCell, score, comments, category, posted] = rowsEn[i];
    const zhRow = rowsZh[i] || [];
    const zhTitleCell = zhRow[0] || titleCell;
    const title = parseMarkdownLink(titleCell);
    const titleZh = parseMarkdownLink(zhTitleCell);
    const community = parseMarkdownLink(communityCell);

    items.push({
      id: title.url.split('/').pop() || `reddit-${i}`,
      title: title.text,
      title_zh: titleZh.text,
      description: `${community.text} · ${category} · Score ${score} · ${comments} comments`,
      description_zh: `${community.text} · ${category} · 分数 ${score} · ${comments} 条评论`,
      url: title.url,
      subreddit: community.text,
      subredditUrl: community.url,
      score: String(score),
      comments: String(comments),
      category,
      posted,
      redditSource: 'liyedanpdx/reddit-ai-trends'
    });
  }

  return {
    source: 'reddit',
    updatedAt: new Date().toISOString(),
    count: items.length,
    mode: 'report-artifact',
    upstream: 'liyedanpdx/reddit-ai-trends',
    items
  };
}

async function main() {
  ensureDataDir();
  const { only } = parseArgs();
  const generatedAt = new Date().toISOString();
  const feedAll = { generatedAt };

  if (!only || only === 'github') {
    const github = await buildGitHubFeed();
    writeJson('feed-github.json', github);
    feedAll.github = github;
  }

  if (!only || only === 'huggingface') {
    const huggingface = await buildHuggingFaceFeed();
    writeJson('feed-huggingface.json', huggingface);
    feedAll.huggingface = huggingface;
  }

  if (!only || only === 'x') {
    const x = await buildXFeed();
    writeJson('feed-x.json', x);
    feedAll.x = x;
  }

  if (!only || only === 'reddit') {
    const reddit = await buildRedditFeed();
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
