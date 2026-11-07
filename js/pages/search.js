/**
 * Search page and result list.
 */

import { $, main } from '../core/dom.js';
import { ICON_SEARCH_PATH, filledIcon, ICON_CLEAR_PATH } from '../core/icons.js';
import { state } from '../core/state.js';
import { openAdvancedSearch } from '../search/advanced-modal.js';
import { SORT_LABELS, parseQuery, runSearch, tokenizeQuery } from '../search/query.js';
import { setSearchQuery, syncClearButton } from '../search/search-state.js';
import { handleSuggestKey, hideSuggestions, showSuggestions } from '../search/suggestions.js';
import { renderLazyList } from '../ui/lazy-list.js';
import { pageHeader } from '../ui/page-header.js';
import { tweetCard } from '../ui/tweet-card.js';

export function renderSearchResults() {
    const l = $('#l');
    const cnt = $('#cnt');
    if (!l)
        return;
    const f = parseQuery(state.searchQuery);
    state.highlightRegex = f.hrx;
    state.highlightStatus = f.hrx ? 'active' : 'none';
    l.innerHTML = '';
    if (!tokenizeQuery(state.searchQuery).length) {
        cnt.style.display = 'none';
        return;
    }
    cnt.style.display = '';
    const [R, s] = runSearch(f);
    cnt.innerHTML = `<span><b style="color:var(--tx)">${R.length.toLocaleString()}</b> ${R.length == 1 ? 'tweet' : 'tweets'}</span><span style="flex:1"></span><span>${SORT_LABELS[s]}</span>`;
    R.length ? renderLazyList(l, R, t => tweetCard(t)) : l.innerHTML = '<div class="stub">No tweets match. Try fewer words or loosen a filter in Advanced search.</div>';
}

export function renderSearchPage(q) {
    state.searchQuery = q;
    main.innerHTML = pageHeader('Search') + `<div class="sh"><div class="sb sbm">${filledIcon(ICON_SEARCH_PATH, 16)}<input type="search" id="qm" placeholder="Search" autocomplete="off" spellcheck="false"><span class="sb-clr">${filledIcon(ICON_CLEAR_PATH, 20)}</span></div><div style="margin:0 0 10px"><a id="adv2">Advanced search</a></div></div><div class="bar" id="cnt"></div><div id="l"></div>`;
    const qm = $('#qm');
    qm.value = q;
    const qmClr = qm.parentElement.querySelector('.sb-clr');
    // Named pending states (not bare timeout IDs): pendingSearch is the 150ms debounced
    // search (null = none pending); hideTimer is the 120ms blur-hide for the dropdown
    // (null = none pending, cancelled if the user refocuses in time).
    let pendingSearch = null;
    let hideTimer = null;
    syncClearButton(qm);
    qm.oninput = () => {
        showSuggestions(qm);
        syncClearButton(qm);
        clearTimeout(pendingSearch);
        pendingSearch = setTimeout(() => { pendingSearch = null; setSearchQuery(qm.value, { src: '#qm' }); }, 150);
    };
    qm.onkeydown = e => {
        // handleSuggestKey returns true for Enter in every branch, so there is no
        // fallback Enter handling here (the old duplicate block was dead code).
        if (handleSuggestKey(qm, e)) {
            if (e.key == 'Enter')
                qm.blur();
            return;
        }
    };
    qm.onfocus = () => {
        if (hideTimer !== null) {
            clearTimeout(hideTimer);
            hideTimer = null;
        }
        showSuggestions(qm);
    };
    qm.onblur = () => {
        hideTimer = setTimeout(() => { hideTimer = null; hideSuggestions(qm); }, 120);
    };
    qmClr.addEventListener('mousedown', e => {
        e.preventDefault();
        qm.value = '';
        clearTimeout(pendingSearch);
        pendingSearch = null;
        syncClearButton(qm);
        setSearchQuery('', { src: '#qm' });
        qm.focus();
        showSuggestions(qm);
    });
    $('#adv2').onclick = openAdvancedSearch;
    renderSearchResults();
    if (!q.trim() && !matchMedia('(pointer:coarse)').matches)
        qm.focus();
}
