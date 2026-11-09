/**
 * Entry point. Registers every module's global listeners (in the order the original single script did) and starts the app.
 */
import { initImageEvents } from './ui/image-events.js';
import { initPostActions } from './ui/post-actions.js';
import { initDrawer } from './ui/drawer.js';
import { initLightbox } from './ui/lightbox.js';
import { initAdvancedModal } from './search/advanced-modal.js';
import { initRouter } from './router.js';
import { initEvents } from './events.js';
import { initGlass } from './ui/glass.js';
import { initPullToRefresh } from './ui/pull-to-refresh.js';
import { initDrawerSwipe } from './ui/drawer-swipe.js';
import { initXRender } from './embeds/x-render.js';
import { startApp } from './app.js';
import { initMobileBehaviors } from './ui/mobile-behaviors.js';
import { initProfileViewer } from './ui/profile-viewer.js';
import { initShortcuts } from './ui/shortcuts.js';

initImageEvents();
initPostActions();
initDrawer();
initLightbox();
initAdvancedModal();
initRouter();
initEvents();
initGlass();
initPullToRefresh();
initDrawerSwipe();
initXRender();
startApp();
initMobileBehaviors();
initProfileViewer();
initShortcuts();
