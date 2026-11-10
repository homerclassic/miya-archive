/**
 * "Discover more" — related posts under a focused tweet, like X.
 * Ranks other posts by shared hashtags, mentions and keywords, and returns
 * the best few. The focused thread itself is excluded.
 * Only close matches are returned: a shared hashtag, a shared mention, two
 * shared keywords, or one rare keyword. A thin post (a bare "lol", say) has
 * no close matches, so it gets no section at all.
 */

import { state } from '../core/state.js';
import { tweetKeywords } from '../data/keywords.js';

/** A word in more than this many tweets is too common to signal a topic
    ("lol" is in 839; only 32 words clear 200). */
const MAX_DF = 200;
/** A word in this many tweets or fewer is specific enough to count double. */
const RARE_DF = 50;
/** Minimum score for a post to count as a close match. */
const MIN_SCORE = 2;

/** token -> Set of tweet ids containing it (built lazily, cached). */
let wordIndex = null;
let tagIndex = null;
let mentionIndex = null;

function buildIndex() {
    if (wordIndex)
        return;
    wordIndex = new Map();
    tagIndex = new Map();
    mentionIndex = new Map();
    const add = (m, k, id) => {
        let s = m.get(k);
        if (!s)
            m.set(k, s = new Set());
        s.add(id);
    };
    for (const t of state.tweets) {
        if (t.so && t.o)
            continue;
        for (const w of tweetKeywords(t))
            add(wordIndex, w, t.id);
        for (const h of t.lc.match(/#\w+/g) || [])
            add(tagIndex, h.slice(1), t.id);
        for (const u of t.lc.match(/@\w+/g) || [])
            add(mentionIndex, u.slice(1), t.id);
    }
}

/**
 * Related posts for `t`: other tweets ranked by shared hashtags (+10 each),
 * shared mentions (+5 each) and shared keywords (+2 if rare, +1 otherwise,
 * ignoring words in more than MAX_DF tweets). Only posts scoring at least
 * MIN_SCORE count as close matches. Posts in `exclude` (the focused thread)
 * are skipped. Returns at most `limit` tweets — 2, 1, or none.
 */
export function findRelated(t, exclude, limit = 2) {
    buildIndex();
    const score = new Map();
    const bump = (idx, keys, w) => {
        for (const k of keys) {
            const s = idx.get(k);
            if (!s)
                continue;
            for (const id of s) {
                if (exclude.has(id))
                    continue;
                score.set(id, (score.get(id) || 0) + w);
            }
        }
    };
    bump(tagIndex, (t.lc.match(/#\w+/g) || []).map(h => h.slice(1)), 10);
    bump(mentionIndex, (t.lc.match(/@\w+/g) || []).map(u => u.slice(1)), 5);
    for (const w of tweetKeywords(t)) {
        const df = (wordIndex.get(w) || new Set()).size;
        if (df > MAX_DF)
            continue;
        bump(wordIndex, [w], df <= RARE_DF ? 2 : 1);
    }
    return [...score.entries()]
        .map(([id, s]) => [state.tweetsById[id], s])
        .filter(([p, s]) => p && s >= MIN_SCORE)
        .sort((a, b) => b[1] - a[1] || b[0].l - a[0].l || b[0].t - a[0].t)
        .slice(0, limit)
        .map(([p]) => p);
}
