/**
 * Mobile slide-out menu open/close state.
 */

/**
 * Whether the drawer is open. This field owns the state; the body class
 * 'dro' is only a mirror of it (so isOverlayOpen in core/dom.js, which reads
 * the class, keeps working unchanged).
 */
let drawerOpen = false;

/**
 * The drawer-open state's single setter. Every open/close goes through here,
 * and it mirrors the field onto the body class 'dro'.
 */
export const setDrawerOpen = open => {
    drawerOpen = !!open;
    document.body.classList.toggle('dro', drawerOpen);
};

/** Read the drawer-open state. */
export const isDrawerOpen = () => drawerOpen;

export const closeDrawer = () => setDrawerOpen(false);

export const openDrawer = () => setDrawerOpen(true);

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
