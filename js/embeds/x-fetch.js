/**
 * Loads other accounts' posts from X's public embed endpoint with two public mirrors as fallback, plus a localStorage cache.
 */

import { encodeUri, escapeHtml } from '../core/dom.js';

/* ===== live embeds for posts by other accounts (fetched from X's public embed endpoint when online) ===== */
const embedCache = new Map();

const embedToken = id => ((Number(id) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, '');

const X_CACHE_PREFIX = 'xq1:';

const readCachedPost = id => {
    try {
        const s = localStorage.getItem(X_CACHE_PREFIX + id);
        return s ? JSON.parse(s) : null;
    }
    catch (e) {
        return null;
    }
};

const cachePost = (id, p) => {
    try {
        localStorage.setItem(X_CACHE_PREFIX + id, JSON.stringify(p));
    }
    catch (e) {
    }
};

export const forgetPost = id => {
    embedCache.delete(id);
    try {
        localStorage.removeItem(X_CACHE_PREFIX + id);
    }
    catch (e) {
    }
};

/* Reduce X's payload to the few fields the card shows (also what gets cached, so a post that loaded once survives later deletion or going private). */
function pickEmbedFields(d) {
    const u = d.user || {};
    const q = d.quoted_tweet;
    const best = m => (((m.video_info || {}).variants) || []).filter(v => v.content_type == 'video/mp4').sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
    return {
        n: u.name || '', s: u.screen_name || '', a: u.profile_image_url_https || '', v: !!(u.is_blue_verified || u.verified), t: d.created_at || '', x: embedTextFromSyndication(d),
        m: (d.mediaDetails || []).slice(0, 4).map(m => ({ u: m.media_url_https || '', k: m.type || 'photo', v: m.type == 'animated_gif' ? ((best(m) || {}).url || '') : '' })).filter(m => m.u),
        q: q && q.user ? { n: q.user.name || '', s: q.user.screen_name || '', x: (q.text || '').replace(/https?:\/\/t\.co\/\S+/g, '').trim().slice(0, 220) } : null,
        l: d.favorite_count || 0, r: d.conversation_count || 0, rp: d.in_reply_to_screen_name || ''
    };
}

/* Resolves {p} (post), {gone:text} (the post really is unavailable), or rejects (couldn't tell: retryable).
   X's own embed endpoint is flaky: it answers 404 / tombstones for plenty of public posts (age-restricted, rate-limited, uncached), so its "no" is never trusted alone.
   If it can't produce the post we ask two public mirrors (FxTwitter, then VxTwitter) and only report "unavailable" when one of them says so too. */
const X_FEATURES = 'tfw_timeline_list:;tfw_follower_count_sunset:true;tfw_tweet_edit_backend:on;tfw_refsrc_session:on;tfw_fosnr_soft_interventions_enabled:on;tfw_show_birdwatch_pivots_enabled:on;tfw_show_business_verified_badge:on;tfw_duplicate_scribes_to_settings:on;tfw_use_profile_image_shape_enabled:on;tfw_show_blue_verified_badge:on;tfw_legacy_timeline_sunset:true;tfw_show_gov_verified_badge:on;tfw_show_business_affiliate_badge:on;tfw_tweet_edit_frontend:on';

const fetchWithTimeout = async (url, ms = 9000) => {
    const c = new AbortController();
    const to = setTimeout(() => c.abort(), ms);
    try {
        return await fetch(url, { signal: c.signal });
    }
    finally {
        clearTimeout(to);
    }
};

const isoFromSeconds = sec => {
    try {
        return sec ? new Date(sec * 1000).toISOString() : '';
    }
    catch (e) {
        return '';
    }
};

const stripTcoLinks = s => (s || '').replace(/https?:\/\/t\.co\/\S+/g, '').trim();

function fromFxTwitter(j) {
    const t = j && j.tweet;
    const a = t && t.author;
    if (!t || !a)
        return null;
    const q = t.quote;
    const rp = t.replying_to;
    return {
        n: a.name || '', s: a.screen_name || '', a: a.avatar_url || '', v: !!(a.verification && a.verification.verified) || !!a.blue_verified, t: t.created_timestamp ? isoFromSeconds(t.created_timestamp) : '', x: stripTcoLinks(t.text),
        m: ((t.media && t.media.all) || []).slice(0, 4).map(m => ({ u: (m.type == 'photo' ? m.url : m.thumbnail_url || m.url) || '', k: m.type == 'photo' ? 'photo' : m.type == 'gif' ? 'animated_gif' : 'video', v: m.type == 'gif' ? (m.url || '') : '' })).filter(m => m.u),
        q: q && q.author ? { n: q.author.name || '', s: q.author.screen_name || '', x: stripTcoLinks(q.text).slice(0, 220) } : null,
        l: t.likes || 0, r: t.replies || 0, rp: typeof rp == 'string' ? rp : (rp && rp.screen_name) || ''
    };
}

function fromVxTwitter(j) {
    if (!j || !j.user_screen_name)
        return null;
    const q = j.qrt;
    return {
        n: j.user_name || '', s: j.user_screen_name || '', a: j.user_profile_image_url || '', v: false, t: isoFromSeconds(j.date_epoch), x: stripTcoLinks(j.text),
        m: (j.media_extended || []).slice(0, 4).map(m => ({ u: (m.type == 'image' ? m.url : m.thumbnail_url || m.url) || '', k: m.type == 'image' ? 'photo' : m.type == 'gif' ? 'animated_gif' : 'video', v: m.type == 'gif' ? (m.url || '') : '' })).filter(m => m.u),
        q: q && q.user_screen_name ? { n: q.user_name || '', s: q.user_screen_name || '', x: stripTcoLinks(q.text).slice(0, 220) } : null,
        l: j.likes || 0, r: j.replies || 0, rp: j.replyingTo || ''
    };
}

/**
 * Resolve a post by id: cache, then X embed endpoint, then FxTwitter and VxTwitter. Resolves {p} (post) or {gone} (really unavailable); rejects when it could not tell.
 */
export function getEmbeddedPost(id, u) {
    if (!embedCache.has(id))
        embedCache.set(id, (async () => {
            const c = readCachedPost(id);
            if (c)
                return { p: c };
            const US = encodeUri(u || 'i');
            let tomb = null;
            let no = false;
            try {
                const r = await fetchWithTimeout(`https://cdn.syndication.twimg.com/tweet-result?id=${id}&lang=en&features=${encodeUri(X_FEATURES)}&token=${embedToken(id)}`);
                if (r.ok) {
                    const d = await r.json().catch(() => null);
                    if (d && d.__typename == 'TweetTombstone')
                        tomb = (d.tombstone && d.tombstone.text && d.tombstone.text.text) || '';
                    else if (d && (d.text || d.user)) {
                        const p = pickEmbedFields(d);
                        cachePost(id, p);
                        return { p };
                    }
                }
            }
            catch (e) {
            }
            for (const [url, map] of [[`https://api.fxtwitter.com/${US}/status/${id}`, fromFxTwitter], [`https://api.vxtwitter.com/${US}/status/${id}`, fromVxTwitter]]) {
                try {
                    const r = await fetchWithTimeout(url);
                    const j = await r.json().catch(() => null);
                    const p = map(j);
                    if (p) {
                        cachePost(id, p);
                        return { p };
                    }
                    if (r.status == 404 || r.status == 401 || r.status == 403)
                        no = true;
                }
                catch (e) {
                }
            }
            if (no)
                return { gone: tomb || '' };
            throw 0;
        })().catch(e => {
            embedCache.delete(id);
            throw e;
        }));
    return embedCache.get(id);
}

export const linkifyEmbedText = x => escapeHtml(x).replace(/(https?:\/\/[^\s<]+)/g, u => {
    const t = u.replace(/^https?:\/\/(?:www\.)?/, '');
    return `<a href="${u}" target="_blank" rel="noopener">${t.length > 32 ? t.slice(0, 31) + '…' : t}</a>`;
}).replace(/(^|[\s(])@(\w{1,15})\b/g, '$1<a href="https://x.com/$2" target="_blank" rel="noopener">@$2</a>').replace(/(^|[\s(])#(\w+)/g, '$1<a href="https://x.com/hashtag/$2" target="_blank" rel="noopener">#$2</a>');

function embedTextFromSyndication(d) {
    let cp = Array.from(d.text || '');
    let r = d.display_text_range;
    if (r && r.length == 2)
        cp = cp.slice(r[0], r[1]);
    let t = cp.join('');
    for (const e of (d.entities && d.entities.urls) || [])
        t = t.split(e.url).join(e.expanded_url || e.url);
    for (const m of d.mediaDetails || [])
        if (m.url)
            t = t.split(m.url).join('');
    return t.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
}
