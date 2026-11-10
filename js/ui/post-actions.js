/**
 * Per-tweet actions: share menu (copy link / thread PDF) and "draft on X".
 */

import { $, showToast } from '../core/dom.js';
import { ICONS, ICON_LINK_PATH, filledIcon, icon } from '../core/icons.js';
import { state } from '../core/state.js';
import { collectThreadIds } from '../export/thread-document.js';
import { downloadThreadPdf } from '../export/thread-export.js';

/**
 * Named share-menu state: the single source of truth for whether the menu
 * is open, which tweet's menu it is, and until when a scroll event right
 * after opening should be ignored. The #shm element, its dataset.id, and
 * the invoking button's .a.s.on class are mirrors of this state, synced
 * only by setShareMenu().
 */
const shareMenu = { open: false, tweetId: null, justOpenedUntil: 0 };

/**
 * Single setter for the share menu. Opening creates the #shm element with
 * dataset.id set to the tweet id and marks the invoking button .on;
 * closing removes the element, clears the tweet id, and clears .on from
 * every share button. All three mirrors are set/cleared here and nowhere
 * else.
 */
function setShareMenu(open, tweetId = null, btn = null) {
    if (!open) {
        shareMenu.open = false;
        shareMenu.tweetId = null;
        shareMenu.justOpenedUntil = 0;
        const m = $('#shm');
        if (m)
            m.remove();
        document.querySelectorAll('.a.s.on').forEach(x => x.classList.remove('on'));
        return;
    }
    shareMenu.open = true;
    shareMenu.tweetId = tweetId;
    shareMenu.justOpenedUntil = Date.now() + 250;
    const prev = $('#shm');
    if (prev)
        prev.remove();
    document.querySelectorAll('.a.s.on').forEach(x => x.classList.remove('on'));
    if (btn)
        btn.classList.add('on');
    const m = document.createElement('div');
    m.id = 'shm';
    m.dataset.id = tweetId;
    m.setAttribute('role', 'menu');
    document.body.append(m);
}

export const closeShareMenu = () => setShareMenu(false);

/**
 * Open the Copy link / Download thread menu next to the share button.
 */
export function openShareMenu(btn) {
    const id = btn.dataset.sh;
    if (shareMenu.open && shareMenu.tweetId == id) {
        setShareMenu(false);
        return;
    }
    setShareMenu(true, id, btn);
    const m = $('#shm');
    m.innerHTML = `<button type="button" role="menuitem" data-a="link">${filledIcon(ICON_LINK_PATH, 18)}Copy link</button>${collectThreadIds(id).length > 1 ? `<button type="button" role="menuitem" data-a="pdf">${icon(ICONS.dl, 18)}Download thread as PDF</button>` : ''}`;
    const r = btn.getBoundingClientRect();
    const w = m.offsetWidth;
    const h = m.offsetHeight;
    m.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.right - w)) + 'px';
    m.style.top = (r.bottom + h + 8 > innerHeight ? r.top - h - 4 : r.bottom + 4) + 'px';

    m.onclick = e => {
        const b = e.target.closest('button');
        if (!b)
            return;
        closeShareMenu();
        if (b.dataset.a == 'pdf')
            downloadThreadPdf(id);
        else
            copyLink(id);
    };
    m.querySelector('button').focus();
}

function copyLink(id) {
    // Share the static per-tweet page (tweet/<id>.html) so the link unfurls
    // with the tweet text and media. The standalone is a single file with
    // no static pages, so there fall back to the in-app link.
    const base = location.href.split('#')[0];
    const u = location.protocol === 'file:'
        ? base + '#/t/' + id
        : new URL('tweet/' + id + '.html', base).href;
    (navigator.clipboard && window.isSecureContext ? navigator.clipboard.writeText(u) : Promise.reject()).catch(() => {
        const t = document.createElement('textarea');
        t.value = u;
        t.style.cssText = 'position:fixed;opacity:0';
        document.body.append(t);
        t.select();
        try {
            document.execCommand('copy');
        }
        catch (e) {
        }
        t.remove();
    }).then(() => showToast('Link copied'));
}

export function draftPostOnX(id, btn) {
    const P = state.tweetsById[id];
    if (!P)
        return;
    let X = P.rt ? P.rb : P.x;
    if (!P.rt)
        X = X.slice((X.match(/^(?:@\w+\s+)+/) || [''])[0].length);
    X = X.trim();
    if (!X)
        return;
    try {
        navigator.clipboard.writeText(X).catch(() => {
        });
    }
    catch (e) {
    }
    window.open('https://x.com/intent/post?text=' + encodeURIComponent(X), '_blank', 'noopener');
    if (btn) {
        btn.classList.add('on');
        setTimeout(() => btn.classList.remove('on'), 1200);
    }
}

/**
 * Registers this module's global event listeners. Called once from main.js.
 */
export function initPostActions() {
    document.addEventListener('mousedown', e => {
        if (!e.target.closest('#shm,.a.s'))
            closeShareMenu();
    });
    addEventListener('scroll', () => {
        if (Date.now() > shareMenu.justOpenedUntil)
            closeShareMenu();
    }, { passive: true });
    document.addEventListener('keydown', e => {
        if (e.key == 'Escape')
            closeShareMenu();
        if ((e.key == 'Enter' || e.key == ' ') && e.target.matches && e.target.matches('.a.s[data-sh]')) {
            e.preventDefault();
            openShareMenu(e.target);
        }
    });
}
