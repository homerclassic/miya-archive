/**
 * Mobile slide-out menu open/close state.
 */

export const closeDrawer = () => document.body.classList.remove('dro');

export const openDrawer = () => document.body.classList.add('dro');

/**
 * Registers this module's global event listeners. Called once from main.js.
 */
export function initDrawer() {
    addEventListener('hashchange', closeDrawer);
    document.addEventListener('keydown', e => {
        if (e.key == 'Escape')
            closeDrawer();
    });
}
