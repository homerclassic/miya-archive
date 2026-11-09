/**
 * Tiny DOM and URL helpers shared by every module.
 */

import { state } from './state.js';

export const $ = s => document.querySelector(s);

export const main = $('#main');

/** True while any overlay is open: the image viewer, the drawer, the advanced-search dialog, the share menu or the shortcuts help popup. */
export const isOverlayOpen = () => !!(state.lightbox || document.body.classList.contains('dro') || $('#adv') || $('#shm') || $('#help'));

export const escapeHtml = s => s.replace(/[&<>"]/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'
}[c]));

export const encodeUri = encodeURIComponent;

export const navigate = p => {
    location.hash = '#' + p;
};

/**
 * Named toast state: the single source of truth for whether the toast is
 * visible and which pending hide timer (if any) will hide it. The #toast
 * element's .on class is a mirror of this state, synced only by setToast().
 */
const toast = { visible: false, hideTimer: null };

/**
 * Single setter for the toast. Showing creates the #toast element if
 * needed, sets its text, marks it visible, and (re)arms the 2600ms hide;
 * hiding clears any pending timer, marks it hidden, and removes .on.
 */
function setToast(visible, message = '') {
    if (!visible) {
        toast.visible = false;
        if (toast.hideTimer !== null) {
            clearTimeout(toast.hideTimer);
            toast.hideTimer = null;
        }
        const t = $('#toast');
        if (t)
            t.classList.remove('on');
        return;
    }
    toast.visible = true;
    let t = $('#toast');
    if (!t) {
        t = document.createElement('div');
        t.id = 'toast';
        t.setAttribute('role', 'status');
        document.body.append(t);
    }
    t.textContent = message;
    t.classList.add('on');
    if (toast.hideTimer !== null)
        clearTimeout(toast.hideTimer);
    toast.hideTimer = setTimeout(() => setToast(false), 2600);
}

export function showToast(m) {
    setToast(true, m);
}

/* ===== tap header / active tab: scroll to top, then refresh ===== */
export const scrollToTop = () => scrollTo({ top: 0, behavior: 'smooth' });
