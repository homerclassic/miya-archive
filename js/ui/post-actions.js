/**
 * Per-tweet actions: share menu (copy link / thread PDF) and "draft on X".
 */

import { $, showToast } from '../core/dom.js';
import { ICONS, icon } from '../core/icons.js';
import { state } from '../core/state.js';
import { collectThreadIds } from '../export/thread-document.js';
import { downloadThreadPdf } from '../export/thread-export.js';

let shareMenuOpenedAt = 0;

export const closeShareMenu = () => {
    const m = $('#shm');
    if (m) {
        m.remove();
        document.querySelectorAll('.a.s.on').forEach(x => x.classList.remove('on'));
    }
};

/**
 * Open the Copy link / Download thread menu next to the share button.
 */
export function openShareMenu(btn) {
    const id = btn.dataset.sh;
    const was = $('#shm');
    if (was && was.dataset.id == id) {
        closeShareMenu();
        return;
    }
    closeShareMenu();
    shareMenuOpenedAt = Date.now();
    btn.classList.add('on');
    const m = document.createElement('div');
    m.id = 'shm';
    m.dataset.id = id;
    m.setAttribute('role', 'menu');
    m.innerHTML = `<button type="button" role="menuitem" data-a="link">${icon(ICONS.link, 18)}Copy link</button>${collectThreadIds(id).length > 1 ? `<button type="button" role="menuitem" data-a="pdf">${icon(ICONS.dl, 18)}Download thread as PDF</button>` : ''}`;
    document.body.append(m);
    const r = btn.getBoundingClientRect();
    const w = m.offsetWidth;
    const h = m.offsetHeight;
    m.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.right - w)) + 'px';
    m.style.top = (r.bottom + h + 8 > innerHeight ? r.top - h - 4 : r.bottom + 4) + 'px';
    m.onclick = e => {
        const b = e.target.closest('button');
        if (!b)
            return;
        closeShareMenu();
        b.dataset.a == 'pdf' ? downloadThreadPdf(id) : copyLink(id);
    };
    m.querySelector('button').focus();
}

function copyLink(id) {
    const u = location.href.split('#')[0] + '#/t/' + id;
    (navigator.clipboard && window.isSecureContext ? navigator.clipboard.writeText(u) : Promise.reject()).catch(() => {
        const t = document.createElement('textarea');
        t.value = u;
        t.style.cssText = 'position:fixed;opacity:0';
        document.body.append(t);
        t.select();
        try {
            document.execCommand('copy');
        }
        catch (e) {
        }
        t.remove();
    }).then(() => showToast('Link copied'));
}

export function draftPostOnX(id, btn) {
    const P = state.tweetsById[id];
    if (!P)
        return;
    let X = P.rt ? P.rb : P.x;
    if (!P.rt)
        X = X.slice((X.match(/^(?:@\w+\s+)+/) || [''])[0].length);
    X = X.trim();
    if (!X)
        return;
    try {
        navigator.clipboard.writeText(X).catch(() => {
        });
    }
    catch (e) {
    }
    window.open('https://x.com/intent/post?text=' + encodeURIComponent(X), '_blank', 'noopener');
    if (btn) {
        btn.classList.add('on');
        setTimeout(() => btn.classList.remove('on'), 1200);
    }
}

/**
 * Registers this module's global event listeners. Called once from main.js.
 */
export function initPostActions() {
    document.addEventListener('mousedown', e => {
        if (!e.target.closest('#shm,.a.s'))
            closeShareMenu();
    });
    addEventListener('scroll', () => {
        if (Date.now() - shareMenuOpenedAt > 250)
            closeShareMenu();
    }, { passive: true });
    document.addEventListener('keydown', e => {
        if (e.key == 'Escape')
            closeShareMenu();
        if ((e.key == 'Enter' || e.key == ' ') && e.target.matches && e.target.matches('.a.s[data-sh]')) {
            e.preventDefault();
            openShareMenu(e.target);
        }
    });
}
