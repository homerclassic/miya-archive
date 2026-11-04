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
    let m = 0;
    let lock = '';
    let sx = 0;
    let sy = 0;
    let bx = 0;
    let by = 0;
    let d0 = 1;
    let s0 = 1;
    let smx = 0;
    let smy = 0;
    let lt = 0;
    let lx = 0;
    let ly = 0;
    let t0 = 0;
    const dist = t => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const mid = t => [(t[0].clientX + t[1].clientX) / 2, (t[0].clientY + t[1].clientY) / 2];
    s.addEventListener('touchstart', e => {
        const t = e.touches;
        if (t.length == 2) {
            m = 2;
            lock = '';
            d0 = dist(t) || 1;
            s0 = G.s;
            bx = G.x;
            by = G.y;
            const [cx, cy] = ctr();
            const [mx, my] = mid(t);
            smx = mx - cx;
            smy = my - cy;
            ap();
            return;
        }
        if (t.length == 1) {
            m = 1;
            lock = '';
            sx = t[0].clientX;
            sy = t[0].clientY;
            bx = G.x;
            by = G.y;
            t0 = Date.now();
            ap();
        }
    }, { passive: true });
    s.addEventListener('touchmove', e => {
        const t = e.touches;
        if (m == 2 && t.length == 2) {
            const ns = Math.max(1, Math.min(5, s0 * dist(t) / d0));
            const [cx, cy] = ctr();
            const [mx, my] = mid(t);
            const k = ns / s0;
            G.s = ns;
            G.x = (mx - cx) - (smx - bx) * k;
            G.y = (my - cy) - (smy - by) * k;
            clamp();
            ap();
            return;
        }
        if (m == 1 && t.length == 1) {
            const dx = t[0].clientX - sx;
            const dy = t[0].clientY - sy;
            if (G.s > 1) {
                G.x = bx + dx;
                G.y = by + dy;
                clamp();
                ap();
                return;
            }
            if (!lock) {
                if (Math.hypot(dx, dy) < 8)
                    return;
                lock = Math.abs(dy) > Math.abs(dx) ? 'v' : 'h';
                if (lock == 'v')
                    s.style.overflow = 'visible';
            }
            if (lock == 'v') {
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
        if (m == 2) {
            if (G.s < 1.05) {
                G.s = 1;
                G.x = G.y = 0;
                ap('transform .2s');
            }
            if (t.length == 1) {
                m = 1;
                sx = t[0].clientX;
                sy = t[0].clientY;
                bx = G.x;
                by = G.y;
                lock = '';
            }
            else
                m = 0;
            return;
        }
        if (m == 1 && !t.length) {
            m = 0;
            const c = e.changedTouches[0];
            const dx = c.clientX - sx;
            const dy = c.clientY - sy;
            const dt = Math.max(1, Date.now() - t0);
            if (!lock && Math.hypot(dx, dy) < 10) {
                const now = Date.now();
                if (now - lt < 300 && Math.hypot(c.clientX - lx, c.clientY - ly) < 30) {
                    e.preventDefault();
                    lt = 0;
                    zoomAt(c.clientX, c.clientY, G.s > 1 ? 1 : 2.5, 'transform .2s');
                }
                else {
                    lt = now;
                    lx = c.clientX;
                    ly = c.clientY;
                }
                return;
            }
            if (lock == 'v') {
                s.style.overflow = '';
                if (Math.abs(dy) > 110 || (Math.abs(dy) / dt > .6 && Math.abs(dy) > 40)) {
                    G.y = (dy > 0 ? 1 : -1) * innerHeight;
                    ap('transform .2s');
                    bg(0);
                    setTimeout(() => {
                        if (state.lightbox === L)
                            closeLightbox();
                    }, 180);
                }
                else {
                    G.x = G.y = 0;
                    bg(null);
                    ap('transform .2s');
                }
                return;
            }
            if (lock == 'h') {
                if (Math.abs(dx) > 70 || (Math.abs(dx) / dt > .5 && Math.abs(dx) > 30)) {
                    const i = L.i + (dx < 0 ? 1 : -1);
                    if (i >= 0 && i < L.srcs.length) {
                        G.x = G.y = 0;
                        ap();
                        showLightboxImage(i);
                        return;
                    }
                }
                G.x = 0;
                ap('transform .2s');
            }
        }
    }, { passive: false });
    s.addEventListener('touchcancel', () => {
        m = 0;
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
