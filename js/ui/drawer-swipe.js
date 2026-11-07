/**
 * Swipe from the left edge to open the mobile drawer, swipe left to close it.
 */

import { $, isOverlayOpen } from '../core/dom.js';
import { state } from '../core/state.js';
import { isDrawerOpen, setDrawerOpen } from './drawer.js';

/* ===== swipe from left edge opens menu, swipe left closes it ===== */
/**
 * Registers this module's global event listeners. Called once from main.js.
 */
export function initDrawerSwipe() {
    {
        const mq = matchMedia('(max-width:700px)');
        const D = () => $('#dr');
        const B = () => $('#drb');
        /**
         * The drawer-gesture state. One named field replaces the old
         * m (0=idle, 1=opening swipe, 2=closing swipe) crossed with
         * drag (0=not yet recognised, 1=dragging):
         *   'idle'           — no swipe in progress
         *   'opening'        — swipe started from the left edge while closed, not yet recognised as a drag
         *   'closing'        — swipe started while open, not yet recognised as a drag
         *   'dragging-open'  — recognised horizontal drag opening the drawer
         *   'dragging-closed' — recognised horizontal drag closing the drawer
         */
        let swipe = 'idle';
        /** The drawer-gesture state's single setter. */
        const setSwipe = next => { swipe = next; };
        let sx = 0;
        let sy = 0;
        let dx = 0;
        let t0 = 0;
        let W = 300;
        addEventListener('touchstart', e => {
            setSwipe('idle');
            if (!mq.matches || e.touches.length != 1 || !D())
                return;
            const open = isDrawerOpen();
            // An overlay blocks the swipe. The drawer itself is the exception: when it is open the swipe is the
            // close gesture, so only the other overlays (lightbox, advanced search, share menu) block it then.
            if (!open && isOverlayOpen())
                return;
            if (open && (state.lightbox || $('#adv') || $('#shm')))
                return;
            const t = e.touches[0];
            if (open || t.clientX <= 22) {
                setSwipe(open ? 'closing' : 'opening');
                sx = t.clientX;
                sy = t.clientY;
                dx = 0;
                t0 = Date.now();
                W = D().offsetWidth || 300;
            }
        }, { passive: true });
        addEventListener('touchmove', e => {
            if (swipe == 'idle')
                return;
            const t = e.touches[0];
            dx = t.clientX - sx;
            const dy = t.clientY - sy;
            if (swipe == 'opening' || swipe == 'closing') {
                if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.2) {
                    setSwipe(swipe == 'opening' ? 'dragging-open' : 'dragging-closed');
                    D().style.transition = B().style.transition = 'none';
                    D().style.visibility = 'visible';
                }
                else if (Math.abs(dy) > 10) {
                    setSwipe('idle');
                    return;
                }
                else
                    return;
            }
            const x = swipe == 'dragging-open' ? Math.min(0, Math.max(-W, -W + dx)) : Math.min(0, Math.max(-W, dx));
            D().style.transform = `translateX(${x}px)`;
            B().style.opacity = 1 + x / W;
            B().style.pointerEvents = 'auto';
        }, { passive: true });
        addEventListener('touchend', () => {
            if (swipe != 'dragging-open' && swipe != 'dragging-closed') {
                setSwipe('idle');
                return;
            }
            const v = Math.abs(dx) / Math.max(1, Date.now() - t0);
            const open = swipe == 'dragging-open' ? (dx > W * .35 || (v > .4 && dx > 30)) : !(-dx > W * .25 || (v > .4 && dx < -30));
            for (const e of [D(), B()]) {
                e.style.transition = '';
                e.style.transform = '';
                e.style.visibility = '';
                e.style.opacity = '';
                e.style.pointerEvents = '';
            }
            setDrawerOpen(open);
            setSwipe('idle');
        }, { passive: true });
    }
}
