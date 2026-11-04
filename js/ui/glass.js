/**
 * Keeps the translucent header "glass" stretched behind the tabs that stick beneath it.
 */

import { $, main } from '../core/dom.js';

/**
 * Resize the header glass so it also covers sticky tabs.
 */
export function updateGlass() {
    const h = $('.hd0');
    if (!h)
        return;
    const t = $('.tabs2');
    const hh = h.offsetHeight;
    const v = t && t.getBoundingClientRect().top <= hh + 1 ? hh + t.offsetHeight + 'px' : '100%';
    if (h.style.getPropertyValue('--ph') !== v)
        h.style.setProperty('--ph', v);
}

/**
 * Registers this module's global event listeners. Called once from main.js.
 */
export function initGlass() {
    addEventListener('scroll', updateGlass, { passive: true });
    addEventListener('resize', updateGlass);
    new MutationObserver(updateGlass).observe(main, { childList: true });
}
