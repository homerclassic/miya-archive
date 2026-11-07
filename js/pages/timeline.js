/**
 * Chronological timeline centred on one tweet, extendable in both directions.
 */

import { $, main } from '../core/dom.js';
import { state, toggleOldestFirst } from '../core/state.js';
import { renderProfile } from './profile.js';
import { pageHeader } from '../ui/page-header.js';
import { skeletonTweets } from '../ui/skeleton.js';
import { tweetCard } from '../ui/tweet-card.js';

/** Observers of the "load more" sentinels of the current timeline. */
let timelineObservers = [];

/** Disconnect and drop the sentinels of the timeline being replaced. */
function clearTimelineObservers() {
    timelineObservers.forEach(o => o.disconnect());
    timelineObservers = [];
}

/**
 * Timeline around tweet `id`; scrolls up/down to load neighbours on demand.
 */
export function renderTimelineAt(id) {
    const i = state.indexById[id];
    if (i == null)
        return renderProfile();
    // The loaded window, as one named state object with a single setter — the
    // "more above / more below" checks and the up/down handlers all read it.
    const win = { lo: Math.max(0, i - 15), hi: Math.min(state.tweets.length, i + 16) };
    const setWindow = (lo, hi) => { win.lo = lo; win.hi = hi; };
    // The sort direction, read once per render: every branch below derives from
    // this named value instead of re-testing state.oldestFirst inline.
    const dir = state.oldestFirst ? 'oldest-first' : 'newest-first';
    clearTimelineObservers();
    main.innerHTML = pageHeader('Timeline', '', 1) + `<div class="bar"><a id="od">${dir == 'oldest-first' ? 'Oldest first ↑' : 'Newest first ↓'}</a></div><div class="more" id="up">${skeletonTweets(1)}</div><div id="l"></div><div class="more" id="dn">${skeletonTweets(1)}</div>`;
    const l = $('#l');
    const dr = (a, b) => {
        const r = state.tweets.slice(a, b).map(t => tweetCard(t, { h: t.id == id }));
        if (dir == 'newest-first')
            r.reverse();
        return r.join('');
    };
    const hasMoreAbove = () => dir == 'oldest-first' ? win.lo > 0 : win.hi < state.tweets.length;
    const hasMoreBelow = () => dir == 'oldest-first' ? win.hi < state.tweets.length : win.lo > 0;
    const up = () => {
        const f = l.firstElementChild;
        const y = f ? f.getBoundingClientRect().top : 0;
        if (dir == 'oldest-first') {
            const a = Math.max(0, win.lo - 30);
            l.insertAdjacentHTML('afterbegin', dr(a, win.lo));
            setWindow(a, win.hi);
        }
        else {
            const b = Math.min(state.tweets.length, win.hi + 30);
            l.insertAdjacentHTML('afterbegin', dr(win.hi, b));
            setWindow(win.lo, b);
        }
        if (!hasMoreAbove())
            $('#up').remove();
        if (f)
            scrollBy(0, f.getBoundingClientRect().top - y);
    };
    const dn = () => {
        if (dir == 'oldest-first') {
            const b = Math.min(state.tweets.length, win.hi + 30);
            l.insertAdjacentHTML('beforeend', dr(win.hi, b));
            setWindow(win.lo, b);
        }
        else {
            const a = Math.max(0, win.lo - 30);
            l.insertAdjacentHTML('beforeend', dr(a, win.lo));
            setWindow(a, win.hi);
        }
        if (!hasMoreBelow())
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
    l.innerHTML = dr(win.lo, win.hi);
    if (!hasMoreAbove())
        $('#up').remove();
    if (!hasMoreBelow())
        $('#dn').remove();
    $('#od').onclick = () => {
        toggleOldestFirst();
        renderTimelineAt(id);
    };
    $('#t' + id).scrollIntoView({ block: 'center' });
    if ($('#up'))
        watch($('#up'), up);
    if ($('#dn'))
        watch($('#dn'), dn);
}
