/**
 * Click the profile photo or header image to enlarge it.
 */

import { AVATAR_URL, HEADER_URL } from '../core/config.js';
import { escapeHtml } from '../core/dom.js';
import { ICONS, icon } from '../core/icons.js';

/* ===== profile photo / header viewer (click the avatar or the header image to enlarge it, like X) ===== */
/**
 * Named viewer state: the single source of truth for whether the viewer is
 * open and which page overflow value to restore on close. The #pv element
 * existing in the DOM and the documentElement overflow are mirrors of this
 * state, synced only by setViewer(). State lives here, never on a DOM node.
 */
const viewer = { open: false, savedOverflow: '' };

/**
 * Single setter for the viewer. Opening saves the current overflow, marks
 * the viewer open, creates the #pv element, and hides page overflow;
 * closing removes the element, marks the viewer closed, and restores the
 * saved overflow.
 */
function setViewer(open, src = null, round = false) {
    if (!open) {
        if (!viewer.open)
            return;
        viewer.open = false;
        const e = document.getElementById('pv');
        if (e)
            e.remove();
        document.documentElement.style.overflow = viewer.savedOverflow;
        viewer.savedOverflow = '';
        return;
    }
    setViewer(false);
    viewer.savedOverflow = document.documentElement.style.overflow;
    viewer.open = true;
    const e = document.createElement('div');
    e.id = 'pv';
    e.setAttribute('role', 'dialog');
    e.setAttribute('aria-modal', 'true');
    e.setAttribute('aria-label', round ? 'Profile photo' : 'Header photo');
    e.innerHTML = `<button type="button" class="lbc" aria-label="Close">${icon(ICONS.lbx, 20)}</button><img class="pvi${round ? ' rd' : ''}" alt="" draggable="false" src="${escapeHtml(src)}">`;
    e.addEventListener('click', ev => {
        if (!ev.target.classList.contains('pvi'))
            setViewer(false);
    });
    document.body.appendChild(e);
    document.documentElement.style.overflow = 'hidden';
    e.querySelector('.lbc').focus();
}

/**
 * Registers this module's global event listeners. Called once from main.js.
 */
export function initProfileViewer() {
    {
        document.addEventListener('click', ev => {
            const t = ev.target;
            if (!t.closest)
                return;
            const a = t.closest('.pf .av.xl');
            const b = t.closest('.ban');
            if (a) {
                ev.preventDefault();
                setViewer(true, AVATAR_URL, true);
            }
            else if (b) {
                ev.preventDefault();
                setViewer(true, HEADER_URL, false);
            }
        }, true);
        addEventListener('keydown', ev => {
            if (ev.key == 'Escape')
                setViewer(false);
        });
        addEventListener('hashchange', () => setViewer(false));
    }
}
