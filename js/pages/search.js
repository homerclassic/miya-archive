/**
 * Search page and result list.
 */

import { $, main } from '../core/dom.js';
import { ICONS, icon } from '../core/icons.js';
import { state } from '../core/state.js';
import { openAdvancedSearch } from '../search/advanced-modal.js';
import { SORT_LABELS, parseQuery, runSearch, tokenizeQuery } from '../search/query.js';
import { setSearchQuery } from '../search/search-state.js';
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
    main.innerHTML = pageHeader('Search') + `<div class="sh"><div class="sb sbm">${icon(ICONS.srch, 18)}<input type="search" id="qm" placeholder="Search" autocomplete="off" spellcheck="false"></div><div class="nar" style="margin:0 0 10px"><a id="adv2">Advanced search</a></div></div><div class="bar" id="cnt"></div><div id="l"></div>`;
    const qm = $('#qm');
    qm.value = q;
    let tm;
    qm.oninput = () => {
        clearTimeout(tm);
        tm = setTimeout(() => setSearchQuery(qm.value, { src: '#qm' }), 150);
    };
    qm.onkeydown = e => {
        if (e.key == 'Enter') {
            clearTimeout(tm);
            setSearchQuery(qm.value, { src: '#qm' });
            qm.blur();
        }
    };
    $('#adv2').onclick = openAdvancedSearch;
    renderSearchResults();
    if (!q.trim() && !matchMedia('(pointer:coarse)').matches)
        qm.focus();
}
