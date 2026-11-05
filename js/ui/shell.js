/**
 * Static page chrome: left navigation, mobile drawer and the right-hand search column.
 */

import { $, escapeHtml } from '../core/dom.js';
import { ICONS, ICON_BOOKMARK_PATH, ICON_HOME_PATH, ICON_PROFILE_PATH, ICON_SEARCH_PATH, filledIcon, icon } from '../core/icons.js';
import { displayName } from '../core/identity.js';
import { state } from '../core/state.js';
import { openAdvancedSearch } from '../search/advanced-modal.js';
import { submitSearchBox } from '../search/search-state.js';
import { avatar } from './avatar.js';
import { closeDrawer } from './drawer.js';
import { updateGlass } from './glass.js';

/**
 * Render the left navigation, the mobile drawer and the right-hand search column, and wire the reader / quick-search switches.
 */
export function renderShell() {
    const D = document.documentElement.dataset;
    document.title = 'Miya Archive';
    $('#nav').innerHTML = `<a class="lg" href="#/">${avatar('s')}</a><a href="#/" data-n="">${filledIcon(ICON_HOME_PATH, 26)}<span class="t">Home</span></a><a href="#/tweets" data-n="tweets">${filledIcon(ICON_PROFILE_PATH, 26)}<span class="t">Tweets</span></a><a class="nhs" href="#/history" data-n="history">${filledIcon(ICON_BOOKMARK_PATH)}<span class="t">History</span></a><a class="nsr" href="#/search/" data-n="search">${filledIcon(ICON_SEARCH_PATH)}<span class="t">Search</span></a><a id="rd" class="rdb" role="switch" tabindex="0" aria-checked="false" title="Reader mode">${icon(ICONS.read, 26)}<span class="t">Reader</span><span class="sw2 t"></span></a><a id="kt" class="ktb" role="switch" tabindex="0" aria-checked="true" title="Click any frequent word in a tweet to search for it">${icon(ICONS.kw, 26)}<span class="t">Quick search</span><span class="sw2 t"></span></a>`;
    // Mobile: tapping the Search nav icon while already on the search page focuses the search field (opens the keyboard).
    document.querySelector('#nav a[data-n="search"]').addEventListener('click', e => {
        if (!matchMedia('(pointer:coarse)').matches)
            return;
        if (decodeURIComponent(location.hash.slice(2)).split('/')[0] === 'search') {
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
    dr.innerHTML = `<div class="drp">${avatar('s')}<b class="drn">${escapeHtml(displayName())}</b><div class="mu">@${escapeHtml(state.ownerHandle)}</div><div class="mu drc"><b>${state.tweets.length.toLocaleString()}</b> posts</div></div><div class="drl"><a href="#/">${filledIcon(ICON_HOME_PATH, 26)}Home</a><a href="#/tweets">${filledIcon(ICON_PROFILE_PATH, 26)}Tweets</a><a href="#/search/">${filledIcon(ICON_SEARCH_PATH)}Search</a><a href="#/history">${filledIcon(ICON_BOOKMARK_PATH)}History</a></div><div class="drsep"></div><div class="drl drs2"><a class="rdb" role="switch" tabindex="0" aria-checked="false">${icon(ICONS.read, 26)}<span>Reader mode</span><span class="sw2"></span></a><a class="ktb" role="switch" tabindex="0" aria-checked="true">${icon(ICONS.kw, 26)}<span>Quick search</span><span class="sw2"></span></a></div>`;
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
    const rds = [...document.querySelectorAll('.rdb')];
    const rs = () => rds.forEach(r => r.setAttribute('aria-checked', D.r == '1'));
    const tg = () => {
        if (D.r == '1')
            delete D.r;
        else
            D.r = '1';
        try {
            localStorage.r = D.r || '0';
        }
        catch (e) {
        }
        rs();
        updateGlass();
    };
    rs();
    rds.forEach(rd => {
        rd.onclick = tg;
        rd.onkeydown = e => {
            if (e.key == 'Enter' || e.key == ' ') {
                e.preventDefault();
                tg();
            }
        };
    });
    const kts = [...document.querySelectorAll('.ktb')];
    const ks = () => kts.forEach(k => k.setAttribute('aria-checked', D.k != '0'));
    const kg = () => {
        if (D.k == '0')
            delete D.k;
        else
            D.k = '0';
        try {
            localStorage.k = D.k || '1';
        }
        catch (e) {
        }
        ks();
    };
    ks();
    kts.forEach(kt => {
        kt.onclick = kg;
        kt.onkeydown = e => {
            if (e.key == 'Enter' || e.key == ' ') {
                e.preventDefault();
                kg();
            }
        };
    });
    $('#side').innerHTML = `<div class="sb sbs">${filledIcon(ICON_SEARCH_PATH, 18)}<input type="search" id="sq" placeholder="Search" autocomplete="off" spellcheck="false"></div><div id="sidecard" style="padding:2px 16px"></div>`;
    renderSideCard();
    const sq = $('#sq');
    let tm;
    sq.oninput = () => {
        clearTimeout(tm);
        tm = setTimeout(() => submitSearchBox(sq.value), 180);
    };
    sq.onkeydown = e => {
        if (e.key == 'Enter') {
            clearTimeout(tm);
            submitSearchBox(sq.value);
        }
    };
    $('#sidecard').onclick = e => {
        if (e.target.closest('[data-adv]'))
            openAdvancedSearch();
    };
}

export function renderSideCard() {
    const el = $('#sidecard');
    if (el)
        el.innerHTML = '<a data-adv="1">Advanced search</a>';
}
