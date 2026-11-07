/**
 * Small mobile-only behaviours: hide bars while scrolling down, swipe between tabs, profile header state.
 */

import { $, isOverlayOpen, navigate } from '../core/dom.js';
import { isDrawerOpen } from './drawer.js';

/* ===== mobile: hide the top bar, tabs and bottom nav while scrolling down, bring them back on scroll up (like the X app) ===== */
/* ===== mobile: swipe sideways to move between the tabs of a page (For you ⇄ Threads …, Tweets ⇄ Tweets & replies ⇄ Media) ===== */
/* ===== mobile profile: flag when the name has scrolled under the top bar ===== */

// Current tab route (location.hash), derived from the route — never from a `.tabs2 a.on` class lookup.
let currentTab = '';

/**
 * Registers this module's global event listeners. Called once from main.js.
 */
export function initMobileBehaviors() {
    {
        const mq = matchMedia('(max-width:700px)');
        const h = document.documentElement;
        let bars = 'shown'; /* 'shown' | 'hidden' — whether the top bar, tabs and bottom nav are hidden */
        let barsDelta = 0; /* accumulated scroll delta; reset when the scroll direction flips */
        let barsLastY = scrollY;
        const setBars = state => {
            if (state !== bars) {
                bars = state;
                h.classList.toggle('nvh', state === 'hidden');
            }
        };
        addEventListener('scroll', () => {
            if (!mq.matches) {
                setBars('shown');
                return;
            }
            const y = scrollY;
            const max = h.scrollHeight - innerHeight;
            const d = y - barsLastY;
            barsLastY = y;
            if (y <= 24) {
                setBars('shown');
                barsDelta = 0;
                return;
            }
            if (y >= max - 2 || isDrawerOpen())
                return; /* ignore the bounce at the very bottom, and the open drawer */
            if (d && Math.sign(d) !== Math.sign(barsDelta))
                barsDelta = 0;
            barsDelta += d;
            if (barsDelta > 14)
                setBars('hidden');
            else if (barsDelta < -10)
                setBars('shown');
        }, { passive: true });
        addEventListener('hashchange', () => {
            setBars('shown');
            barsDelta = 0;
            barsLastY = scrollY;
        });
        addEventListener('focusin', e => {
            if (e.target.matches && e.target.matches('input,textarea'))
                setBars('shown');
        });
        if (mq.addEventListener)
            mq.addEventListener('change', () => setBars('shown'));
    }
    {
        const mq = matchMedia('(max-width:700px)');
        const tabSwipe = { state: 'idle', startX: 0, startY: 0, startTime: 0 }; /* state: 'idle' | 'armed' | 'swiping' */
        const setTabSwipe = (state, start) => {
            tabSwipe.state = state;
            if (start) {
                tabSwipe.startX = start.x;
                tabSwipe.startY = start.y;
                tabSwipe.startTime = start.t;
            } else if (state === 'idle') {
                tabSwipe.startX = 0;
                tabSwipe.startY = 0;
                tabSwipe.startTime = 0;
            }
        };
        const syncCurrentTab = () => { currentTab = location.hash; };
        syncCurrentTab();
        addEventListener('hashchange', syncCurrentTab);
        const hs = n => {
            for (; n && n !== document.body; n = n.parentElement) {
                if (n.scrollWidth > n.clientWidth + 2 && /(auto|scroll)/.test(getComputedStyle(n).overflowX))
                    return true;
            }
            return false;
        };
        addEventListener('touchstart', e => {
            setTabSwipe('idle');
            if (!mq.matches || e.touches.length != 1 || isOverlayOpen() || !$('.tabs2'))
                return;
            const t = e.touches[0];
            if (t.clientX <= 26 || t.clientX >= innerWidth - 26)
                return; /* screen edges belong to the drawer / browser back */
            if (e.target.closest('input,textarea,#lb,.ov,#dr,#shm,.qg,.mi,pre,table') || hs(e.target))
                return;
            syncCurrentTab();
            setTabSwipe('armed', { x: t.clientX, y: t.clientY, t: Date.now() });
        }, { passive: true });
        addEventListener('touchmove', () => {
            if (tabSwipe.state === 'armed')
                setTabSwipe('swiping');
        }, { passive: true });
        addEventListener('touchend', e => {
            if (tabSwipe.state === 'idle')
                return;
            const t = e.changedTouches[0];
            const dx = t.clientX - tabSwipe.startX;
            const dy = t.clientY - tabSwipe.startY;
            const dt = Date.now() - tabSwipe.startTime;
            setTabSwipe('idle');
            if (dt > 600 || Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 2)
                return;
            const norm = s => (s || '').replace(/^#/, '').replace(/^\//, '');
            const route = norm(currentTab);
            const a = [...document.querySelectorAll('.tabs2 a')];
            let i = a.findIndex(x => x.dataset.go && norm(x.dataset.go) === route);
            if (i < 0)
                i = a.findIndex(x => x.dataset.go && route.startsWith(norm(x.dataset.go) + '/'));
            if (i < 0)
                return;
            const n = a[i + (dx < 0 ? 1 : -1)];
            if (n && n.dataset.go)
                navigate(n.dataset.go);
        }, { passive: true });
    }
    {
        const h = document.documentElement;
        let profileHeaderStuck = false;
        let headerRenderPending = 0; /* pending render-wait timer id, 0 when none is scheduled */
        const setProfileHeaderStuck = stuck => {
            if (stuck !== profileHeaderStuck) {
                profileHeaderStuck = stuck;
                h.classList.toggle('pfs', stuck);
            }
        };
        const upd = () => {
            let stuck = false;
            if (document.querySelector('.hd0.pfh')) {
                const t = document.querySelector('.pf h2');
                stuck = !!(t && t.getBoundingClientRect().bottom <= 56);
            }
            setProfileHeaderStuck(stuck);
        };
        addEventListener('scroll', upd, { passive: true });
        addEventListener('hashchange', () => {
            setProfileHeaderStuck(false);
            if (headerRenderPending)
                clearTimeout(headerRenderPending);
            headerRenderPending = setTimeout(() => {
                headerRenderPending = 0;
                upd();
            }, 60);
        });
    }
}
