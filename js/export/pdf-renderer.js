/**
 * Dependency-free PDF writer: A4 pages are drawn on canvases (so emoji and every language render as on screen)
 * and packed into a PDF as JPEG images.
 */

import { shortenUrl } from './thread-document.js';

const PDF_PAGE_W = 1190;

const PDF_PAGE_H = 1684;

const PDF_MARGIN = 112;

const PDF_CONTENT_W = PDF_PAGE_W - 2 * PDF_MARGIN;

const PDF_SANS = '"Segoe UI",system-ui,-apple-system,Roboto,Helvetica,Arial,sans-serif';

const PDF_SERIF = 'Georgia,"Times New Roman","Noto Serif",serif';

const loadImage = src => new Promise(r => {
    const i = new Image();
    i.onload = () => r(i);
    i.onerror = () => r(null);
    setTimeout(() => r(null), 15000);
    i.src = src;
});

/* A4 pages drawn on canvases (so emoji / any language render exactly as on screen), then packed into a PDF. */
/**
 * Lay out a thread document onto A4-sized canvases.
 */
export async function renderThreadPages(d) {
    const parts = d.parts;
    const imgs = await Promise.all(parts.map(p => Promise.all(p.img.map(loadImage))));
    const pages = [];
    let c;
    let x;
    let y;
    const np = () => {
        c = document.createElement('canvas');
        c.width = PDF_PAGE_W;
        c.height = PDF_PAGE_H;
        x = c.getContext('2d');
        x.fillStyle = '#fff';
        x.fillRect(0, 0, PDF_PAGE_W, PDF_PAGE_H);
        pages.push(c);
        y = PDF_MARGIN;
    };
    const need = h => {
        if (y + h > PDF_PAGE_H - PDF_MARGIN)
            np();
    };
    const wrap = (txt, fnt, mw) => {
        x.font = fnt;
        const out = [];
        const m = s => x.measureText(s).width;
        for (const para of txt.split('\n')) {
            if (!para.trim()) {
                out.push('');
                continue;
            }
            let line = '';
            for (let wd of para.split(' ')) {
                const t = line ? line + ' ' + wd : wd;
                if (m(t) <= mw) {
                    line = t;
                    continue;
                }
                if (line) {
                    out.push(line);
                    line = '';
                }
                while (m(wd) > mw) {
                    let k = wd.length;
                    while (k > 1 && m(wd.slice(0, k)) > mw)
                        k--;
                    out.push(wd.slice(0, k));
                    wd = wd.slice(k);
                }
                line = wd;
            }
            out.push(line);
        }
        return out;
    };
    const para = (txt, sz, lh, col, o = {}) => {
        const fnt = `${o.w || 400} ${sz}px ${o.ff || PDF_SERIF}`;
        const ind = o.ind || 0;
        for (const ln of wrap(txt, fnt, PDF_CONTENT_W - ind)) {
            need(lh);
            x.font = fnt;
            x.fillStyle = col;
            x.fillText(ln, PDF_MARGIN + ind, y + Math.round(lh * .72));
            if (o.bar) {
                x.fillStyle = '#ccd6dd';
                x.fillRect(PDF_MARGIN, y, 4, lh);
            }
            y += lh;
        }
        y += o.gap || 0;
    };
    np();
    para(d.title, 44, 58, '#0f1419', { w: 700, ff: PDF_SANS, gap: 8 });
    para(d.author, 25, 34, '#0f1419', { w: 700, ff: PDF_SANS });
    para(d.meta, 21, 32, '#536471', { ff: PDF_SANS });
    y += 16;
    x.fillStyle = '#ccd6dd';
    x.fillRect(PDF_MARGIN, y, PDF_CONTENT_W, 2);
    y += 38;
    parts.forEach((p, i) => {
        if (p.x)
            para(p.x, 23, 39, '#111', { gap: 20 });
        if (p.quote) {
            const q = p.quote;
            para(`Quoting ${q.name ? q.name + ' ' : ''}@${q.handle}`, 19, 30, '#657786', { ff: PDF_SANS, w: 700, ind: 16, bar: 1 });
            para(q.unavailable ? '[This post is no longer available]' : q.text, 21, 34, q.unavailable ? '#8b98a5' : '#333', { ind: 16, bar: 1, gap: 20 });
        }
        else if (p.tail)
            para('↳ ' + shortenUrl(p.tail), 19, 30, '#657786', {
                ff: PDF_SANS, ind: 16, bar: 1, gap: 20
            });
        const ims = imgs[i];
        const ok = ims.filter(Boolean);
        ims.forEach(im => {
            if (!im)
                para('[Image not included in this archive]', 19, 30, '#8b98a5', { ff: PDF_SANS, gap: 8 });
        });
        const per = ok.length > 1 ? 2 : 1;
        const gap = 12;
        const cw = (PDF_CONTENT_W - (per - 1) * gap) / per;
        const mh = per > 1 ? 400 : 480;
        for (let k = 0; k < ok.length; k += per) {
            const row = ok.slice(k, k + per).map(im => {
                let w = Math.min(cw, im.naturalWidth);
                let h = im.naturalHeight * w / im.naturalWidth;
                if (h > mh) {
                    w *= mh / h;
                    h = mh;
                }
                return { im, w, h };
            });
            const rh = Math.max(...row.map(r => r.h));
            const tw = row.reduce((s, r) => s + r.w, 0) + gap * (row.length - 1);
            need(rh + 8);
            y += 4;
            let px = PDF_MARGIN + (PDF_CONTENT_W - tw) / 2;
            for (const r of row) {
                x.save();
                x.beginPath();
                x.roundRect ? x.roundRect(px, y, r.w, r.h, 8) : x.rect(px, y, r.w, r.h);
                x.clip();
                x.drawImage(r.im, px, y, r.w, r.h);
                x.restore();
                px += r.w + gap;
            }
            y += rh + gap;
        }
        if (ok.length)
            y += 8;
        if (p.vid)
            para('[Video not included in this archive]', 19, 30, '#8b98a5', { ff: PDF_SANS, gap: 20 });
    });
    pages.forEach((pg, i) => {
        const g = pg.getContext('2d');
        g.font = `400 19px ${PDF_SANS}`;
        g.fillStyle = '#8b98a5';
        g.textAlign = 'center';
        g.fillText(`${i + 1} / ${pages.length}`, PDF_PAGE_W / 2, PDF_PAGE_H - PDF_MARGIN / 2 + 8);
    });
    return pages;
}

/**
 * Pack canvas pages into a minimal valid PDF Blob (one full-page JPEG per page).
 */
export function buildPdf(pages, title) {
    const enc = new TextEncoder();
    const chunks = [];
    const off = [];
    let pos = 0;
    const add = d => {
        const b = typeof d == 'string' ? enc.encode(d) : d;
        chunks.push(b);
        pos += b.length;
    };
    const jp = pages.map(c => {
        const u = c.toDataURL('image/jpeg', .9);
        const bin = atob(u.slice(u.indexOf(',') + 1));
        const b = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++)
            b[i] = bin.charCodeAt(i);
        return b;
    });
    const n = pages.length;
    const hx = t => {
        let o = 'FEFF';
        for (let i = 0; i < t.length; i++)
            o += t.charCodeAt(i).toString(16).padStart(4, '0');
        return o;
    };
    add('%PDF-1.4\n');
    const obj = (i, body) => {
        off[i] = pos;
        add(`${i} 0 obj\n${body}\nendobj\n`);
    };
    obj(1, '<</Type/Catalog/Pages 2 0 R>>');
    obj(2, `<</Type/Pages/Count ${n}/Kids[${pages.map((_, i) => `${3 + 3 * i} 0 R`).join(' ')}]>>`);
    pages.forEach((c, i) => {
        const p = 3 + 3 * i;
        const ct = p + 1;
        const im = p + 2;
        const cs = 'q 595 0 0 842 0 0 cm /I Do Q';
        obj(p, `<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Resources<</XObject<</I ${im} 0 R>>>>/Contents ${ct} 0 R>>`);
        obj(ct, `<</Length ${cs.length}>>\nstream\n${cs}\nendstream`);
        off[im] = pos;
        add(`${im} 0 obj\n<</Type/XObject/Subtype/Image/Width ${c.width}/Height ${c.height}/ColorSpace/DeviceRGB/BitsPerComponent 8/Filter/DCTDecode/Length ${jp[i].length}>>\nstream\n`);
        add(jp[i]);
        add('\nendstream\nendobj\n');
    });
    const inf = 3 + 3 * n;
    obj(inf, `<</Title<${hx(title || '')}>>>`);
    const xr = pos;
    const N = inf + 1;
    add(`xref\n0 ${N}\n0000000000 65535 f \n`);
    for (let i = 1; i < N; i++)
        add(String(off[i]).padStart(10, '0') + ' 00000 n \n');
    add(`trailer\n<</Size ${N}/Root 1 0 R/Info ${inf} 0 R>>\nstartxref\n${xr}\n%%EOF`);
    return new Blob(chunks, { type: 'application/pdf' });
}
