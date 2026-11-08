/**
 * Static page chrome: left navigation, mobile drawer and the right-hand search column.
 */

import { $, escapeHtml } from '../core/dom.js';
import { ICONS, ICON_BOOKMARK_FILLED_PATH, ICON_BOOKMARK_PATH, ICON_HOME_OUTLINE_PATH, ICON_HOME_PATH, ICON_PROFILE_OUTLINE_PATH, ICON_PROFILE_PATH, ICON_SEARCH_OUTLINE_PATH, ICON_SEARCH_PATH, filledIcon, icon, ICON_CLEAR_PATH } from '../core/icons.js';
import { displayName } from '../core/identity.js';
import { state } from '../core/state.js';
import { openAdvancedSearch } from '../search/advanced-modal.js';
import { syncClearButton } from '../search/search-state.js';
import { handleSuggestKey, hideSuggestions, showSuggestions } from '../search/suggestions.js';
import { avatar } from './avatar.js';
import { closeDrawer } from './drawer.js';
import { updateGlass } from './glass.js';

/**
 * Render the left navigation, the mobile drawer and the right-hand search column, and wire the reader / quick-search switches.
 */
export function renderShell() {
    const D = document.documentElement.dataset;
    document.title = 'Miya Archive';
    $('#nav').innerHTML = `<div class="nav-hl"></div><a class="lg" href="#/">${avatar('s')}</a><a href="#/" data-n="">${filledIcon(ICON_HOME_OUTLINE_PATH, 26, 'ic-o')}${filledIcon(ICON_HOME_PATH, 26, 'ic-f')}<span class="t">Home</span></a><a class="nsr" href="#/search/" data-n="search">${filledIcon(ICON_SEARCH_OUTLINE_PATH, 24, 'ic-o')}${filledIcon(ICON_SEARCH_PATH, 24, 'ic-f')}<span class="t">Search</span></a><a class="nhs" href="#/history" data-n="history">${filledIcon(ICON_BOOKMARK_PATH, 26, 'ic-o')}${filledIcon(ICON_BOOKMARK_FILLED_PATH, 26, 'ic-f')}<span class="t">History</span></a><a href="#/tweets" data-n="tweets">${filledIcon(ICON_PROFILE_OUTLINE_PATH, 26, 'ic-o')}${filledIcon(ICON_PROFILE_PATH, 26, 'ic-f')}<span class="t">Tweets</span></a><div class="drsep"></div><a id="rd" class="rdb" role="switch" tabindex="0" aria-checked="false" title="Reader mode">${icon(ICONS.read, 26)}<span class="t">Reader</span><span class="sw2 t"></span></a><a id="kt" class="ktb" role="switch" tabindex="0" aria-checked="true" title="Click any frequent word in a tweet to search for it">${icon(ICONS.kw, 26)}<span class="t">Quick search</span><span class="sw2 t"></span></a>`;
    // Mobile: tapping the Search nav icon while already on the search page focuses the search field (opens the keyboard).
    document.querySelector('#nav a[data-n="search"]').addEventListener('click', e => {
        if (!matchMedia('(pointer:coarse)').matches)
            return;
        if (state.route.section == 'search') {
            e.preventDefault();
            const qm = $('#qm');
            if (qm)
                qm.focus();
        }
    });
    document.querySelectorAll('#dr,#drb').forEach(x => x.remove());
    const drb = document.createElement('div');
    drb.id = 'drb';
    drb.onclick = closeDrawer;
    const dr = document.createElement('div');
    dr.id = 'dr';
    dr.setAttribute('role', 'dialog');
    dr.setAttribute('aria-label', 'Menu');
    dr.innerHTML = `<div class="drp">${avatar('s')}<b class="drn">${escapeHtml(displayName())}</b><div class="mu">@${escapeHtml(state.ownerHandle)}</div><div class="mu drc"><b>${state.tweets.length.toLocaleString()}</b> posts</div></div><div class="drl"><a href="#/" data-n="">${filledIcon(ICON_HOME_OUTLINE_PATH, 26, 'ic-o')}${filledIcon(ICON_HOME_PATH, 26, 'ic-f')}Home</a><a href="#/search/" data-n="search">${filledIcon(ICON_SEARCH_OUTLINE_PATH, 24, 'ic-o')}${filledIcon(ICON_SEARCH_PATH, 24, 'ic-f')}Search</a><a href="#/history" data-n="history">${filledIcon(ICON_BOOKMARK_PATH, 26, 'ic-o')}${filledIcon(ICON_BOOKMARK_FILLED_PATH, 26, 'ic-f')}History</a><a href="#/tweets" data-n="tweets">${filledIcon(ICON_PROFILE_OUTLINE_PATH, 26, 'ic-o')}${filledIcon(ICON_PROFILE_PATH, 26, 'ic-f')}Tweets</a></div><div class="drsep"></div><div class="drl drs2"><a class="rdb" role="switch" tabindex="0" aria-checked="false">${icon(ICONS.read, 26)}<span>Reader mode</span><span class="sw2"></span></a><a class="ktb" role="switch" tabindex="0" aria-checked="true">${icon(ICONS.kw, 26)}<span>Quick search</span><span class="sw2"></span></a></div>`;
    dr.onclick = e => {
        const a = e.target.closest('a');
        if (!a)
            return;
        if (a.hasAttribute('data-adv')) {
            closeDrawer();
            openAdvancedSearch();
        }
        else if (a.getAttribute('href'))
            closeDrawer();
    };
    document.body.append(drb, dr);
    // Reader / quick-search toggles: one named boolean each (true = on), initialized from
    // the dataset index.html set from localStorage. A single setter mirrors each boolean to
    // the dataset, localStorage and aria-checked; the dataset keeps its current convention
    // (data-r='1' = on, absent = off; data-k='0' = off, absent = on) because CSS reads it.
    state.readerMode = D.r == '1';
    state.quickSearch = D.k != '0';
    const rds = [...document.querySelectorAll('.rdb')];
    const setReaderMode = on => {
        state.readerMode = !!on;
        if (state.readerMode)
            D.r = '1';
        else
            delete D.r;
        try {
            localStorage.r = state.readerMode ? '1' : '0';
        }
        catch (e) {
        }
        rds.forEach(r => r.setAttribute('aria-checked', state.readerMode));
        updateGlass();
    };
    // init: only sync aria-checked from the named booleans (mirrors already correct from index.html)
    rds.forEach(r => r.setAttribute('aria-checked', state.readerMode));
    rds.forEach(rd => {
        rd.onclick = () => setReaderMode(!state.readerMode);
        rd.onkeydown = e => {
            if (e.key == 'Enter' || e.key == ' ') {
                e.preventDefault();
                setReaderMode(!state.readerMode);
            }
        };
    });
    const kts = [...document.querySelectorAll('.ktb')];
    const setQuickSearch = on => {
        state.quickSearch = !!on;
        if (state.quickSearch)
            delete D.k;
        else
            D.k = '0';
        try {
            localStorage.k = state.quickSearch ? '1' : '0';
        }
        catch (e) {
        }
        kts.forEach(k => k.setAttribute('aria-checked', state.quickSearch));
    };
    // init: only sync aria-checked from the named booleans
    kts.forEach(k => k.setAttribute('aria-checked', state.quickSearch));
    kts.forEach(kt => {
        kt.onclick = () => setQuickSearch(!state.quickSearch);
        kt.onkeydown = e => {
            if (e.key == 'Enter' || e.key == ' ') {
                e.preventDefault();
                setQuickSearch(!state.quickSearch);
            }
        };
    });
    $('#side').innerHTML = `<div class="sb sbs">${filledIcon(ICON_SEARCH_PATH, 16)}<input type="search" id="sq" placeholder="Search" autocomplete="off" spellcheck="false"><span class="sb-clr">${filledIcon(ICON_CLEAR_PATH, 20)}</span></div><div id="sidecard" style="padding:2px 16px"></div>`;
    renderSideCard();
    const sq = $('#sq');
    const sqClr = sq.parentElement.querySelector('.sb-clr');
    // Named blur-hide timer for the dropdown (null = none pending, cancelled on refocus).
    let hideTimer = null;
    syncClearButton(sq);
    // typing shows suggestions instead of jumping to the search page; Enter or a click runs the search
    sq.oninput = () => { showSuggestions(sq); syncClearButton(sq); };
    sq.onkeydown = e => { handleSuggestKey(sq, e); };
    sq.onfocus = () => {
        if (hideTimer !== null) {
            clearTimeout(hideTimer);
            hideTimer = null;
        }
        showSuggestions(sq);
    };
    sq.onblur = () => {
        hideTimer = setTimeout(() => { hideTimer = null; hideSuggestions(sq); }, 120);
    };
    sqClr.addEventListener('mousedown', e => {
        e.preventDefault();
        sq.value = '';
        syncClearButton(sq);
        sq.focus();
        showSuggestions(sq);
    });
    $('#sidecard').onclick = e => {
        if (e.target.closest('[data-adv]'))
            openAdvancedSearch();
    };
}

export function renderSideCard() {
    // Advanced search lives only on the search page now (under the centre search bar), so the right column shows nothing
    const el = $('#sidecard');
    if (el)
        el.innerHTML = '';
}
