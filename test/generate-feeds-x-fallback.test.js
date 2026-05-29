const assert = require('assert');
const test = require('node:test');

const {
  buildXFeedWithFallback,
} = require('../scripts/generate-feeds');

test('uses guest timeline fallback when follow-builders has no X items', async () => {
  let fallbackReason = '';
  const feed = await buildXFeedWithFallback({
    fetchFollowBuildersFeed: async () => ({
      x: [],
      errors: ['X API: User lookup failed: HTTP 500'],
    }),
    buildGuestTimelineFallbackFeed: async reason => {
      fallbackReason = reason;
      return {
        source: 'x',
        updatedAt: '2026-05-29T01:00:00.000Z',
        count: 1,
        mode: 'manual-search-guest-timeline',
        meta: { fallbackReason: reason },
        items: [
          {
            id: '1',
            title: 'Fallback signal',
            title_zh: 'Fallback signal',
            description: 'Fallback description',
            description_zh: 'Fallback description',
            authors: 'Fallback',
            url: 'https://x.com/example/status/1',
            score: 1,
            meta: { source: 'x', xSource: 'manual-search-guest-timeline' },
          },
        ],
      };
    },
  });

  assert.equal(feed.mode, 'manual-search-guest-timeline');
  assert.equal(feed.count, 1);
  assert.match(fallbackReason, /follow-builders returned 0 usable tweets/);
  assert.match(fallbackReason, /HTTP 500/);
});

test('keeps follow-builders mode when upstream has usable X items', async () => {
  let fallbackCalled = false;
  const feed = await buildXFeedWithFallback({
    fetchFollowBuildersFeed: async () => ({
      x: [
        {
          name: 'Builder',
          handle: 'builder',
          bio: 'Builds AI tools',
          tweets: [
            {
              id: '2',
              text: 'Launching a practical AI agent workflow today.',
              url: 'https://x.com/builder/status/2',
              likes: 10,
              retweets: 2,
              replies: 1,
              createdAt: '2026-05-29T00:00:00.000Z',
            },
          ],
        },
      ],
    }),
    buildGuestTimelineFallbackFeed: async () => {
      fallbackCalled = true;
      throw new Error('fallback should not be called');
    },
    translate: async text => text,
  });

  assert.equal(feed.mode, 'follow-builders');
  assert.equal(feed.count, 1);
  assert.equal(feed.items[0].meta.xSource, 'follow-builders');
  assert.equal(fallbackCalled, false);
});
