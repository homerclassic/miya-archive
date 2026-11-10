/**
 * Single post page with its ancestors above and replies below.
 */

import { $, main } from '../core/dom.js';
import { state } from '../core/state.js';
import { renderProfile } from './profile.js';
import { renderLazyList } from '../ui/lazy-list.js';
import { pageHeader } from '../ui/page-header.js';
import { findRelated } from '../ui/related.js';
import { tweetCard } from '../ui/tweet-card.js';

/**
 * Post page: ancestors, the focused tweet, then every reply in depth-first order.
 */
export function renderThread(id) {
    const t = state.tweetsById[id];
    if (!t)
        return renderProfile();
    const anc = [];
    let p = t;
    while (state.tweetsById[p.rp] && anc.length < 300) {
        p = state.tweetsById[p.rp];
        anc.unshift(p);
    }
    const ds = [];
    (function w(i, d) {
        for (const k of state.repliesByParent[i] || []) {
            ds.push([k, d]);
            w(k.id, d + 1);
        }
    })(id, 0);
    const top = anc[0] || t;
    const exclude = new Set([t.id, ...anc.map(a => a.id), ...ds.map(([k]) => k.id)]);
    const related = findRelated(t, exclude, 2);
    main.innerHTML = pageHeader('Post', '', 1) + (top.rp && top.rh && !top.rt ? `<div class="stub">Replying to <a data-q="@${top.rh}">@${top.rh}</a> — original tweet isn't in the archive</div>` : '') + anc.map(a => tweetCard(a, { k: 1 })).join('') + tweetCard(t, { f: 1 }) + `<div class="bar vt"><a data-go="/at/${id}">View in timeline</a></div><div id="l"></div>` + (related.length ? `<section class="dm"><h2>Discover more</h2>${related.map(p => tweetCard(p)).join('')}</section>` : '');
    renderLazyList($('#l'), ds, ([k, d]) => tweetCard(k, { d: d + 1, k: (state.repliesByParent[k.id] || []).length ? 1 : 0 }), 40);
    $('#t' + id).scrollIntoView({ block: 'start' });
    scrollBy(0, -60);
}
