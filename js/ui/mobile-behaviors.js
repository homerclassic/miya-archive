/**
 * Small mobile-only behaviours: hide bars while scrolling down, swipe between tabs, profile header state.
 */

import { $, isOverlayOpen, navigate } from '../core/dom.js';

/* ===== mobile: hide the top bar, tabs and bottom nav while scrolling down, bring them back on scroll up (like the X app) ===== */
/* ===== mobile: swipe sideways to move between the tabs of a page (For you ⇄ Threads …, Tweets ⇄ Tweets & replies ⇄ Media) ===== */
/* ===== mobile profile: flag when the name has scrolled under the top bar ===== */
/**
 * Registers this module's global event listeners. Called once from main.js.
 */
export function initMobileBehaviors() {
    {
        const mq = matchMedia('(max-width:700px)');
        const h = document.documentElement;
        let ly = scrollY;
        let hid = 0;
        let acc = 0;
        const set = v => {
            if (v !== hid) {
                hid = v;
                h.classList.toggle('nvh', !!v);
            }
        };
        addEventListener('scroll', () => {
            if (!mq.matches) {
                set(0);
                return;
            }
            const y = scrollY;
            const max = h.scrollHeight - innerHeight;
            const d = y - ly;
            ly = y;
            if (y <= 24) {
                set(0);
                acc = 0;
                return;
            }
            if (y >= max - 2 || document.body.classList.contains('dro'))
                return; /* ignore the bounce at the very bottom, and the open drawer */
            if (d && Math.sign(d) !== Math.sign(acc))
                acc = 0;
            acc += d;
            if (acc > 14)
                set(1);
            else if (acc < -10)
                set(0);
        }, { passive: true });
        addEventListener('hashchange', () => {
            set(0);
            acc = 0;
            ly = scrollY;
        });
        addEventListener('focusin', e => {
            if (e.target.matches && e.target.matches('input,textarea'))
                set(0);
        });
        if (mq.addEventListener)
            mq.addEventListener('change', () => set(0));
    }
    {
        const mq = matchMedia('(max-width:700px)');
        let sx = 0;
        let sy = 0;
        let t0 = 0;
        let ok = 0;
        const hs = n => {
            for (; n && n !== document.body; n = n.parentElement) {
                if (n.scrollWidth > n.clientWidth + 2 && /(auto|scroll)/.test(getComputedStyle(n).overflowX))
                    return true;
            }
            return false;
        };
        addEventListener('touchstart', e => {
            ok = 0;
            if (!mq.matches || e.touches.length != 1 || isOverlayOpen() || !$('.tabs2'))
                return;
            const t = e.touches[0];
            if (t.clientX <= 26 || t.clientX >= innerWidth - 26)
                return; /* screen edges belong to the drawer / browser back */
            if (e.target.closest('input,textarea,#lb,.ov,#dr,#shm,.qg,.mi,pre,table') || hs(e.target))
                return;
            sx = t.clientX;
            sy = t.clientY;
            t0 = Date.now();
            ok = 1;
        }, { passive: true });
        addEventListener('touchend', e => {
            if (!ok)
                return;
            ok = 0;
            const t = e.changedTouches[0];
            const dx = t.clientX - sx;
            const dy = t.clientY - sy;
            if (Date.now() - t0 > 600 || Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 2)
                return;
            const a = [...document.querySelectorAll('.tabs2 a')];
            const i = a.findIndex(x => x.classList.contains('on'));
            if (i < 0)
                return;
            const n = a[i + (dx < 0 ? 1 : -1)];
            if (n && n.dataset.go)
                navigate(n.dataset.go);
        }, { passive: true });
    }
    {
        const h = document.documentElement;
        let on = 0;
        const upd = () => {
            let v = 0;
            if (document.querySelector('.hd0.pfh')) {
                const t = document.querySelector('.pf h2');
                v = t && t.getBoundingClientRect().bottom <= 56 ? 1 : 0;
            }
            if (v !== on) {
                on = v;
                h.classList.toggle('pfs', !!v);
            }
        };
        addEventListener('scroll', upd, { passive: true });
        addEventListener('hashchange', () => {
            on = 0;
            h.classList.remove('pfs');
            setTimeout(upd, 60);
        });
    }
}
