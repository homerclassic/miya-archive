/**
 * Renders embedded X posts (loaded, loading, unavailable, error) and hydrates them lazily as they scroll into view.
 */

import { escapeHtml } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { forgetPost, getEmbeddedPost, linkifyEmbedText } from './x-fetch.js';
import { remoteAvatar } from '../ui/avatar.js';
import { profileAnchor } from '../ui/rich-text.js';

const X_LOGO_SVG = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>';

const VERIFIED_BADGE = '<span class="qvf" title="Verified"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-label="Verified account"><path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91C2.88 9.33 2 10.57 2 12s.88 2.67 2.19 3.34c-.46 1.39-.2 2.9.81 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z"/></svg></span>';

const compactNumber = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });

const embedUrl = el => el.dataset.xurl || (el.dataset.xurl = el.dataset.ext || `https://x.com/${el.dataset.xu}/status/${el.dataset.xid}`);

const embedHeader = (av, name, sub, extra) => `<div class="qhd">${av}<div class="qid"><div class="qnm"><b>${name}</b>${extra || ''}</div><div class="qsub">${sub}</div></div></div>`;

function renderEmbeddedPost(el, p) {
    const id = el.dataset.xid;
    const s = p.s || el.dataset.xu;
    const url = `https://x.com/${s}/status/${id}`;
    let dt = '';
    try {
        dt = new Date(p.t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
        if (dt == 'Invalid Date')
            dt = '';
    }
    catch (e) {
    }
    el.className = 'qcard qx';
    el.dataset.embedState = 'loaded';
    el.removeAttribute('aria-busy');
    el.dataset.ext = el.dataset.xurl = url;
    const av = p.a ? remoteAvatar().replace(/<\/div>$/, `<img alt="" loading="lazy" decoding="async" src="${escapeHtml(p.a.replace('_normal.', '_bigger.'))}" data-fallback="remove"></div>`) : remoteAvatar();
    const head = `<div class="qhd">${profileAnchor(s, 'avl2', av)}<div class="qid"><div class="qnm">${profileAnchor(s, 'nm', `<b>${escapeHtml(p.n || s)}</b>`)}${p.v ? VERIFIED_BADGE : ''}</div><div class="qsub">${profileAnchor(s, 'nm', '@' + escapeHtml(s))}${dt ? ' · ' + dt : ''}</div></div><span class="qlogo">${X_LOGO_SVG}</span></div>`;
    const rp = p.rp && p.rp.toLowerCase() != (s || '').toLowerCase() ? `<div class="qrp">Replying to <a href="https://x.com/${escapeHtml(p.rp)}" target="_blank" rel="noopener">@${escapeHtml(p.rp)}</a></div>` : '';
    const tx = p.x ? `<div class="qtx">${linkifyEmbedText(p.x)}</div>` : '';
    const md = (p.m && p.m.length) ? `<div class="qg">${p.m.map(m => `<div class="qgi">${m.k == 'animated_gif' && m.v ? `<video src="${escapeHtml(m.v)}" poster="${escapeHtml(m.u)}" autoplay loop muted playsinline></video><span class="qb">GIF</span>` : `<img loading="lazy" decoding="async" alt="" src="${escapeHtml(m.u)}" data-fallback="embed-media">${m.k == 'video' ? '<span class="pl">▶</span>' : ''}`}</div>`).join('')}</div>` : '';
    const q = p.q ? `<div class="qn"><div class="qnm"><b>${escapeHtml(p.q.n || p.q.s)}</b><span class="mu">@${escapeHtml(p.q.s)}</span></div>${p.q.x ? `<div class="qt">${escapeHtml(p.q.x)}</div>` : ''}</div>` : '';
    const ft = `<div class="qft">${p.r ? `<span title="Replies">${icon('<path d="M21 12a8 8 0 0 1-11.5 7.2L3 21l1.8-5.5A8 8 0 1 1 21 12z"/>', 15)}${compactNumber.format(p.r)}</span>` : ''}${p.l ? `<span title="Likes">${icon('<path d="M12 21s-7.5-4.6-9.5-9.2C1.2 8.6 3 5 6.5 5c2 0 3.5 1.1 5.5 3.2C14 6.1 15.5 5 17.5 5 21 5 22.8 8.6 21.500 11.800 19.500 16.400 12 21 12 21z"/>', 15)}${compactNumber.format(p.l)}</span>` : ''}<a href="${escapeHtml(url)}" target="_blank" rel="noopener">View on X ↗</a></div>`;
    el.innerHTML = head + rp + tx + md + q + ft;
}

function showEmbedSkeleton(el) {
    el.className = 'qcard qx';
    el.dataset.embedState = 'loading';
    el.setAttribute('aria-busy', 'true');
    el.innerHTML = '<div class="qhd"><div class="qsk qsa"></div><div class="qid"><div class="qsk" style="width:38%;height:12px"></div><div class="qsk" style="width:26%;height:10px;margin-top:7px"></div></div></div><div class="qsk" style="width:94%;height:12px;margin-top:16px"></div><div class="qsk" style="width:72%;height:12px;margin-top:9px"></div>';
}

const openOnXLink = el => `<div class="qfa"><a class="qact" href="${escapeHtml(embedUrl(el))}" target="_blank" rel="noopener">Open on X ↗</a></div>`;

const embedIcon = d => `<div class="qsa qic">${icon(d, 18)}</div>`;

/* X refuses to show it. It doesn't say why for private accounts, so don't claim "not found": say what it could be and let the reader try X directly. */
function renderUnavailable(el, text) {
    const t = (text || '').replace(/\s*Learn more\.?\s*$/i, '').trim();
    el.className = 'qcard qx qgone';
    el.dataset.embedState = 'unavailable';
    el.removeAttribute('aria-busy');
    el.innerHTML = embedHeader(embedIcon('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'), 'This post isn’t available', profileAnchor(el.dataset.xu, 'nm', '@' + escapeHtml(el.dataset.xu))) + (t ? `<div class="qtx mu">${escapeHtml(t)}</div>` : '') + openOnXLink(el);
}

/* Couldn't reach X at all: retryable, and says so instead of implying the post is gone. */
function renderLoadError(el) {
    el.className = 'qcard qx qgone qerr';
    el.dataset.embedState = 'error';
    el.removeAttribute('aria-busy');
    el.innerHTML = embedHeader(embedIcon('<circle cx="12" cy="12" r="9"/><path d="M12 7.5V13M12 16.5v.01"/>'), 'Couldn’t load this post', profileAnchor(el.dataset.xu, 'nm', '@' + escapeHtml(el.dataset.xu))) + `<div class="qtx mu">${navigator.onLine ? 'X’s embed service didn’t respond.' : 'You’re offline.'}</div>` + openOnXLink(el);
}

const hydrateEmbed = el => getEmbeddedPost(el.dataset.xid, el.dataset.xu).then(r => r.gone != null ? renderUnavailable(el, r.gone) : renderEmbeddedPost(el, r.p), () => renderLoadError(el));

const embedObserver = new IntersectionObserver(es => es.forEach(en => {
    if (en.isIntersecting) {
        embedObserver.unobserve(en.target);
        hydrateEmbed(en.target);
    }
}), { rootMargin: '500px 0px' });

/**
 * Registers this module's global event listeners. Called once from main.js.
 */
export function initXRender() {
    document.addEventListener('click', e => {
        const b = e.target.closest('[data-xr]');
        if (!b)
            return;
        const el = b.closest('.qx');
        if (!el)
            return;
        e.preventDefault();
        e.stopPropagation();
        forgetPost(el.dataset.xid);
        showEmbedSkeleton(el);
        hydrateEmbed(el);
    }, true);
    addEventListener('online', () => document.querySelectorAll('.qx.qerr').forEach(el => {
        forgetPost(el.dataset.xid);
        showEmbedSkeleton(el);
        hydrateEmbed(el);
    }));
    new MutationObserver(ms => {
        for (const m of ms)
            for (const n of m.addedNodes) {
                if (n.nodeType != 1)
                    continue;
                const l = n.matches('.qx[data-xid]') ? [n] : [...n.querySelectorAll('.qx[data-xid]')];
                l.forEach(e => {
                    if (!e.dataset.h) {
                        e.dataset.h = 1;
                        embedObserver.observe(e);
                    }
                });
            }
    }).observe(document.body, { childList: true, subtree: true });
}
