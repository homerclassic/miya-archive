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

export const navKey = a => a == 'search' || a == 'history' ? a : a == 'bookmarks' ? 'history' : a == 'tweets' || a == 'media' || a == 't' || a == 'at' ? 'tweets' : '';

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
    document.querySelectorAll('nav a[data-n]').forEach(x => x.classList.toggle('on', x.dataset.n == navKey(a)));
    if (!state.tweets.length)
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
 */
function saveScrollPosition(fresh) {
    if (state.currentHistoryKey == null || fresh)
        return;
    const k = history.state && history.state.k;
    if (k !== state.currentHistoryKey)
        state.scrollMemory.set(state.currentHistoryKey, { y: scrollY, n: state.renderedCount || 0 });
}

function assignRouteKey(fresh) {
    state.renderedCount = 0;
    const st = history.state;
    let k = st && st.k;
    let back = false;
    if (k == null) {
        k = ++state.historyKeyCounter;
        try {
            history.replaceState(Object.assign({}, st, { k }), '');
        }
        catch (e) {
        }
    }
    else if (!fresh)
        back = state.scrollMemory.has(k) && k !== state.currentHistoryKey;
    state.pendingRestore = back ? state.scrollMemory.get(k) : null;
    return k;
}

function finishRoute(k, a) {
    state.currentHistoryKey = k;
    if (state.pendingRestore && a != 'at') {
        const y = state.pendingRestore.y;
        const ap = () => scrollTo(0, y);
        ap();
        requestAnimationFrame(ap);
        setTimeout(ap, 250);
    }
    state.pendingRestore = null;
}

/**
 * Registers this module's global event listeners. Called once from main.js.
 */
export function initRouter() {
    addEventListener('hashchange', () => handleRoute());
    document.addEventListener('keydown', e => {
        if (e.key == 'Escape') {
            const w = $('#sw');
            w && w.classList.remove('open');
        }
    });
    document.addEventListener('mousedown', e => {
        if (!e.target.closest('#sw')) {
            const w = $('#sw');
            w && w.classList.remove('open');
        }
    });
}
