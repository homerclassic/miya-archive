/**
 * Keeps the search box, the URL and the result list in sync.
 */

import { $, encodeUri, navigate } from '../core/dom.js';
import { state } from '../core/state.js';
import { renderSearchResults } from '../pages/search.js';
import { getActiveList } from '../ui/lazy-list.js';
import { addRecentSearch } from '../core/storage.js';

/** True when the current route is the search page (read from the router's named route, not the hash). */
export const isSearchRoute = () => state.route.section == 'search';

/**
 * Clear-button visibility for a search box: the button shows exactly when its field has text.
 * This is the single source for it (the CSS :placeholder-shown rule is gone) — call it
 * whenever a box's value changes, by typing, clearing, or syncing.
 */
export function syncClearButton(input) {
    const clr = input && input.parentElement && input.parentElement.querySelector('.sb-clr');
    if (clr)
        clr.classList.toggle('on', !!input.value);
}

/**
 * The single writer of the search boxes' values (besides the user typing in one).
 * `src` is the box whose value is already correct and must not be overwritten:
 * the box the user is typing in, or a box owned by another renderer (the router
 * passes '#qm' because renderSearchPage owns it). Every other box is set to `q`,
 * and its clear button is synced to match.
 */
export function syncSearchBoxes(q, src = null) {
    for (const s of ['#sq', '#qm'])
        if (s !== src) {
            const el = $(s);
            if (el) {
                if (el.value !== q)
                    el.value = q;
                syncClearButton(el);
            }
        }
}

export function setSearchQuery(q, o = {}) {
    state.searchQuery = q;
    try {
        const u = '#/search/' + encodeUri(q);
        if (o.push) {
            if (state.nav.key != null) {
                const list = getActiveList();
                state.scrollMemory.set(state.nav.key, { y: scrollY, n: list ? list.rendered : 0 });
            }
            history.pushState({ k: ++state.historyKeyCounter }, '', u);
            state.nav.key = state.historyKeyCounter;
        }
        else
            history.replaceState(history.state, '', u);
    }
    catch (e) {
    }
    syncSearchBoxes(q, o.src);
    renderSearchResults();
}

export function submitSearchBox(v, src = '#sq') {
    // submitting a search records it as a recent (Twitter does the same); the <2-char guard lives in addRecentSearch
    addRecentSearch(v);
    if (isSearchRoute())
        setSearchQuery(v, { src });
    else if (v.trim())
        navigate('/search/' + encodeUri(v));
}
