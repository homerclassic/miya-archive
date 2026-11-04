/**
 * Click the profile photo or header image to enlarge it.
 */

import { AVATAR_URL, HEADER_URL } from '../core/config.js';
import { escapeHtml } from '../core/dom.js';
import { ICONS, icon } from '../core/icons.js';

/* ===== profile photo / header viewer (click the avatar or the header image to enlarge it, like X) ===== */
/**
 * Registers this module's global event listeners. Called once from main.js.
 */
export function initProfileViewer() {
    {
        const close = () => {
            const e = document.getElementById('pv');
            if (!e)
                return;
            e.remove();
            document.documentElement.style.overflow = e._ov || '';
        };
        const open = (src, round) => {
            close();
            const e = document.createElement('div');
            e.id = 'pv';
            e.setAttribute('role', 'dialog');
            e.setAttribute('aria-modal', 'true');
            e.setAttribute('aria-label', round ? 'Profile photo' : 'Header photo');
            e._ov = document.documentElement.style.overflow;
            e.innerHTML = `<button type="button" class="lbc" aria-label="Close">${icon(ICONS.lbx, 20)}</button><img class="pvi${round ? ' rd' : ''}" alt="" draggable="false" src="${escapeHtml(src)}">`;
            e.addEventListener('click', ev => {
                if (!ev.target.classList.contains('pvi'))
                    close();
            });
            document.body.appendChild(e);
            document.documentElement.style.overflow = 'hidden';
            e.querySelector('.lbc').focus();
        };
        document.addEventListener('click', ev => {
            const t = ev.target;
            if (!t.closest)
                return;
            const a = t.closest('.pf .av.xl');
            const b = t.closest('.ban');
            if (a) {
                ev.preventDefault();
                open(AVATAR_URL, true);
            }
            else if (b) {
                ev.preventDefault();
                open(HEADER_URL, false);
            }
        }, true);
        addEventListener('keydown', ev => {
            if (ev.key == 'Escape')
                close();
        });
        addEventListener('hashchange', close);
    }
}
