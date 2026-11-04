/**
 * Detects a trailing URL in a tweet and turns it into a quote-tweet card or a link card.
 */

import { escapeHtml } from '../core/dom.js';
import { VIDEO_URL_RX, formatDate } from '../core/format.js';
import { ICONS, icon } from '../core/icons.js';
import { displayName } from '../core/identity.js';
import { state } from '../core/state.js';
import { avatar, remoteAvatar } from '../ui/avatar.js';

/* ===== embedded quote-tweet and link cards ===== */
const TWITTER_HOST_RX = /^(?:www\.|mobile\.)?(?:twitter|x)\.com$/i;

function youtubeId(u) {
    const h = u.hostname.replace(/^(?:www\.|m\.)/, '');
    const p = u.pathname.split('/').filter(Boolean);
    let id = '';
    if (h == 'youtu.be')
        id = p[0] || '';
    else if (h == 'youtube.com')
        id = u.searchParams.get('v') || (['embed', 'shorts', 'live'].includes(p[0]) ? p[1] : '') || '';
    return /^[\w-]{11}$/.test(id) ? id : '';
}

function quoteCardHtml(user, id, url) {
    const Q = state.tweetsById[id];
    if (Q && !Q.rt) {
        const X = Q.x.replace(/(?:\s*https?:\/\/\S+)+\s*$/, '').trim();
        const im = Q.m.find(p => !VIDEO_URL_RX.test(p));
        return `<div class="qcard" data-go="/t/${id}" role="link" tabindex="0"><div class="qhd">${avatar()}<div class="qn"><b>${escapeHtml(displayName())}</b><span class="mu">@${escapeHtml(state.ownerHandle)} · ${formatDate(Q.t)}</span></div></div>${X ? `<div class="qtx">${escapeHtml(X)}</div>` : ''}${im ? `<div class="qmd"><img loading="lazy" decoding="async" alt="" src="${escapeHtml(im)}" data-fallback="remove-parent"></div>` : ''}</div>`;
    }
    return `<div class="qcard qx" data-xid="${id}" data-xu="${escapeHtml(user)}" data-ext="${escapeHtml(url)}" role="link"><div class="qhd">${remoteAvatar()}<b>@${escapeHtml(user)}</b><span class="mu">· Post</span></div><div class="qtx mu">Loading post…</div></div>`;
}

function linkCardHtml(u, url) {
    const host = u.hostname.replace(/^www\./, '');
    const yt = youtubeId(u);
    let seg = u.pathname.split('/').filter(Boolean).pop() || '';
    try {
        seg = decodeURIComponent(seg);
    }
    catch (e) {
    }
    let ti = yt ? 'Video on YouTube' : seg.replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[-_+]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (!/[a-z]{3}/i.test(ti))
        ti = host;
    ti = ti[0].toUpperCase() + ti.slice(1);
    if (ti.length > 90)
        ti = ti.slice(0, 89) + '…';
    return `<a class="lcard" href="${escapeHtml(url)}" target="_blank" rel="noopener">${yt ? `<div class="lcm"><img loading="lazy" decoding="async" alt="" src="https://i.ytimg.com/vi/${yt}/hqdefault.jpg" data-fallback="remove-parent"><span class="pl">▶</span></div>` : ''}<div class="lcb"><div class="lcd">${icon(ICONS.link, 14)}${escapeHtml(host)}</div><div class="lct">${escapeHtml(ti)}</div></div></a>`;
}

/**
 * Split a trailing quote-tweet / link URL from the tweet text. Returns {t: remaining text, h: card html}.
 */
export function extractEmbed(x, hm) {
    let t = x;
    for (let g = 0; g < 4; g++) {
        const m = /(?:^|\s)(https?:\/\/[^\s]+)\s*$/.exec(t);
        if (!m)
            break;
        let u;
        try {
            u = new URL(m[1]);
        }
        catch (e) {
            break;
        }
        if (TWITTER_HOST_RX.test(u.hostname)) {
            const p = u.pathname.split('/').filter(Boolean);
            if ((p[1] == 'status' || p[1] == 'statuses') && /^\d+$/.test(p[2] || '')) {
                if (p[3] == 'photo' || p[3] == 'video') {
                    if (hm) {
                        t = t.slice(0, m.index);
                        continue;
                    }
                    break;
                }
                return { t: t.slice(0, m.index).replace(/\s+$/, ''), h: quoteCardHtml(p[0], p[2], m[1]) };
            }
            break;
        }
        if (hm || /^t\.co$/i.test(u.hostname) || m[1].includes('…'))
            break;
        return { t: t.slice(0, m.index).replace(/\s+$/, ''), h: linkCardHtml(u, m[1]) };
    }
    return { t: t.replace(/\s+$/, ''), h: '' };
}
