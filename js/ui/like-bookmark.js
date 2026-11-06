/**
 * Like / bookmark toggles: the one place that updates the state, every visible copy of the button, and the
 * persisted history, so the render (tweet-card) and the click (events) cannot drift apart.
 */

import { formatCount } from '../core/format.js';
import { ICON_BOOKMARK_FILLED_PATH, ICON_BOOKMARK_PATH, ICON_LIKE_FILLED_PATH, ICON_LIKE_PATH } from '../core/icons.js';
import { state } from '../core/state.js';
import { persistHistory } from '../core/storage.js';

/** What the like button should show for `id` with `base` counted likes: its state, glyph path and total. */
export function likeVisual(id, base) {
    const on = state.likedIds.has(id);
    return { on, path: on ? ICON_LIKE_FILLED_PATH : ICON_LIKE_PATH, count: base + (on ? 1 : 0) };
}

/** What the bookmark button should show for `id`: its state and glyph path. */
export function bookmarkVisual(id) {
    const on = state.bookmarkedIds.includes(id);
    return { on, path: on ? ICON_BOOKMARK_FILLED_PATH : ICON_BOOKMARK_PATH };
}

/**
 * Set the like state for a tweet: updates the Set, every matching button on the page (class, glyph, count, pop),
 * the focused-card like total, and storage.
 */
export function setLike(id, on) {
    if (on && navigator.vibrate)
        try {
            navigator.vibrate(8);
        }
        catch (e) {
        }
    on ? state.likedIds.add(id) : state.likedIds.delete(id);
    document.querySelectorAll(`.tw[data-id="${id}"] .a.p`).forEach(x => {
        const v = likeVisual(id, +x.dataset.b);
        x.classList.toggle('on', v.on);
        const p = x.querySelector('svg path');
        if (p)
            p.setAttribute('d', v.path);
        if (v.on) {
            x.classList.add('pop');
            setTimeout(() => x.classList.remove('pop'), 500);
        }
        x.querySelector('i').textContent = v.count ? formatCount(v.count) : '';
    });
    document.querySelectorAll(`.tw[data-id="${id}"] .lkn`).forEach(x => x.textContent = likeVisual(id, +x.dataset.b).count.toLocaleString());
    persistHistory();
}

/**
 * Set the bookmark state for a tweet: updates the list, every matching button on the page (class, glyph), and storage.
 */
export function setBookmark(id, on) {
    state.bookmarkedIds = on ? [...state.bookmarkedIds, id] : state.bookmarkedIds.filter(x => x != id);
    document.querySelectorAll(`.tw[data-id="${id}"] .a.k`).forEach(x => {
        const v = bookmarkVisual(id);
        x.classList.toggle('on', v.on);
        const p = x.querySelector('svg path');
        if (p)
            p.setAttribute('d', v.path);
    });
    persistHistory();
}
