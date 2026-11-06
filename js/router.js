/**
 * Hash router: maps #/route to a page renderer and restores scroll position on Back.
 */

import { $ } from './core/dom.js';
import { state } from './core/state.js';
import { renderExplore } from './pages/explore.js';
import { renderHistoryPage } from './pages/history.js';
import { renderProfile } from './pages/profile.js';
import { renderSearchPage } from './pages/search.js';
import { renderThread } from './pages/thread.js';
import { renderTimelineAt } from './pages/timeline.js';
import { getActiveList } from './ui/lazy-list.js';

export const navKey = a => a == 'search' || a == 'history' ? a : a == 'bookmarks' ? 'history' : a == 'tweets' || a == 'media' || a == 't' || a == 'tweet' || a == 'at' ? 'tweets' : '';

/**
 * Render the page for the current location.hash. `fresh` means a refresh rather than navigation.
 */
export function handleRoute(fresh) {
    saveScrollPosition(fresh);
    if (fresh)
        state.forYouFeed = null;
    const h = decodeURIComponent(location.hash.slice(2));
    const [a, ...r] = h.split('/');
    const b = r.join('/');
    document.querySelectorAll('nav a[data-n], #dr a[data-n]').forEach(x => x.classList.toggle('on', x.dataset.n == navKey(a)));
    if (state.loadStatus !== 'ready')
        return;
    const sq = $('#sq');
    if (sq && document.activeElement !== sq)
        sq.value = a == 'search' ? b : '';
    scrollTo(0, 0);
    const _k = assignRouteKey(fresh);
    switch (a) {
        case 'history':
        case 'bookmarks':
            renderHistoryPage(a == 'bookmarks' ? 'bookmarks' : b);
            break;
        case 't':
        case 'tweet':
            renderThread(b);
            break;
        case 'at':
            renderTimelineAt(b);
            break;
        case 'explore':
            renderExplore(b || undefined);
            break;
        case 'search':
            renderSearchPage(b);
            break;
        case 'tweets':
            renderProfile(b);
            break;
        case 'media':
            renderProfile('media');
            break;
        default:
            renderExplore();
    }
    finishRoute(_k, a);
}

try {
    history.scrollRestoration = 'manual';
}
catch (e) {
}

/**
 * Remember the scroll position of the page we are leaving so Back can restore it.
 * The row count comes from the list on screen, so a Back navigation can pre-render that many rows before scrolling.
 */
function saveScrollPosition(fresh) {
    if (state.nav.key == null || fresh)
        return;
    const k = history.state && history.state.k;
    if (k !== state.nav.key) {
        const list = getActiveList();
        state.scrollMemory.set(state.nav.key, { y: scrollY, n: list ? list.rendered : 0 });
    }
}

/**
 * Work out which history entry we are showing and which way we got here, and record it once in state.nav.
 * A key already in scrollMemory (and not the one we are on) means Back/forward to a visited page, whose scroll position we restore.
 */
function assignRouteKey(fresh) {
    const st = history.state;
    let k = st && st.k;
    let direction = 'forward';
    if (k == null) {
        k = ++state.historyKeyCounter;
        try {
            history.replaceState(Object.assign({}, st, { k }), '');
        }
        catch (e) {
        }
    }
    else if (fresh)
        direction = 'refresh';
    else if (state.scrollMemory.has(k) && k !== state.nav.key)
        direction = 'back';
    state.nav = { key: k, direction, restore: direction == 'back' ? state.scrollMemory.get(k) : null };
    return k;
}

function finishRoute(k, a) {
    const restore = state.nav.restore;
    state.nav.restore = null;
    if (restore && a != 'at') {
        // The list renders the saved rows synchronously while the page renders, so by the time we are here the
        // target rows are in the DOM and one scroll lands it (the list handle confirms the count).
        const list = getActiveList();
        if (!list || list.rendered >= restore.n)
            scrollTo(0, restore.y);
    }
}

/**
 * Registers this module's global event listeners. Called once from main.js.
 */
export function initRouter() {
    addEventListener('hashchange', () => handleRoute());
}
