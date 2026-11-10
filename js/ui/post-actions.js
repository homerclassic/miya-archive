/**
 * Per-tweet actions: share menu (copy link / thread PDF / post image) and "draft on X".
 */

import html2canvas from 'html2canvas';
import { $, showToast } from '../core/dom.js';
import { ICONS, ICON_LINK_PATH, filledIcon, icon } from '../core/icons.js';
import { state } from '../core/state.js';
import { collectThreadIds } from '../export/thread-document.js';
import { downloadThreadPdf } from '../export/thread-export.js';
import { hydrateEmbedsIn } from '../embeds/x-render.js';
import { tweetCard } from './tweet-card.js';

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
 * Open the Copy link / Download thread / Download as image menu next to the share button.
 */
export function openShareMenu(btn) {
    const id = btn.dataset.sh;
    if (shareMenu.open && shareMenu.tweetId == id) {
        setShareMenu(false);
        return;
    }
    setShareMenu(true, id, btn);
    const m = $('#shm');
    m.innerHTML = `<button type="button" role="menuitem" data-a="link">${filledIcon(ICON_LINK_PATH, 18)}Copy link</button>${collectThreadIds(id).length > 1 ? `<button type="button" role="menuitem" data-a="pdf">${icon(ICONS.dl, 18)}Download thread as PDF</button>` : ''}<button type="button" role="menuitem" data-a="img">${icon(ICONS.dl, 18)}Download as image</button>`;
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
        else if (b.dataset.a == 'img')
            downloadPostImage(id);
        else
            copyLink(id);
    };
    m.querySelector('button').focus();
}

// The first solid background colour walking up from `el` (the card itself is
// transparent, so this lands on the page background and follows the theme).
function solidBackground(el) {
    while (el) {
        const c = getComputedStyle(el).backgroundColor;
        if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent')
            return c;
        el = el.parentElement;
    }
    return '#ffffff';
}

/**
 * Download the post as a PNG image, in the focused post-page layout (the
 * tweet/<id>.html view): name and handle, text, timestamp, then the
 * Retweets / Likes line — not the compact feed card. The focused card is
 * rendered into an off-screen 600px container (the centre-column width),
 * its action row dropped to match the post page, then screenshotted at 2x.
 * Works on the site, where the images are same-origin. In the standalone
 * (file://) the browser taints the canvas when it draws a local image, so
 * the save fails there and the user gets a toast instead of a file.
 */
// html2canvas mishandles object-fit: cover + aspect-ratio / max-height on
// quote media, stretching single photos. Rebuild the cover crop explicitly:
// size each embed image to cover its box and clip the overflow, using only
// absolute positioning and overflow:hidden, which html2canvas renders
// faithfully. Runs after hydration + image load, before html2canvas.
function fixEmbedImages(root) {
    for (const box of root.querySelectorAll('.qx .qgi')) {
        const im = box.querySelector('img');
        if (!im || !im.naturalWidth || !im.naturalHeight)
            continue;
        const r = box.getBoundingClientRect();
        if (!r.width || !r.height)
            continue;
        const s = Math.max(r.width / im.naturalWidth, r.height / im.naturalHeight);
        const dw = im.naturalWidth * s, dh = im.naturalHeight * s;
        box.style.height = r.height + 'px';
        box.style.aspectRatio = 'auto';
        box.style.overflow = 'hidden';
        box.style.position = 'relative';
        im.style.position = 'absolute';
        im.style.left = ((r.width - dw) / 2) + 'px';
        im.style.top = ((r.height - dh) / 2) + 'px';
        im.style.width = dw + 'px';
        im.style.height = dh + 'px';
        im.style.maxHeight = 'none';
        im.style.objectFit = 'none';
    }
}

async function downloadPostImage(id) {
    const P = state.tweetsById[id];
    if (!P)
        return;
    showToast('Saving image…');
    // Eager images: the container sits off-screen, so lazy ones would never load.
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed;left:-10000px;top:0;width:600px;';
    wrap.innerHTML = tweetCard(P, { f: true }).replaceAll('loading="lazy"', 'loading="eager"');
    // Match the new tweet/<id>.html format: date next to the handle in the
    // header, no timestamp line. Move the date out of .ts, then drop .ts.
    const tsEl = wrap.querySelector('.ts');
    const fhMu = wrap.querySelector('.fh .mu');
    if (tsEl && fhMu) {
        const date = tsEl.textContent.split('·')[1]?.trim();
        if (date)
            fhMu.append(document.createTextNode(' · ' + date));
    }
    wrap.querySelector('.ac')?.remove();
    wrap.querySelector('.st')?.remove();
    wrap.querySelector('.ts')?.remove();
    // Bottom padding: the card has padding-bottom 0, and the timestamp /
    // counts / action rows are stripped from the shot, so the text is the
    // last element. Padding on the wrapper alone did not read as a margin,
    // so pad the card itself, generously.
    const art = wrap.querySelector('.tw');
    if (art)
        art.style.paddingBottom = '24px';
    // Over file://, local tweet photos would taint the canvas and fail the
    // save, so drop them from the render (the avatar is a data: URL in the
    // standalone build, and quote images are https, so those stay). On the
    // site the photos stay in the shot.
    if (location.protocol === 'file:')
        wrap.querySelector('.md')?.remove();
    document.body.append(wrap);
    const card = wrap.firstElementChild;
    try {
        // Hydrate quote embeds: the off-screen card never scrolls into view,
        // so the lazy IntersectionObserver never fires and quotes would stay
        // on "Loading post…". Give X up to 5s, then render whatever state
        // the embed reached rather than hanging.
        await Promise.race([
            hydrateEmbedsIn(wrap),
            new Promise(r => setTimeout(r, 5000)),
        ]);
        // Wait for the avatar / media to finish loading so they are not
        // blank. The embed renders its own lazy images, so force those
        // eager here (the card's own were made eager in the HTML string).
        await Promise.all([...wrap.querySelectorAll('img')].map(im => {
            if (im.complete)
                return 0;
            if (im.loading === 'lazy') {
                im.loading = 'eager';
                im.src = im.src;
            }
            return new Promise(r => {
                im.onload = im.onerror = r;
                setTimeout(r, 3000);
            });
        }));
        fixEmbedImages(wrap);
        const canvas = await html2canvas(card, {
            backgroundColor: solidBackground(card),
            scale: 2,
            useCORS: true,
        });
        const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
        if (!blob) {
            showToast('Couldn’t save this image');
            return;
        }
        const file = new File([blob], `miya-${id}.png`, { type: 'image/png' });
        // On touch devices the anchor download never prompts a save: iOS Safari
        // ignores a programmatic click after async work, so nothing happens.
        // Use the native share sheet instead when the browser can share files;
        // that gives Save to Photos / Save to Files.
        if (matchMedia('(pointer:coarse)').matches && navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
                await navigator.share({ files: [file] });
                return;
            } catch (e) {
                if (e && e.name === 'AbortError')
                    return; // user dismissed the sheet; do not fall through to a download
                // Any other error (e.g. the gesture expired during the render)
                // falls through to the anchor download below.
            }
        }
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `miya-${id}.png`;
        document.body.append(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    }
    catch (e) {
        showToast('Couldn’t save this image');
    }
    finally {
        wrap.remove();
    }
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
