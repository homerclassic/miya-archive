/**
 * Incremental list rendering (renders more rows as the sentinel scrolls into view).
 */

import { state } from '../core/state.js';
import { skeletonTweets } from './skeleton.js';

/** IntersectionObserver of the list currently being rendered (one at a time). */
let lazyObserver = null;

/**
 * Render `items` in chunks of `n`; more are added when the "Loading" sentinel nears the viewport.
 */
export function renderLazyList(box, items, fn, n = 30) {
    let i = 0;
    const more = document.createElement('div');
    more.className = 'more';
    more.innerHTML = skeletonTweets(2);
    box.append(more);
    const io = new IntersectionObserver(e => e[0].isIntersecting && step(), { rootMargin: '900px' });
    lazyObserver && lazyObserver.disconnect();
    lazyObserver = io;
    function step() {
        const e = Math.min(i + n, items.length);
        more.insertAdjacentHTML('beforebegin', items.slice(i, e).map(fn).join(''));
        i = e;
        state.renderedCount = i;
        if (i >= items.length) {
            io.disconnect();
            more.remove();
        }
    }
    step();
    {
        const w = state.pendingRestore ? state.pendingRestore.n : 0;
        while (i < items.length && i < w)
            step();
    }
    if (i < items.length)
        io.observe(more);
}
