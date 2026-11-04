/**
 * Download a thread as PDF, with a print-dialog fallback when canvases are tainted (e.g. file://).
 */

import { escapeHtml } from '../core/dom.js';
import { buildPdf, renderThreadPages } from './pdf-renderer.js';
import { buildThreadDocument, collectThreadIds, resolveQuotes, shortenUrl, threadFileName } from './thread-document.js';

/* Fallback when the browser won't let a page read its own images back (e.g. the file is opened straight from disk): the same article through the print dialog. */
function printThread(L, d) {
    d = d || buildThreadDocument(L);
    document.querySelectorAll('#pp').forEach(e => e.remove());
    const pp = document.createElement('div');
    pp.id = 'pp';
    pp.innerHTML = `<h1>${escapeHtml(d.title)}</h1><div class="ppm"><b style="display:block;color:#0f1419">${escapeHtml(d.author)}</b>${escapeHtml(d.meta)}</div><hr>` + d.parts.map(p => (p.x ? `<p>${escapeHtml(p.x)}</p>` : '') + (p.quote ? `<blockquote class="ppq"><b>Quoting ${escapeHtml(p.quote.name ? p.quote.name + ' ' : '')}@${escapeHtml(p.quote.handle)}</b><br>${escapeHtml(p.quote.unavailable ? '[This post is no longer available]' : p.quote.text)}</blockquote>` : p.tail ? `<p class="ppq">↳ ${escapeHtml(shortenUrl(p.tail))}</p>` : '') + (p.img.length ? `<div class="ppf n${p.img.length}">${p.img.map(u => `<img src="${escapeHtml(u)}" alt="">`).join('')}</div>` : '') + (p.vid ? '<p class="ppq">[Video not included in this archive]</p>' : '')).join('');
    document.body.append(pp);
    const old = document.title;
    addEventListener('afterprint', () => {
        pp.remove();
        document.title = old;
    }, { once: true });
    Promise.all([...pp.querySelectorAll('img')].map(i => i.complete ? 0 : new Promise(r => {
        i.onload = i.onerror = r;
    }))).then(() => {
        document.title = threadFileName(d.title).replace(/\.pdf$/, '');
        setTimeout(() => print(), 400);
    });
}

export async function downloadThreadPdf(id) {
    const L = collectThreadIds(id);
    if (L.length < 2)
        return;
    const d = buildThreadDocument(L);
    await resolveQuotes(d.parts);
    try {
        const blob = buildPdf(await renderThreadPages(d), d.title);
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = threadFileName(d.title);
        document.body.append(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    }
    catch (e) {
        printThread(L, d);
    }
}
