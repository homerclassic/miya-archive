/**
 * Swipe from the left edge to open the mobile drawer, swipe left to close it.
 */

import { $, isOverlayOpen } from '../core/dom.js';
import { state } from '../core/state.js';

/* ===== swipe from left edge opens menu, swipe left closes it ===== */
/**
 * Registers this module's global event listeners. Called once from main.js.
 */
export function initDrawerSwipe() {
    {
        const mq = matchMedia('(max-width:700px)');
        const D = () => $('#dr');
        const B = () => $('#drb');
        let m = 0;
        let drag = 0;
        let sx = 0;
        let sy = 0;
        let dx = 0;
        let t0 = 0;
        let W = 300;
        addEventListener('touchstart', e => {
            m = 0;
            drag = 0;
            if (!mq.matches || e.touches.length != 1 || !D())
                return;
            const open = document.body.classList.contains('dro');
            // An overlay blocks the swipe. The drawer itself is the exception: when it is open the swipe is the
            // close gesture, so only the other overlays (lightbox, advanced search, share menu) block it then.
            if (!open && isOverlayOpen())
                return;
            if (open && (state.lightbox || $('#adv') || $('#shm')))
                return;
            const t = e.touches[0];
            if (open || t.clientX <= 22) {
                m = open ? 2 : 1;
                sx = t.clientX;
                sy = t.clientY;
                dx = 0;
                t0 = Date.now();
                W = D().offsetWidth || 300;
            }
        }, { passive: true });
        addEventListener('touchmove', e => {
            if (!m)
                return;
            const t = e.touches[0];
            dx = t.clientX - sx;
            const dy = t.clientY - sy;
            if (!drag) {
                if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.2) {
                    drag = 1;
                    D().style.transition = B().style.transition = 'none';
                    D().style.visibility = 'visible';
                }
                else if (Math.abs(dy) > 10) {
                    m = 0;
                    return;
                }
                else
                    return;
            }
            const x = m == 1 ? Math.min(0, Math.max(-W, -W + dx)) : Math.min(0, Math.max(-W, dx));
            D().style.transform = `translateX(${x}px)`;
            B().style.opacity = 1 + x / W;
            B().style.pointerEvents = 'auto';
        }, { passive: true });
        addEventListener('touchend', () => {
            if (!m || !drag) {
                m = 0;
                return;
            }
            const v = Math.abs(dx) / Math.max(1, Date.now() - t0);
            const open = m == 1 ? (dx > W * .35 || (v > .4 && dx > 30)) : !(-dx > W * .25 || (v > .4 && dx < -30));
            for (const e of [D(), B()]) {
                e.style.transition = '';
                e.style.transform = '';
                e.style.visibility = '';
                e.style.opacity = '';
                e.style.pointerEvents = '';
            }
            document.body.classList.toggle('dro', open);
            m = 0;
            drag = 0;
        }, { passive: true });
    }
}
