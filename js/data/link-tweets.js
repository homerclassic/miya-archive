/**
 * Links the owner's own retweets back to the original tweets and builds the month list used by the date filter.
 */

import { MONTH_NAMES, normalizeForMatch } from '../core/format.js';
import { state } from '../core/state.js';

/**
 * Match each self-retweet with its original tweet and build the list of months covered by the archive.
 */
export function linkRetweets() {
    const ix = {};
    const lo = state.ownerHandle.toLowerCase();
    for (const t of state.tweets) {
        t.n = normalizeForMatch(t.rt ? t.rb : t.x);
        t.so = !!(t.rt && t.ra.toLowerCase() == lo);
        t.o = null;
        if (!t.rt && t.n) {
            const k = t.n.slice(0, 40);
            (ix[k] || (ix[k] = [])).push(t);
        }
    }
    for (const t of state.tweets) {
        if (!t.so || !t.n)
            continue;
        let c = ix[t.n.slice(0, 40)] || [];
        if (t.n.length < 40)
            c = Object.keys(ix).filter(k => k.startsWith(t.n)).flatMap(k => ix[k]);
        c = c.filter(o => o.n.startsWith(t.n));
        if (!c.length)
            continue;
        const pre = c.filter(o => o.t <= t.t);
        t.o = pre.length ? pre[pre.length - 1] : c[0];
    }
    const mh = t => t.m.map(p => (p.split('/').pop().match(/^\d+-(.+)\.\w+$/) || [])[1]).filter(Boolean);
    const M = {};
    const RW = {};
    for (const t of state.tweets)
        if (!t.rt) {
            for (const h of mh(t))
                M[h] = t;
            if (t.x.trim())
                RW[t.x.trim()] = t;
        }
    for (const t of state.tweets) {
        if (!t.so || t.o)
            continue;
        let o = RW[t.rb.trim()];
        if (!o)
            for (const h of mh(t)) {
                if (M[h]) {
                    o = M[h];
                    break;
                }
            }
        if (o && o.t <= t.t)
            t.o = o;
    }
    state.months = [];
    if (!state.tweets.length)
        return;
    const a = new Date(state.tweets[0].t);
    const b = new Date(state.tweets.at(-1).t);
    let y = a.getUTCFullYear();
    let m = a.getUTCMonth();
    while (y < b.getUTCFullYear() || (y == b.getUTCFullYear() && m <= b.getUTCMonth())) {
        state.months.push({
            y, m, ts: Date.UTC(y, m, 1), l: MONTH_NAMES[m] + ' \u2019' + String(y).slice(2)
        });
        if (++m > 11) {
            m = 0;
            y++;
        }
    }
}
