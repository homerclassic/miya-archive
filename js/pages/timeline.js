/**
 * Chronological timeline centred on one tweet, extendable in both directions.
 */

import { $, main } from '../core/dom.js';
import { state } from '../core/state.js';
import { renderProfile } from './profile.js';
import { pageHeader } from '../ui/page-header.js';
import { skeletonTweets } from '../ui/skeleton.js';
import { tweetCard } from '../ui/tweet-card.js';

/** Observers of the "load more" sentinels of the current timeline. */
let timelineObservers = [];

/**
 * Timeline around tweet `id`; scrolls up/down to load neighbours on demand.
 */
export function renderTimelineAt(id) {
    const i = state.indexById[id];
    if (i == null)
        return renderProfile();
    let lo = Math.max(0, i - 15);
    let hi = Math.min(state.tweets.length, i + 16);
    timelineObservers.forEach(o => o.disconnect());
    timelineObservers = [];
    main.innerHTML = pageHeader('Timeline', '', 1) + `<div class="bar"><a id="od">${state.oldestFirst ? 'Oldest first ↑' : 'Newest first ↓'}</a></div><div class="more" id="up">${skeletonTweets(1)}</div><div id="l"></div><div class="more" id="dn">${skeletonTweets(1)}</div>`;
    const l = $('#l');
    const dr = (a, b) => {
        const r = state.tweets.slice(a, b).map(t => tweetCard(t, { h: t.id == id }));
        if (!state.oldestFirst)
            r.reverse();
        return r.join('');
    };
    const tm = () => state.oldestFirst ? lo > 0 : hi < state.tweets.length;
    const bm = () => state.oldestFirst ? hi < state.tweets.length : lo > 0;
    const up = () => {
        const f = l.firstElementChild;
        const y = f ? f.getBoundingClientRect().top : 0;
        if (state.oldestFirst) {
            const a = Math.max(0, lo - 30);
            l.insertAdjacentHTML('afterbegin', dr(a, lo));
            lo = a;
        }
        else {
            const b = Math.min(state.tweets.length, hi + 30);
            l.insertAdjacentHTML('afterbegin', dr(hi, b));
            hi = b;
        }
        if (!tm())
            $('#up').remove();
        if (f)
            scrollBy(0, f.getBoundingClientRect().top - y);
    };
    const dn = () => {
        if (state.oldestFirst) {
            const b = Math.min(state.tweets.length, hi + 30);
            l.insertAdjacentHTML('beforeend', dr(hi, b));
            hi = b;
        }
        else {
            const a = Math.max(0, lo - 30);
            l.insertAdjacentHTML('beforeend', dr(a, lo));
            lo = a;
        }
        if (!bm())
            $('#dn').remove();
    };
    const watch = (el, fn) => {
        el.onclick = fn;
        const o = new IntersectionObserver(e => {
            if (e[0].isIntersecting) {
                fn();
                o.unobserve(el);
                if (el.isConnected)
                    o.observe(el);
            }
        }, { rootMargin: '900px' });
        o.observe(el);
        timelineObservers.push(o);
    };
    l.innerHTML = dr(lo, hi);
    if (!tm())
        $('#up').remove();
    if (!bm())
        $('#dn').remove();
    $('#od').onclick = () => {
        state.oldestFirst = !state.oldestFirst;
        renderTimelineAt(id);
    };
    $('#t' + id).scrollIntoView({ block: 'center' });
    if ($('#up'))
        watch($('#up'), up);
    if ($('#dn'))
        watch($('#dn'), dn);
}
