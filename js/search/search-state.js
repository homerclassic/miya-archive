/**
 * Keeps the search box, the URL and the result list in sync.
 */

import { $, encodeUri, navigate } from '../core/dom.js';
import { state } from '../core/state.js';
import { renderSearchResults } from '../pages/search.js';

export const isSearchRoute = () => location.hash.startsWith('#/search/');

export function setSearchQuery(q, o = {}) {
    state.searchQuery = q;
    try {
        const u = '#/search/' + encodeUri(q);
        o.push ? (state.currentHistoryKey != null && state.scrollMemory.set(state.currentHistoryKey, { y: scrollY, n: state.renderedCount || 0 }), history.pushState({ k: ++state.historyKeyCounter }, '', u), state.currentHistoryKey = state.historyKeyCounter) : history.replaceState(history.state, '', u);
    }
    catch (e) {
    }
    for (const s of ['#sq', '#qm'])
        if (s != o.src) {
            const el = $(s);
            if (el && el.value !== q)
                el.value = q;
        }
    renderSearchResults();
}

export function submitSearchBox(v) {
    if (isSearchRoute())
        setSearchQuery(v, { src: '#sq' });
    else if (v.trim())
        navigate('/search/' + encodeUri(v));
}
