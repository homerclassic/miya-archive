/**
 * Image loading behaviour, handled once for the whole document instead of with inline onerror="" attributes.
 *
 * `error` and `load` do not bubble, so both listeners are registered in the capture phase.
 *   - error: replace the broken image according to its data-fallback attribute.
 *   - load:  mark the wrapper as loaded, which switches off its shimmering placeholder (see css/skeleton.css).
 */
import { ICONS, icon } from '../core/icons.js';

/** Wrappers that show a shimmer until their image has loaded. */
const PLACEHOLDER_WRAPPERS = '.mi, .qgi, .qmd, .lcm';

const FALLBACKS = {
  /** Drop the image (avatars fall back to the letter underneath). */
  remove: (img) => img.remove(),

  /** Drop the image and its wrapper. */
  'remove-parent': (img) => img.parentNode.remove(),

  /** Media inside a tweet card: show a "not included" notice. */
  placeholder: (img) => {
    const notice = document.createElement('div');
    notice.className = 'mf';
    notice.innerHTML = icon(ICONS.img, 20) + '<span>Image not included in this archive</span>';
    img.replaceWith(notice);
  },

  /** Media inside an embedded X post: drop the cell, and the whole grid when it was the last one. */
  'embed-media': (img) => {
    const grid = img.closest('.qg');
    img.parentNode.remove();
    if (grid && !grid.children.length) grid.remove();
  },

  /** Cell of the profile Media grid: replace with a link to the tweet, with an image icon. */
  'grid-cell': (img) => {
    const cell = img.parentNode;
    const link = document.createElement('a');
    link.className = 'mph';
    link.dataset.go = '/t/' + cell.dataset.id;
    link.innerHTML = icon(ICONS.img, 20);
    cell.replaceWith(link);
  },
};

/** Registers the capture-phase `error` and `load` listeners. */
export function initImageEvents() {
  document.addEventListener(
    'error',
    (event) => {
      const img = event.target;
      if (!(img instanceof HTMLImageElement)) return;
      const handler = FALLBACKS[img.dataset.fallback];
      if (handler) handler(img);
    },
    true,
  );

  document.addEventListener(
    'load',
    (event) => {
      const img = event.target;
      if (!(img instanceof HTMLImageElement)) return;
      const wrapper = img.closest(PLACEHOLDER_WRAPPERS);
      if (wrapper) wrapper.classList.add('loaded');
    },
    true,
  );
}
