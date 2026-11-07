/**
 * Touch and wheel gestures for the lightbox: pinch / double-tap zoom, pan, swipe to dismiss or change image.
 */

import { state } from '../core/state.js';
import { closeLightbox, showLightboxImage } from './lightbox.js';

/* ===== media viewer: pinch / double-tap zoom, pan, swipe down to dismiss, swipe sideways for next ===== */
/**
 * Wire touch and wheel gestures to the open lightbox.
 */
export function attachLightboxGestures() {
    const L = state.lightbox;
    const s = L.el.querySelector('.lbs');
    const im = L.img;
    const G = L.g;
    const bg = a => L.el.style.background = a == null ? '' : `rgba(0,0,0,${.88 * a})`;
    const ap = tr => {
        im.style.transition = tr || 'none';
        im.style.transform = (G.x || G.y || G.s != 1) ? `translate(${G.x}px,${G.y}px) scale(${G.s})` : '';
    };
    const lim = () => ({ x: Math.max(0, (im.clientWidth * G.s - s.clientWidth) / 2), y: Math.max(0, (im.clientHeight * G.s - s.clientHeight) / 2) });
    const clamp = () => {
        const l = lim();
        G.x = Math.max(-l.x, Math.min(l.x, G.x));
        G.y = Math.max(-l.y, Math.min(l.y, G.y));
    };
    const ctr = () => {
        const r = s.getBoundingClientRect();
        return [r.left + r.width / 2, r.top + r.height / 2];
    };
    const zoomAt = (px, py, ns, tr) => {
        const [cx, cy] = ctr();
        const fx = px - cx;
        const fy = py - cy;
        const k = ns / G.s;
        G.x = fx - (fx - G.x) * k;
        G.y = fy - (fy - G.y) * k;
        G.s = ns;
        if (ns <= 1.001) {
            G.s = 1;
            G.x = G.y = 0;
        }
        else
            clamp();
        ap(tr);
    };
    /**
     * Gesture recognizer state machine (the recognition state; the zoom/pan
     * itself lives in L.g = { s, x, y } and is unchanged).
     *
     * phase: 'idle'          - no touch in progress
     *        'undecided'     - one finger down, direction not yet decided
     *        'pan'           - one finger down, panning the zoomed image
     *        'dismiss'       - one finger down, vertical dismiss in progress
     *        'swipe'         - one finger down, horizontal swipe in progress
     *        'pinch'         - two fingers down, pinching to zoom
     *        'tap-pending'   - no touch, one tap seen, waiting for a second tap
     *          (a pinch that drops to one finger returns to 'undecided').
     *
     * Measurements held with the phase, so no gesture fact lives in a
     * scattered local: startX/startY = touch start point, baseX/baseY =
     * image offset at gesture start, pinchDist/pinchScale/pinchMidX/pinchMidY
     * = pinch start distance/scale and midpoint (relative to centre),
     * lastTapTime/lastTapX/lastTapY = previous tap (double-tap detection),
     * touchStartTime = when the current touch began, dismissPending /
     * dismissLightbox = the armed 180ms dismiss timer and the lightbox it
     * belongs to, so the timer is guarded by this named state.
     */
    const gesture = {
        phase: 'idle',
        startX: 0,
        startY: 0,
        baseX: 0,
        baseY: 0,
        pinchDist: 1,
        pinchScale: 1,
        pinchMidX: 0,
        pinchMidY: 0,
        lastTapTime: 0,
        lastTapX: 0,
        lastTapY: 0,
        touchStartTime: 0,
        dismissPending: false,
        dismissLightbox: null
    };
    // Single setter for the gesture state machine: every phase change and
    // every measurement update goes through here. Pass null for phase to
    // update measurements without changing the phase.
    const setGesture = (phase, measurements = {}) => {
        if (phase != null)
            gesture.phase = phase;
        Object.assign(gesture, measurements);
    };
    const isOneFinger = () => gesture.phase == 'undecided' || gesture.phase == 'pan' || gesture.phase == 'dismiss' || gesture.phase == 'swipe';
    const dist = t => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const mid = t => [(t[0].clientX + t[1].clientX) / 2, (t[0].clientY + t[1].clientY) / 2];
    s.addEventListener('touchstart', e => {
        const t = e.touches;
        if (t.length == 2) {
            const [cx, cy] = ctr();
            const [mx, my] = mid(t);
            setGesture('pinch', {
                pinchDist: dist(t) || 1,
                pinchScale: G.s,
                baseX: G.x,
                baseY: G.y,
                pinchMidX: mx - cx,
                pinchMidY: my - cy
            });
            ap();
            return;
        }
        if (t.length == 1) {
            setGesture('undecided', {
                startX: t[0].clientX,
                startY: t[0].clientY,
                baseX: G.x,
                baseY: G.y,
                touchStartTime: Date.now()
            });
            ap();
        }
    }, { passive: true });
    s.addEventListener('touchmove', e => {
        const t = e.touches;
        if (gesture.phase == 'pinch' && t.length == 2) {
            const ns = Math.max(1, Math.min(5, gesture.pinchScale * dist(t) / gesture.pinchDist));
            const [cx, cy] = ctr();
            const [mx, my] = mid(t);
            const k = ns / gesture.pinchScale;
            G.s = ns;
            G.x = (mx - cx) - (gesture.pinchMidX - gesture.baseX) * k;
            G.y = (my - cy) - (gesture.pinchMidY - gesture.baseY) * k;
            clamp();
            ap();
            return;
        }
        if (isOneFinger() && t.length == 1) {
            const dx = t[0].clientX - gesture.startX;
            const dy = t[0].clientY - gesture.startY;
            if (G.s > 1) {
                if (gesture.phase != 'pan')
                    setGesture('pan');
                G.x = gesture.baseX + dx;
                G.y = gesture.baseY + dy;
                clamp();
                ap();
                return;
            }
            if (gesture.phase == 'undecided') {
                if (Math.hypot(dx, dy) < 8)
                    return;
                if (Math.abs(dy) > Math.abs(dx)) {
                    setGesture('dismiss');
                    s.style.overflow = 'visible';
                }
                else
                    setGesture('swipe');
            }
            if (gesture.phase == 'dismiss') {
                G.y = dy;
                G.x = dx * .3;
                bg(Math.max(0, 1 - Math.abs(dy) / 320));
                ap();
            }
            else {
                G.x = dx;
                ap();
            }
        }
    }, { passive: true });
    s.addEventListener('touchend', e => {
        const t = e.touches;
        if (gesture.phase == 'pinch') {
            if (G.s < 1.05) {
                G.s = 1;
                G.x = G.y = 0;
                ap('transform .2s');
            }
            if (t.length == 1) {
                setGesture('undecided', {
                    startX: t[0].clientX,
                    startY: t[0].clientY,
                    baseX: G.x,
                    baseY: G.y
                });
            }
            else
                setGesture('idle');
            return;
        }
        if (isOneFinger() && !t.length) {
            const c = e.changedTouches[0];
            const dx = c.clientX - gesture.startX;
            const dy = c.clientY - gesture.startY;
            const dt = Math.max(1, Date.now() - gesture.touchStartTime);
            if ((gesture.phase == 'undecided' || gesture.phase == 'pan') && Math.hypot(dx, dy) < 10) {
                const now = Date.now();
                if (now - gesture.lastTapTime < 300 && Math.hypot(c.clientX - gesture.lastTapX, c.clientY - gesture.lastTapY) < 30) {
                    e.preventDefault();
                    setGesture('idle', { lastTapTime: 0 });
                    zoomAt(c.clientX, c.clientY, G.s > 1 ? 1 : 2.5, 'transform .2s');
                }
                else {
                    setGesture('tap-pending', {
                        lastTapTime: now,
                        lastTapX: c.clientX,
                        lastTapY: c.clientY
                    });
                }
                return;
            }
            if (gesture.phase == 'dismiss') {
                s.style.overflow = '';
                if (Math.abs(dy) > 110 || (Math.abs(dy) / dt > .6 && Math.abs(dy) > 40)) {
                    G.y = (dy > 0 ? 1 : -1) * innerHeight;
                    ap('transform .2s');
                    bg(0);
                    setGesture('dismiss', { dismissPending: true, dismissLightbox: L });
                    setTimeout(() => {
                        if (gesture.phase == 'dismiss' && gesture.dismissPending && gesture.dismissLightbox === L) {
                            setGesture('idle', { dismissPending: false, dismissLightbox: null });
                            closeLightbox();
                        }
                        else if (gesture.dismissPending) {
                            // Dismiss superseded by a new gesture on this lightbox:
                            // disarm without disturbing the current phase.
                            setGesture(null, { dismissPending: false, dismissLightbox: null });
                        }
                    }, 180);
                }
                else {
                    setGesture('idle');
                    G.x = G.y = 0;
                    bg(null);
                    ap('transform .2s');
                }
                return;
            }
            if (gesture.phase == 'swipe') {
                if (Math.abs(dx) > 70 || (Math.abs(dx) / dt > .5 && Math.abs(dx) > 30)) {
                    const i = L.i + (dx < 0 ? 1 : -1);
                    if (i >= 0 && i < L.srcs.length) {
                        setGesture('idle');
                        G.x = G.y = 0;
                        ap();
                        showLightboxImage(i);
                        return;
                    }
                }
                G.x = 0;
                ap('transform .2s');
            }
            setGesture('idle');
        }
    }, { passive: false });
    s.addEventListener('touchcancel', () => {
        setGesture('idle', { dismissPending: false, dismissLightbox: null });
        s.style.overflow = '';
        if (G.s <= 1) {
            G.x = G.y = 0;
            bg(null);
            ap('transform .2s');
        }
    });
    s.addEventListener('dblclick', e => zoomAt(e.clientX, e.clientY, G.s > 1 ? 1 : 2.5, 'transform .2s'));
    s.addEventListener('wheel', e => {
        if (!e.ctrlKey)
            return;
        e.preventDefault();
        zoomAt(e.clientX, e.clientY, Math.max(1, Math.min(5, G.s * Math.exp(-e.deltaY * .01))));
    }, { passive: false });
}
