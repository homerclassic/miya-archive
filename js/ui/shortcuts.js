/**
 * Keyboard shortcuts: X-style `?` help popup and the shortcuts that apply to a
 * read-only archive. The list mirrors X's help popup, minus everything a
 * frozen archive cannot do — no posting, no notifications, no DMs, no audio
 * dock, and videos aren't included in the archive, so there is no media
 * section. `g` starts a two-key sequence (g then h/s/p/b/l); `j`/`k` move a
 * focus highlight between posts, and `l`/`b`/`s`/`Enter`/`o` act on it.
 */

import { $, isOverlayOpen, navigate } from '../core/dom.js';
import { state } from '../core/state.js';
import { setBookmark, setLike } from './like-bookmark.js';
import { openLightbox } from './lightbox.js';
import { openShareMenu } from './post-actions.js';

// The shortcut list, in the shape of X's help popup. `keys` is one key, or an
// array for a two-key sequence (shown as `g` + `h`).
const SECTIONS = [
    { title: 'Navigation', rows: [
        ['Shortcut help', '?'],
        ['Next post', 'j'],
        ['Previous post', 'k'],
        ['Page down', 'Space'],
        ['Home', ['g', 'h']],
        ['Go to Search', ['g', 's']],
        ['Profile', ['g', 'p']],
        ['Bookmarks', ['g', 'b']],
        ['Likes', ['g', 'l']],
    ] },
    { title: 'Actions', rows: [
        ['Search', '/'],
        ['Like', 'l'],
        ['Bookmark', 'b'],
        ['Share post', 's'],
        ['Open post', 'Enter'],
        ['Expand photo', 'o'],
    ] },
];

// --- help popup (`?`) ---

function renderShortcutsHelp() {
    let m = $('#help');
    if (!state.helpOpen) {
        m && m.remove();
        return;
    }
    if (!m) {
        m = document.createElement('div');
        m.id = 'help';
        m.className = 'ov';
        document.body.append(m);
        m.onclick = e => {
            if (e.target == m || e.target.closest('[data-cl]'))
                closeShortcutsHelp();
        };
    }
    const keyHtml = k => Array.isArray(k)
        ? k.map(x => `<span class="kbd">${x}</span>`).join('<span class="kbd-sep">+</span>')
        : `<span class="kbd">${k}</span>`;
    const secHtml = s => `<div class="help-sec">${s.title}</div>` + s.rows.map(([label, keys]) => `<div class="help-row"><span>${label}</span><span class="help-keys">${keyHtml(keys)}</span></div>`).join('');
    m.innerHTML = `<div class="mb"><div class="mh"><button class="x" data-cl="1" aria-label="Close" style="font-size:22px;padding:4px 10px">✕</button><b>Keyboard shortcuts</b></div><div class="mc">${SECTIONS.map(secHtml).join('')}</div></div>`;
}

export function openShortcutsHelp() {
    state.helpOpen = true;
    renderShortcutsHelp();
}

export function closeShortcutsHelp() {
    state.helpOpen = false;
    renderShortcutsHelp();
}

// --- focused post (j/k) ---

// The rendered tweet cards in the main column (the lightbox card is outside
// #main, so it is never in this list).
const visiblePosts = () => [...document.querySelectorAll('#main .tw')];

function setFocusedPost(el) {
    document.querySelectorAll('#main .tw.kb-focus').forEach(x => x.classList.remove('kb-focus'));
    if (!el) {
        state.focusedPostId = null;
        return;
    }
    el.classList.add('kb-focus');
    state.focusedPostId = el.dataset.id;
    el.scrollIntoView({ block: 'nearest' });
}

function focusedPostEl() {
    if (!state.focusedPostId)
        return null;
    return document.querySelector(`#main .tw[data-id="${state.focusedPostId}"]`);
}

// The focused post, focusing the first visible one when none is focused.
function ensureFocusedPost() {
    let el = focusedPostEl();
    if (!el) {
        el = visiblePosts()[0] || null;
        if (el)
            setFocusedPost(el);
    }
    return el;
}

function stepPost(dir) {
    const posts = visiblePosts();
    if (!posts.length)
        return;
    const cur = focusedPostEl();
    const i = cur ? posts.indexOf(cur) : -1;
    const next = dir > 0 ? posts[Math.min(i + 1, posts.length - 1)] : posts[Math.max(i - 1, 0)];
    if (next)
        setFocusedPost(next);
}

// --- `g` two-key sequences ---

let pendingG = false;
let gTimer = null;

function clearPendingG() {
    pendingG = false;
    if (gTimer !== null) {
        clearTimeout(gTimer);
        gTimer = null;
    }
}

function armPendingG() {
    pendingG = true;
    if (gTimer !== null)
        clearTimeout(gTimer);
    gTimer = setTimeout(clearPendingG, 1000);
}

// --- search box (`/`) ---

function focusSearchBox() {
    const sq = $('#sq');
    if (sq && sq.offsetParent !== null) {
        sq.focus();
        sq.select();
        return;
    }
    const qm = $('#qm');
    if (qm) {
        qm.focus();
        qm.select();
        return;
    }
    navigate('/search');
}

// --- the global keydown handler ---

function onKeydown(e) {
    // Escape always closes the help popup, and cancels a pending `g`.
    if (e.key === 'Escape' && state.helpOpen) {
        closeShortcutsHelp();
        return;
    }
    if (e.key === 'Escape' && pendingG) {
        clearPendingG();
        return;
    }
    // Never hijack a modified key (browser shortcuts). `?` needs Shift, so
    // Shift is the one modifier that is allowed through.
    if (e.metaKey || e.ctrlKey || e.altKey)
        return;
    const t = e.target;
    // Typing in a field belongs to the field.
    const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
    if (typing)
        return;
    // An overlay owns the keyboard (lightbox arrows, drawer Escape, ...). The
    // help popup is the one exception: `?` toggles it.
    if (isOverlayOpen()) {
        if (e.key === '?' && state.helpOpen)
            closeShortcutsHelp();
        return;
    }
    // Space / Enter on a focused control belong to that control (a button, a
    // media tile, ...), not to paging or opening a post.
    const onControl = t && t !== document.body && (t.tagName === 'BUTTON' || t.tagName === 'A' || t.getAttribute('role') === 'button' || t.hasAttribute('tabindex'));
    if (onControl && (e.key === ' ' || e.key === 'Enter'))
        return;

    // `g` starts a two-key sequence (g then h/s/p/b/l).
    if (pendingG) {
        const dest = { h: '/', s: '/search', p: '/tweets', b: '/bookmarks', l: '/history/likes' }[e.key];
        clearPendingG();
        if (dest) {
            navigate(dest);
            return;
        }
        // Not a `g` sequence — fall through and handle the key normally.
    }
    if (e.key === 'g') {
        armPendingG();
        return;
    }
    if (e.key === '?') {
        openShortcutsHelp();
        return;
    }
    if (e.key === '/') {
        e.preventDefault();
        focusSearchBox();
        return;
    }
    if (e.key === ' ') {
        e.preventDefault();
        scrollBy({ top: innerHeight * 0.8 });
        return;
    }
    if (e.key === 'j') {
        stepPost(1);
        return;
    }
    if (e.key === 'k') {
        stepPost(-1);
        return;
    }
    if (e.key === 'Enter') {
        const el = ensureFocusedPost();
        if (el)
            navigate('/t/' + el.dataset.id);
        return;
    }
    if (e.key === 'l' || e.key === 'b' || e.key === 's' || e.key === 'o') {
        const el = ensureFocusedPost();
        if (!el)
            return;
        const id = el.dataset.id;
        if (e.key === 'l')
            setLike(id, !state.likedIds.has(id));
        else if (e.key === 'b')
            setBookmark(id, !state.bookmarkedIds.includes(id));
        else if (e.key === 's') {
            const btn = el.querySelector('.a.s[data-sh]');
            if (btn)
                openShareMenu(btn);
        } else if (e.key === 'o') {
            const mi = el.querySelector('.mi');
            if (mi)
                openLightbox(mi);
        }
        return;
    }
}

/**
 * Registers this module's global event listeners. Called once from main.js.
 * A route change drops the focused post (the old cards are gone).
 */
export function initShortcuts() {
    document.addEventListener('keydown', onKeydown);
    addEventListener('hashchange', () => {
        state.focusedPostId = null;
        document.querySelectorAll('#main .tw.kb-focus').forEach(x => x.classList.remove('kb-focus'));
    });
}
