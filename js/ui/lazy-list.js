/**
 * Incremental list rendering (renders more rows as the sentinel scrolls into view).
 */

import { state } from '../core/state.js';
import { skeletonTweets } from './skeleton.js';

/** IntersectionObserver of the list currently being rendered (one at a time). */
let lazyObserver = null;

/** The handle of the most recently created list (also returned by renderLazyList). */
let activeList = null;

/** The list currently on screen, if any — the router and search use its rendered count when saving scroll position. */
export const getActiveList = () => activeList;

/**
 * Render `items` in chunks of `n`; more are added when the "Loading" sentinel nears the viewport.
 * Returns a handle whose `rendered` count is live (it grows as more rows load) and `done` is true once every row is in.
 */
export function renderLazyList(box, items, fn, n = 30) {
    let i = 0;
    const handle = {
        get rendered() { return i; },
        get done() { return i >= items.length; },
    };
    activeList = handle;
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
        if (i >= items.length) {
            io.disconnect();
            more.remove();
        }
    }
    step();
    {
        const w = state.nav.restore ? state.nav.restore.n : 0;
        while (i < items.length && i < w)
            step();
    }
    if (i < items.length)
        io.observe(more);
    return handle;
}
