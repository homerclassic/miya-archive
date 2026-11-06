/**
 * The tweet card: the single most reused piece of markup in the app.
 */

import { escapeHtml } from '../core/dom.js';
import { formatCount, formatDate, formatDateTime } from '../core/format.js';
import { ICONS, ICON_REPLY_PATH, ICON_RETWEET_PATH, ICON_SHARE_PATH, filledIcon, icon } from '../core/icons.js';
import { displayName } from '../core/identity.js';
import { state } from '../core/state.js';
import { extractEmbed } from '../embeds/embed.js';
import { avatar, remoteAvatar } from './avatar.js';
import { bookmarkVisual, likeVisual } from './like-bookmark.js';
import { profileAnchor, richText } from './rich-text.js';

/**
 * Render one tweet as HTML.
 *
 * Options: f = focused (large) layout, h = highlighted, k = draw thread connector line, d = reply depth.
 */
export function tweetCard(t, o = {}) {
    const O = t.so ? t.o : null;
    const P = O || t;
    const R = !!(t.rt && t.ra && !t.so);
    const W = R ? t.ra : state.ownerHandle;
    const X = O ? O.x : t.rt ? t.rb : t.x;
    const sm = !R && !!(O || !t.rt);
    const ms = t.m.length ? t.m : O ? O.m : [];
    const D = O ? O.t : t.t;
    const lv = likeVisual(P.id, sm ? P.l : 0);
    const bv = bookmarkVisual(P.id);
    const n = sm ? (state.repliesByParent[P.id] || []).length : 0;
    const lead = R ? '' : (X.match(/^(?:@\w+\s+)+/) || [''])[0];
    // Drop the author's own handle: "Replying to @self" wastes a line on self-replies.
    const hs = [...new Set(lead.match(/@\w+/g) || (P.rh && !P.rt ? ['@' + P.rh] : []))].filter(h => h.slice(1).toLowerCase() != W.toLowerCase());
    const body = R ? X : X.slice(lead.length);
    const rl = hs.length ? `<div class="mu">Replying to ${hs.slice(0, 2).map(h => profileAnchor(h, '', h)).join(' and ')}${hs.length > 2 ? ` and ${hs.length - 2} other${hs.length > 3 ? 's' : ''}` : ''}</div>` : '';
    const em = extractEmbed(body, ms.length > 0);
    const tx = em.t.trim() ? `<div class="tx">${richText(em.t)}</div>` : '';
    const rtl = t.rt ? `<div class="rtl"><span class="ri">${filledIcon(ICON_RETWEET_PATH, 14)}</span><a class="rtn" href="#/tweets">${escapeHtml(displayName())} Retweeted</a></div>` : '';
    const md = ms.length ? `<div class="md n${Math.min(ms.length, 4)}">${ms.slice(0, 4).map(p => /\.(?:mp4|mov|m4v|webm)(?:[?#]|$)/i.test(p) ? `<div class="mf">${icon(ICONS.vid, 20)}<span>Video not included in this archive</span></div>` : `<span class="mi" role="button" tabindex="0" aria-label="View image"><img loading="lazy" decoding="async" alt="" src="${escapeHtml(p)}" data-fallback="placeholder"></span>`).join('')}</div>` : '';
    const c = v => sm && v ? formatCount(v) : '';
    const ac = `<div class="ac"><span class="a b" title="Replies in archive">${filledIcon(ICON_REPLY_PATH, 18)}<i>${n ? formatCount(n) : ''}</i></span><span class="a g" title="Draft as a post on X" data-rt="${P.id}">${filledIcon(ICON_RETWEET_PATH, 18)}<i>${c(P.r)}</i></span><span class="a p${lv.on ? ' on' : ''}" title="Like" data-b="${sm ? P.l : 0}">${filledIcon(lv.path, 18)}<i>${lv.count ? formatCount(lv.count) : ''}</i></span><span class="a k${bv.on ? ' on' : ''}" title="Bookmark">${filledIcon(bv.path, 18)}</span><span class="a s" role="button" tabindex="0" title="Share" aria-haspopup="menu" data-sh="${P.id}">${filledIcon(ICON_SHARE_PATH, 18)}</span></div>`;
    const pic = profileAnchor(W, 'avl2', R ? remoteAvatar(W) : avatar());
    const nm = profileAnchor(W, 'nm', R ? `<b>${escapeHtml(W)}</b>` : `<b>${escapeHtml(displayName())}</b>`);
    const at = profileAnchor(W, 'nm mu', '@' + escapeHtml(W));
    const cl = `tw${o.f ? ' fo' : ''}${o.h ? ' hl' : ''}${o.k ? ' link' : ''}${o.d ? ' d' : ''}`;
    const id = `data-id="${P.id}" id="t${t.id}"`;
    if (o.f)
        return `<article class="${cl}" ${id}>${rtl}<div class="fh">${pic}<div>${nm}<div class="mu">${profileAnchor(W, 'nm', '@' + escapeHtml(W))}</div></div></div>${rl}${tx}${md}${em.h}<div class="mu ts">${new Date(D).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' })} · ${formatDate(D)}</div>${!sm ? '' : `<div class="st"><span><b>${P.r.toLocaleString()}</b> Retweets</span><span><b class="lkn" data-b="${P.l}">${lv.count.toLocaleString()}</b> Likes</span></div>`}${ac}</article>`;
    return `<article class="${cl}" ${id}>${rtl}<div class="col">${pic}</div><div class="bd"><div class="hd">${nm}<div class="hs">${at}<span class="mu">·</span><a class="tm" href="#/t/${P.id}"><time class="mu" title="${formatDateTime(D)}${O ? ' · retweeted ' + formatDateTime(t.t) : ''}">${formatDate(D)}</time></a></div></div>${rl}${tx}${md}${em.h}${ac}</div></article>`;
}
