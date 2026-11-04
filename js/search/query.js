/**
 * Search query language (from:, since:, has:, type:, min_faves:, sort: ...): parsing, filtering, scoring and sorting.
 */

import { state } from '../core/state.js';

const escapeRegex = w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const WORD_START = '(?<![\\p{L}\\p{N}_])';

const WORD_END = '(?![\\p{L}\\p{N}_])';

const wordRegex = (w, s) => new RegExp(WORD_START + escapeRegex(w) + (s ? WORD_END : ''), 'u');

const TYPE_ALIASES = {
    originals: 'original', replies: 'reply', retweet: 'rt', retweets: 'rt', own: 'self', chain: 'self', threads: 'thread'
};

const HAS_ALIASES = {
    links: 'link', url: 'link', images: 'media', image: 'media', photos: 'media', photo: 'media', video: 'media', videos: 'media'
};

const SORT_ALIASES = {
    relevance: 'best', best: 'best', newest: 'new', new: 'new', oldest: 'old', old: 'old', liked: 'likes', likes: 'likes', faves: 'likes', retweets: 'retweets', rts: 'retweets'
};

export const SORT_LABELS = {
    best: 'Best match', new: 'Newest', old: 'Oldest', likes: 'Most liked', retweets: 'Most retweeted'
};

const OPERATORS = new Set(['any', 'reply', 'to', 'since', 'until', 'before', 'after', 'min_faves', 'min_likes', 'min_retweets', 'min_rts', 'type', 'is', 'has', 'filter', 'sort', 'from']);

const parseDateOperand = (v, end) => {
    const m = /^(\d{4})(?:-(\d{1,2})(?:-(\d{1,2}))?)?$/.exec(v);
    if (!m)
        return 0;
    const y = +m[1];
    const mo = m[2] ? +m[2] - 1 : 0;
    const d = m[3] ? +m[3] : 1;
    return end ? (m[3] ? Date.UTC(y, mo, d + 1) : m[2] ? Date.UTC(y, mo + 1, 1) : Date.UTC(y + 1, 0, 1)) : Date.UTC(y, mo, d);
};

/**
 * Parse the search string into a filter object (words, negations, operators, sort, highlight regex).
 */
export function parseQuery(q) {
    const f = {
        w: [], a: [], n: [], type: [], ntype: [], has: [], nhas: [], rep: [], from: [], nfrom: [], minl: 0, minr: 0, since: 0, until: 0, sr: '', ur: '', sort: '', hl: [], txt: 0
    };
    for (let s of q.match(/-?"[^"]*"|\S+/g) || []) {
        const neg = s[0] == '-' && s.length > 1;
        if (neg)
            s = s.slice(1);
        const qd = s[0] == '"';
        s = s.replace(/^"|"$/g, '').trim();
        if (!s)
            continue;
        const l = s.toLowerCase().replace(/[’‘]/g, "'");
        const k = qd ? null : /^([a-z_]+):(.+)$/.exec(l);
        const op = k && OPERATORS.has(k[1]) ? k[1] : '';
        const v = op ? k[2].replace(/^"|"$/g, '') : '';
        if (op) {
            if (op == 'has' || op == 'filter')
                (neg ? f.nhas : f.has).push(HAS_ALIASES[v] || v);
            else if (op == 'type' || op == 'is')
                (neg ? f.ntype : f.type).push(TYPE_ALIASES[v] || v);
            else if (op == 'from')
                (neg ? f.nfrom : f.from).push(v.replace(/^@/, ''));
            else if (neg) {
            }
            else if (op == 'any') {
                const g = v.split('|').filter(Boolean);
                if (g.length) {
                    f.a.push(g.map(w => wordRegex(w, /^[@#]/.test(w))));
                    f.hl.push(...g);
                }
            }
            else if (op == 'reply' || op == 'to')
                f.rep.push(v.replace('@', ''));
            else if (op == 'since') {
                f.since = parseDateOperand(v, 0);
                f.sr = v;
            }
            else if (op == 'until') {
                f.until = parseDateOperand(v, 1);
                f.ur = v;
            }
            else if (op == 'after') {
                f.since = parseDateOperand(v, 1);
            }
            else if (op == 'before') {
                f.until = parseDateOperand(v, 0);
            }
            else if (op == 'min_faves' || op == 'min_likes')
                f.minl = +v || 0;
            else if (op == 'min_retweets' || op == 'min_rts')
                f.minr = +v || 0;
            else if (op == 'sort')
                f.sort = SORT_ALIASES[v] || '';
            continue;
        }
        const at = /^[@#]/.test(l);
        const r = { r: wordRegex(l, qd || at), at: l[0] == '@' };
        if (neg)
            f.n.push(r);
        else {
            f.w.push(r);
            f.hl.push(l);
            f.txt = 1;
        }
    }
    f.type = f.type.filter(k => TWEET_TYPE_TESTS[k]);
    f.ntype = f.ntype.filter(k => TWEET_TYPE_TESTS[k]);
    f.hrx = f.hl.length ? new RegExp(WORD_START + '(?:' + f.hl.map(escapeRegex).join('|') + ')[\\p{L}\\p{N}_\']*', 'giu') : null;
    return f;
}

const TWEET_TYPE_TESTS = {
    original: t => !t.rt && !t.rp && !t.rh, reply: t => !t.rt && !!(t.rp || t.rh), self: t => !t.rt && !!state.tweetsById[t.rp], thread: t => !t.rt && !!(state.tweetsById[t.rp] || state.repliesByParent[t.id]), rt: t => t.rt, selfrt: t => !!t.so
};

const matchesTerm = (e, t) => e.r.test(t.lc) || (e.at && e.r.test(t.mn));

const displayedTweet = t => t.so && t.o ? t.o : t;

/**
 * True when a tweet passes every filter in a parsed query.
 */
function matchesFilters(t, f) {
    const P = displayedTweet(t);
    if (P.l < f.minl || P.r < f.minr || t.t < f.since || (f.until && t.t >= f.until))
        return 0;
    if (f.type.length && !f.type.some(k => TWEET_TYPE_TESTS[k](t)) || f.ntype.some(k => TWEET_TYPE_TESTS[k](t)))
        return 0;
    const md = P.m.length || t.m.length;
    const lk = P.lk || t.lk;
    for (const h of f.has)
        if (h == 'media' && !md || h == 'link' && !lk)
            return 0;
    for (const h of f.nhas)
        if (h == 'media' && md || h == 'link' && lk)
            return 0;
    if (f.rep.length && !f.rep.some(r => P.rh.toLowerCase() == r.toLowerCase()))
        return 0;
    const au = (t.rt ? t.ra : state.ownerHandle).toLowerCase();
    if (f.from.length && !f.from.some(h => h.toLowerCase() == au) || f.nfrom.some(h => h.toLowerCase() == au))
        return 0;
    return f.w.every(e => matchesTerm(e, t)) && f.a.every(g => g.some(r => r.test(t.lc))) && !f.n.some(e => matchesTerm(e, t));
}

function relevanceScore(t, f) {
    let s = 0;
    for (const e of f.w) {
        const c = (t.lc.match(new RegExp(e.r.source, 'gu')) || []).length;
        s += Math.min(c, 3);
    }
    return s * 2 + Math.log10(1 + displayedTweet(t).l) - (t.rt ? .5 : 0);
}

/**
 * Filter and sort all tweets; returns [results, effectiveSort].
 */
export function runSearch(f) {
    let R = state.tweets.filter(t => matchesFilters(t, f));
    const ids = new Set(R.map(t => t.id));
    if (!f.type.includes('rt') && !f.type.includes('selfrt'))
        R = R.filter(t => !(t.so && t.o && ids.has(t.o.id)));
    const s = f.sort || (f.txt ? 'best' : 'new');
    if (s == 'best')
        for (const t of R)
            t.sc = relevanceScore(t, f);
    R.sort(s == 'best' ? (a, b) => b.sc - a.sc || b.t - a.t : s == 'likes' ? (a, b) => displayedTweet(b).l - displayedTweet(a).l || b.t - a.t : s == 'retweets' ? (a, b) => displayedTweet(b).r - displayedTweet(a).r || b.t - a.t : s == 'old' ? (a, b) => a.t - b.t : (a, b) => b.t - a.t);
    return [R, s];
}

export const tokenizeQuery = q => q.match(/-?"[^"]*"|\S+/g) || [];

export function applyOperator(q, op, v) {
    let a = tokenizeQuery(q);
    const del = re => {
        a = a.filter(s => !re.test(s));
    };
    const tog = s => {
        const i = a.findIndex(x => x.toLowerCase() == s.toLowerCase());
        i < 0 ? a.push(s) : a.splice(i, 1);
    };
    if (op == 'type') {
        del(/^-?type:/i);
        if (v)
            a.push('type:' + v);
    }
    else if (op == 'sort') {
        const f = parseQuery(q);
        del(/^sort:/i);
        if (v != (f.txt ? 'best' : 'new'))
            a.push('sort:' + v);
    }
    else if (op == 'minl') {
        del(/^min_(?:faves|likes):/i);
        if (+v)
            a.push('min_faves:' + v);
    }
    else if (op == 'minr') {
        del(/^min_(?:retweets|rts):/i);
        if (+v)
            a.push('min_retweets:' + v);
    }
    else if (op == 'has')
        tog('has:' + v);
    else if (op == 'range') {
        del(/^(?:since|until):/i);
        if (v)
            a.push('since:' + v, 'until:' + v);
    }
    else if (op == 'rep') {
        const had = a.some(x => x.toLowerCase() == 'reply:' + v.toLowerCase());
        del(/^(?:reply|to):/i);
        if (!had)
            a.push('reply:' + v);
    }
    else if (op == 'men' || op == 'tag')
        tog(v);
    return a.join(' ');
}
