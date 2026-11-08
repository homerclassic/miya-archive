/**
 * Profile page: banner, bio and the Tweets / Replies / Media tabs.
 */

import { PROFILE_BIO, WEBSITE_LABEL, WEBSITE_URL } from '../core/config.js';
import { $, escapeHtml, main } from '../core/dom.js';
import { formatDate } from '../core/format.js';
import { ICONS, ICON_CALENDAR_PATH, ICON_LINK_PATH, filledIcon, icon } from '../core/icons.js';
import { displayName, isFeaturedProfile } from '../core/identity.js';
import { state, toggleOldestFirst } from '../core/state.js';
import { avatar } from '../ui/avatar.js';
import { renderLazyList } from '../ui/lazy-list.js';
import { pageHeader } from '../ui/page-header.js';
import { highlightHtml, linkify } from '../ui/rich-text.js';
import { moveTabsIndicator } from '../ui/tabs-indicator.js';
import { tweetCard } from '../ui/tweet-card.js';

const PROFILE_TABS = [['', 'Tweets'], ['replies', 'Tweets &amp; replies'], ['media', 'Media']];

/**
 * Items + card for one profile tab, shared by the page render and the swipe preview.
 * `isGrid` is true only for Media (image cells instead of tweet cards).
 */
function getProfileTabItems(kind = '') {
    const iv = p => !/\.(?:mp4|mov|m4v|webm)(?:[?#]|$)/i.test(p);
    const L = kind == 'media' ? state.tweets.filter(t => !t.rt && t.m.some(iv)) : kind == 'replies' ? state.tweets.slice() : state.tweets.filter(t => !(t.rp || t.rh));
    if (!state.oldestFirst)
        L.reverse();
    if (kind == 'media') {
        const G = L.flatMap(t => t.m.filter(iv).slice(0, 4).map(p => ({ t, p })));
        return { items: G, fn: x => `<span class="mi" role="button" tabindex="0" aria-label="View image" data-id="${x.t.id}"><img loading="lazy" decoding="async" alt="" src="${escapeHtml(x.p)}" data-fallback="grid-cell"></span>`, isGrid: true };
    }
    return { items: L, fn: t => tweetCard(t), isGrid: false };
}

/**
 * Profile page. `kind` is "", "replies" or "media".
 */
export function renderProfile(kind = '') {
    const { items, fn, isGrid } = getProfileTabItems(kind);
    const sub = `${state.tweets.length.toLocaleString()} posts`;
    main.innerHTML = pageHeader(escapeHtml(displayName()), sub, 0, 1) + `<div class="ban"></div><div class="pf">${avatar('xl')}<h2>${escapeHtml(displayName())}</h2><div class="mu">@${escapeHtml(state.ownerHandle)}</div>${isFeaturedProfile() ? `<div class="bio">${highlightHtml(linkify(PROFILE_BIO))}</div><div class="mu pm"><span>${filledIcon(ICON_LINK_PATH, 18)}<a href="${WEBSITE_URL}" target="_blank" rel="noopener">${WEBSITE_LABEL}</a></span><span>${filledIcon(ICON_CALENDAR_PATH, 18)}${formatDate(state.tweets[0].t)} – ${formatDate(state.tweets.at(-1).t)}</span></div>` : `<div class="mu" style="margin-top:12px;display:flex;gap:6px;align-items:center">${filledIcon(ICON_CALENDAR_PATH, 16)} ${formatDate(state.tweets[0].t)} – ${formatDate(state.tweets.at(-1).t)}</div>`}</div><div class="tabs2 ptabs">${PROFILE_TABS.map(([k, n]) => `<a data-go="/tweets${k ? '/' + k : ''}" class="${k == kind ? 'on' : ''}">${n}</a>`).join('')}<div class="tabs2-ind"></div></div><div class="bar"><a id="od">${state.oldestFirst ? 'Oldest first ↑' : 'Newest first ↓'}</a></div><div id="l"${isGrid ? ' class="md mg"' : ''}></div>`;
    $('#od').onclick = () => {
        toggleOldestFirst();
        renderProfile(kind);
    };
    renderLazyList($('#l'), items, fn);
    // the oldest-first toggle re-renders the page (and its tab bar) without a route change, so re-glide the indicator
    moveTabsIndicator();
}
