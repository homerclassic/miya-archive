/**
 * Home / explore tabs: For you, Threads, Most retweeted, Most liked, plus term tables.
 */

import { $, main } from '../core/dom.js';
import { state } from '../core/state.js';
import { renderLazyList } from '../ui/lazy-list.js';
import { pageHeader } from '../ui/page-header.js';
import { tweetCard } from '../ui/tweet-card.js';

function renderThreadList(l) {
    const out = [];
    for (const t of state.tweets) {
        if (t.rt || t.rp || t.rh || !state.repliesByParent[t.id])
            continue;
        let n = 1;
        let lk = t.l;
        (function w(i) {
            for (const k of state.repliesByParent[i] || []) {
                n++;
                lk += k.l;
                w(k.id);
            }
        })(t.id);
        out.push({ t, n, lk });
    }
    out.sort((a, b) => b.n - a.n || b.lk - a.lk);
    renderLazyList(l, out.slice(0, 300), x => tweetCard(x.t));
}

/**
 * Home page with its four tabs.
 */
export function renderExplore(tab = 'foryou') {
    const tabs = [['foryou', 'For you'], ['threads', 'Threads'], ['retweets', 'Most retweeted'], ['likes', 'Most liked']];
    if (!tabs.some(x => x[0] == tab))
        tab = 'foryou';
    main.innerHTML = pageHeader('Home').replace('class="hd0"', 'class="hd0 hh"') + `<div class="tabs2">${tabs.map(([k, n]) => `<a data-go="${k == 'foryou' ? '/' : '/explore/' + k}" class="${k == tab ? 'on' : ''}">${n}</a>`).join('')}<div class="tabs2-ind"></div></div><div id="l"></div>`;
    const l = $('#l');
    if (tab == 'foryou')
        renderForYou(l);
    else if (tab == 'threads')
        renderThreadList(l);
    else if (tab == 'likes' || tab == 'retweets') {
        const k = tab == 'likes' ? 'l' : 'r';
        renderLazyList(l, state.tweets.filter(t => !t.rt && t[k]).sort((a, b) => b[k] - a[k]).slice(0, 500), t => tweetCard(t));
    }
}

/**
 * Own tweets with at least one like and one retweet, shuffled once per page load.
 */
function renderForYou(l) {
    if (state.forYouFeedStatus == 'unbuilt') {
        state.forYouFeed = state.tweets.filter(t => !t.rt && t.l >= 1 && t.r >= 1);
        for (let i = state.forYouFeed.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [state.forYouFeed[i], state.forYouFeed[j]] = [state.forYouFeed[j], state.forYouFeed[i]];
        }
        state.forYouFeedStatus = 'ready';
    }
    if (!state.forYouFeed.length) {
        l.innerHTML = '<div class="mu" style="padding:32px 16px;text-align:center">No tweets with both a like and a retweet.</div>';
        return;
    }
    renderLazyList(l, state.forYouFeed, t => tweetCard(t));
}
