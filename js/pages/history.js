/**
 * Likes and bookmarks the visitor saved in this browser.
 */

import { $, main } from '../core/dom.js';
import { ICON_SEARCH_PATH, filledIcon } from '../core/icons.js';
import { state } from '../core/state.js';
import { renderLazyList } from '../ui/lazy-list.js';
import { pageHeader } from '../ui/page-header.js';
import { tweetCard } from '../ui/tweet-card.js';

/**
 * Likes / bookmarks page with its own search box.
 */
export function renderHistoryPage(tab) {
    tab = tab == 'likes' ? 'likes' : 'bookmarks';
    const A = { likes: [...state.likedIds].filter(id => state.tweetsById[id]).reverse(), bookmarks: state.bookmarkedIds.filter(id => state.tweetsById[id]).reverse() };
    const L = A[tab];
    const tabs = [['bookmarks', 'Bookmarks'], ['likes', 'Likes']];
    const em = (h, m) => `<div class="stub" style="padding:40px 16px;text-align:center"><b style="color:var(--tx);font-size:22px;display:block;margin-bottom:6px">${h}</b>${m}</div>`;
    main.innerHTML = pageHeader('History', `${A.likes.length.toLocaleString()} liked · ${A.bookmarks.length.toLocaleString()} bookmarked`) + `<div class="tabs2">${tabs.map(([k, n]) => `<a data-go="/history/${k}" class="${k == tab ? 'on' : ''}">${n}</a>`).join('')}</div><div class="sh"><div class="sb sbm">${filledIcon(ICON_SEARCH_PATH, 16)}<input type="search" id="hq" placeholder="Search" autocomplete="off" spellcheck="false"></div></div><div id="l"></div>`;
    const l = $('#l');
    const hq = $('#hq');
    const draw = () => {
        const ws = hq.value.toLowerCase().replace(/[’‘]/g, "'").split(/\s+/).filter(Boolean);
        const R = ws.length ? L.filter(id => {
            const t = state.tweetsById[id];
            const h = t.lc + ' ' + t.mn;
            return ws.every(w => h.includes(w));
        }) : L;
        l.innerHTML = '';
        if (R.length)
            renderLazyList(l, R, id => tweetCard(state.tweetsById[id]));
        else
            l.innerHTML = L.length ? em('No results', 'Nothing in your ' + tab + ' matches that.') : tab == 'likes' ? em('Tweets you like show up here', 'Tap the heart on any tweet.') : em('Save tweets for later', 'Tap the bookmark on any tweet to keep it here.');
    };
    // Named pending-search state (null = none pending), not a bare timeout ID.
    let pendingSearch = null;
    hq.oninput = () => {
        clearTimeout(pendingSearch);
        pendingSearch = setTimeout(() => { pendingSearch = null; draw(); }, 120);
    };
    hq.onkeydown = e => {
        if (e.key == 'Enter') {
            clearTimeout(pendingSearch);
            pendingSearch = null;
            draw();
            hq.blur();
        }
    };
    draw();
}
