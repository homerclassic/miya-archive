/**
 * Full-screen image viewer with the tweet next to it.
 */

import { navigate } from '../core/dom.js';
import { ICONS, icon } from '../core/icons.js';
import { state } from '../core/state.js';
import { attachLightboxGestures } from './lightbox-gestures.js';
import { closeShareMenu } from './post-actions.js';
import { tweetCard } from './tweet-card.js';

function lightboxPostHtml(id) {
    const P = id && state.tweetsById[id];
    if (!P)
        return '';
    const d = document.createElement('div');
    d.innerHTML = tweetCard(P, { f: 1 });
    const a = d.firstElementChild;
    if (!a)
        return '';
    a.removeAttribute('id');
    a.querySelectorAll('.md').forEach(x => x.remove());
    return `<div class="lbp">${a.outerHTML}</div>`;
}

export function closeLightbox() {
    if (!state.lightbox)
        return;
    state.lightbox.el.remove();
    document.documentElement.style.overflow = state.lightbox.ov;
    state.lightbox = null;
}

export function showLightboxImage(i) {
    const L = state.lightbox;
    L.i = i;
    if (L.g) {
        L.g.s = 1;
        L.g.x = L.g.y = 0;
        L.img.style.transition = 'none';
        L.img.style.transform = '';
    }
    L.img.src = L.srcs[i];
    if (L.mis) {
        const q = L.el.querySelector('.lbp');
        const m = L.mis[i];
        if (m && m.dataset.id)
            L.id = m.dataset.id;
        if (q && m)
            q.outerHTML = lightboxPostHtml(m.dataset.id);
    }
    const kk = L.el.querySelector('.lbk');
    if (kk)
        kk.textContent = (i + 1) + ' / ' + L.srcs.length;
    const p = L.el.querySelector('.lbn.l');
    const n = L.el.querySelector('.lbn.r');
    if (p)
        p.style.display = i > 0 ? '' : 'none';
    if (n)
        n.style.display = i < L.srcs.length - 1 ? '' : 'none';
}

function stepLightbox(d) {
    if (!state.lightbox)
        return;
    const i = state.lightbox.i + d;
    if (i >= 0 && i < state.lightbox.srcs.length)
        showLightboxImage(i);
}

/**
 * Open the image viewer for the clicked media item.
 */
export function openLightbox(mi) {
    const me = mi.querySelector('img');
    if (!me)
        return;
    const md = mi.closest('.md');
    const imgs = [...md.querySelectorAll('.mi img')];
    const art = mi.closest('.tw');
    const id = (art && art.dataset.id) || mi.dataset.id;
    const ac = art && art.querySelector('.ac');
    closeLightbox();
    closeShareMenu();
    const el = document.createElement('div');
    el.id = 'lb';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'Image viewer');
    el.innerHTML = `<div class="lbm"><button type="button" class="lbc" aria-label="Close">${icon(ICONS.lbx, 20)}</button>${id ? `<button type="button" class="lbv">View post</button>` : ''}${imgs.length > 1 && !mi.dataset.id ? `<div class="lbk"></div>` : ''}${imgs.length > 1 ? `<button type="button" class="lbn l" aria-label="Previous image">${icon(ICONS.lbl, 22)}</button><button type="button" class="lbn r" aria-label="Next image">${icon(ICONS.lbr, 22)}</button>` : ''}<div class="lbs"><img class="lbi" alt="" draggable="false"></div>${id && ac ? `<div class="tw lbtw" data-id="${id}">${ac.outerHTML}</div>` : ''}</div>${lightboxPostHtml(id)}`;
    state.lightbox = {
        el, id, mis: mi.dataset.id ? imgs.map(x => x.closest('.mi')) : null, img: el.querySelector('.lbi'), srcs: imgs.map(x => x.currentSrc || x.src), i: 0, g: { s: 1, x: 0, y: 0 }, ov: document.documentElement.style.overflow
    };
    el.onclick = e => {
        const t = e.target;
        if (t.closest('.lbc'))
            return closeLightbox();
        if (t.closest('.lbn.l'))
            return stepLightbox(-1);
        if (t.closest('.lbn.r'))
            return stepLightbox(1);
        if ((t.closest('.a.b') || t.closest('.lbv')) && (state.lightbox.id || id)) {
            const k = state.lightbox.id || id;
            closeLightbox();
            return navigate('/t/' + k);
        }
        if (t == el || t.classList.contains('lbs') || t.classList.contains('lbm') || t.classList.contains('lbtw'))
            closeLightbox();
    };
    document.documentElement.style.overflow = 'hidden';
    document.body.append(el);
    showLightboxImage(Math.max(0, imgs.indexOf(me)));
    el.querySelector('.lbc').focus();
    attachLightboxGestures();
}

/**
 * Registers this module's global event listeners. Called once from main.js.
 */
export function initLightbox() {
    addEventListener('hashchange', closeLightbox);
    document.addEventListener('keydown', e => {
        if (state.lightbox) {
            if (e.key == 'Escape')
                closeLightbox();
            else if (e.key == 'ArrowLeft')
                stepLightbox(-1);
            else if (e.key == 'ArrowRight')
                stepLightbox(1);
            return;
        }
        if ((e.key == 'Enter' || e.key == ' ') && e.target.matches && e.target.matches('.mi')) {
            e.preventDefault();
            openLightbox(e.target);
        }
    });
}
