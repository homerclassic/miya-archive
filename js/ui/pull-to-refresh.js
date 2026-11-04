/**
 * Touch pull-to-refresh indicator (X style).
 */

import { $ } from '../core/dom.js';
import { state } from '../core/state.js';
import { handleRoute, navKey } from '../router.js';

/** Set by initPullToRefresh(); programmatically plays the refresh animation and re-renders the route. */
export let triggerPullToRefresh = null;

/* ===== pull to refresh (touch) ===== */
/**
 * Registers this module's global event listeners. Called once from main.js.
 */
export function initPullToRefresh() {
    {
        const el = document.createElement('div');
        el.id = 'ptr';
        el.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><circle class="pc" cx="12" cy="12" r="9" pathLength="100"/></svg>';
        const pc = el.querySelector('.pc');
        document.body.append(el);
        let sy = 0;
        let sx = 0;
        let dy = 0;
        let on = 0;
        let act = 0;
        const TH = 72;
        const set = d => {
            el.style.transform = `translate(-50%,${d * .55 - 44}px) rotate(${d * 3}deg)`;
            el.style.opacity = Math.min(1, d / TH * 1.2);
            pc.style.strokeDashoffset = 100 - 75 * Math.min(1, d / TH);
        };
        const busy = () => state.lightbox || document.body.classList.contains('dro') || $('#adv');
        const reset = () => {
            el.classList.add('rs');
            el.style.transform = '';
            el.style.opacity = '';
            setTimeout(() => {
                el.classList.remove('rs', 'sp');
                pc.style.strokeDashoffset = '';
            }, 220);
        };
        addEventListener('touchstart', e => {
            on = 0;
            act = 0;
            if (e.touches.length != 1 || scrollY > 0 || busy() || navKey(decodeURIComponent(location.hash.slice(2)).split('/')[0]) != '')
                return;
            sy = e.touches[0].clientY;
            sx = e.touches[0].clientX;
            dy = 0;
            on = 1;
            el.classList.remove('rs');
        }, { passive: true });
        addEventListener('touchmove', e => {
            if (!on)
                return;
            const t = e.touches[0];
            dy = t.clientY - sy;
            const dx = t.clientX - sx;
            if (!act) {
                if (dy > 10 && dy > Math.abs(dx) * 1.3)
                    act = 1;
                else if (dy < -6 || Math.abs(dx) > 14) {
                    on = 0;
                    return;
                }
                else
                    return;
            }
            set(Math.min(dy, 150));
        }, { passive: true });
        addEventListener('touchend', () => {
            if (!on || !act) {
                on = 0;
                return;
            }
            on = 0;
            if (dy > TH) {
                el.classList.add('sp', 'rs');
                el.style.transform = 'translate(-50%,24px)';
                el.style.opacity = '1';
                setTimeout(() => {
                    handleRoute(true);
                    reset();
                }, 550);
            }
            else
                reset();
        }, { passive: true });
        addEventListener('touchcancel', () => {
            if (on && act)
                reset();
            on = 0;
        }, { passive: true });
        triggerPullToRefresh = () => {
            if (act || el.classList.contains('sp'))
                return;
            const go = () => {
                el.classList.remove('rs');
                el.classList.add('sp', 'rs');
                el.style.transform = 'translate(-50%,24px)';
                el.style.opacity = '1';
                setTimeout(() => {
                    handleRoute(true);
                    reset();
                }, 550);
            };
            if (scrollY > 8) {
                scrollTo({ top: 0, behavior: 'smooth' });
                const t0 = Date.now();
                const w = () => {
                    if (scrollY <= 2 || Date.now() - t0 > 700)
                        go();
                    else
                        requestAnimationFrame(w);
                };
                w();
            }
            else
                go();
        };
    }
}
