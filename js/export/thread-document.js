/**
 * Turns a thread into a simple document model shared by the PDF and print exporters.
 */

import { VIDEO_URL_RX, formatDate } from '../core/format.js';
import { displayName } from '../core/identity.js';
import { state } from '../core/state.js';
import { extractEmbed } from '../embeds/embed.js';
import { getEmbeddedPost } from '../embeds/x-fetch.js';

/** Link to a post on X / Twitter: captures the author's handle and the post id. */
const POST_URL_RX = /https?:\/\/(?:www\.|mobile\.)?(?:twitter|x)\.com\/([^/\s]+)\/status(?:es)?\/(\d+)(?!\d|\/(?:photo|video))/i;

/* every tweet of the thread this tweet belongs to: climb to the first tweet, then walk all replies in order */
export function collectThreadIds(id) {
    let p = state.tweetsById[id];
    if (!p)
        return [];
    for (let n = 0; state.tweetsById[p.rp] && n < 300; n++)
        p = state.tweetsById[p.rp];
    const out = [];
    (function w(t) {
        out.push(t);
        for (const k of state.repliesByParent[t.id] || [])
            w(k);
    })(p);
    return out;
}

function threadPart(t) {
    const X = t.x;
    const lead = (X.match(/^(?:@\w+\s+)+/) || [''])[0];
    const body = X.slice(lead.length);
    const ms = t.m || [];
    const em = extractEmbed(body, ms.length > 0);
    const tail = body.slice(em.t.length).trim();
    const post = POST_URL_RX.exec(tail);
    return {
        x: em.t.trim(), tail, qref: post ? { user: post[1], id: post[2] } : null, img: ms.slice(0, 4).filter(p => !VIDEO_URL_RX.test(p)), vid: ms.slice(0, 4).some(p => VIDEO_URL_RX.test(p))
    };
}

/* ---- document model shared by the PDF and print renderers: titled after the thread's first tweet ---- */
export function buildThreadDocument(L) {
    const P = L.map(threadPart);
    const r = P[0];
    let raw = (r.x || '').replace(/\s+/g, ' ').trim();
    let title;
    let skip = false;
    if (raw && raw.length <= 110) {
        title = raw;
        skip = true;
    }
    else if (raw) {
        const c = raw.slice(0, 100);
        const k = c.lastIndexOf(' ');
        title = (k > 50 ? c.slice(0, k) : c).replace(/[\s,;:.\-–—]+$/, '') + '…';
    }
    else
        title = `Thread by @${state.ownerHandle}`;
    if (skip)
        r.x = ''; /* the opening tweet already is the title; when it was too long for one it stays in the body in full */
    const a = formatDate(L[0].t);
    const b = formatDate(L.at(-1).t);
    return {
        title, author: displayName(), meta: `@${state.ownerHandle} · ${a == b ? a : `${a} – ${b}`}`, parts: P
    };
}

/**
 * Fill in `part.quote` ({name, handle, text, unavailable?}) for every tweet that quotes another post, so the exports can show
 * what was quoted instead of a bare link. Own tweets come from the archive; other accounts' posts are fetched (and cached).
 * A post that cannot be loaded keeps its link as before.
 */
export async function resolveQuotes(parts) {
    await Promise.all(parts.map(async (part) => {
        if (!part.qref)
            return;
        const { id, user } = part.qref;
        const own = state.tweetsById[id];
        if (own && !own.rt) {
            part.quote = { name: displayName(), handle: state.ownerHandle, text: own.x.replace(/(?:\s*https?:\/\/\S+)+\s*$/, '').trim() };
            return;
        }
        try {
            const r = await getEmbeddedPost(id, user);
            part.quote = r.p ? { name: r.p.n || '', handle: r.p.s || user, text: (r.p.x || '').trim() } : { name: '', handle: user, text: '', unavailable: true };
        }
        catch (e) {
            /* offline or rate limited: fall back to the link */
        }
    }));
}

export const threadFileName = t => (t.replace(/…$/, '').replace(/[\\\/:*?"<>|\u0000-\u001f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80) || `${state.ownerHandle}-thread`) + '.pdf';

export const shortenUrl = u => {
    u = u.replace(/^https?:\/\/(?:www\.)?/, '').replace(/\s+/g, ' ');
    return u.length > 80 ? u.slice(0, 79) + '…' : u;
};
