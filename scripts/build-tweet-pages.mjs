// Build per-tweet static pages for link embeds.
//
// Reads data/tweets.md (the frozen 2019-2020 export) and writes one HTML
// page per tweet to <dist>/tweet/<id>.html, plus a shared stylesheet.
// Each page carries the tweet text in the body and in Open Graph /
// Twitter Card meta tags, so a shared link unfurls with text + media.
//
// Called from scripts/build.mjs (npm run build) so the pages ship in dist/
// and are served at https://homerclassic.github.io/miya-archive/tweet/<id>.html
// alongside the viewer. Nothing here is committed to the repo; the pages
// are generated fresh on every build from data/tweets.md.

import fs from 'node:fs';
import path from 'node:path';

const SITE_URL = 'https://homerclassic.github.io/miya-archive';
const AUTHOR_NAME = 'MIYA BLACK HEARTED CYBER ANGEL BABY ☸️ CORONA STAN';
const AUTHOR_HANDLE = 'BPD_GOD';
const AVATAR_URL = SITE_URL + '/data/miya.png';

// X's actual glyphs (same paths the viewer uses in js/core/icons.js), so the
// static page's action row matches the viewer's.
const ICON_RETWEET_PATH = 'M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z';
const ICON_BACK_PATH = 'M7.414 13l5.043 5.04-1.414 1.42L3.586 12l7.457-7.46 1.414 1.42L7.414 11H21v2H7.414z';
// Stroke video icon (the viewer's ICONS.vid), for the "not included" notice.
const VID_ICON = '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10 9.5v5l4-2.5z"/>';

/** Same output as the viewer's filledIcon(): a filled 24x24 SVG. Size comes from CSS unless given. */
function svgIcon(d, w) {
    const s = w ? ` width="${w}" height="${w}"` : '';
    return `<svg viewBox="0 0 24 24"${s} fill="currentColor" aria-hidden="true"><path d="${d}"/></svg>`;
}

function svgStroke(inner) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
}

function escapeHtml(s) {
    return String(s)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function fmtDate(iso) {
    const d = new Date(iso);
    const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()];
    const hh = String(d.getUTCHours()).padStart(2, '0');
    const mm = String(d.getUTCMinutes()).padStart(2, '0');
    return `${mon} ${d.getUTCDate()}, ${d.getUTCFullYear()} at ${hh}:${mm} UTC`;
}

function fmtDateShort(iso) {
    const d = new Date(iso);
    const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()];
    return `${mon} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

/** 12-hour UTC clock like the viewer's focused timestamp ("6:19 PM"). */
function fmtTime(iso) {
    const d = new Date(iso);
    let h = d.getUTCHours();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${String(d.getUTCMinutes()).padStart(2, '0')} ${ampm}`;
}

/** Collapse whitespace/newlines to single spaces, truncate at a word boundary. */
function plainSnippet(text, limit) {
    let t = String(text).replace(/\s+/g, ' ').trim();
    if (t.length <= limit)
        return t;
    const cut = t.slice(0, limit);
    const k = cut.lastIndexOf(' ');
    return (k > 40 ? cut.slice(0, k) : cut) + '…';
}

const URL_RE = /https?:\/\/[^\s<>\"]+/g;
const MENTION_RE = /(?<![\w/])@(\w{1,15})\b/g;
const HASHTAG_RE = /(?<![\w/&#])#(\w+)/g;

/** Escape HTML, then link URLs, @mentions, #hashtags. Newlines -> <br>. */
function linkify(text) {
    const tokens = [];
    let m;
    URL_RE.lastIndex = 0;
    while ((m = URL_RE.exec(text))) {
        let url = m[0];
        while (url && '.,;:!?)]}'.includes(url[url.length - 1]))
            url = url.slice(0, -1);
        if (url)
            tokens.push([m.index, m.index + url.length, 'url', url]);
    }
    const inside = (s, e) => tokens.some(([a, b]) => s >= a && e <= b);
    MENTION_RE.lastIndex = 0;
    while ((m = MENTION_RE.exec(text))) {
        if (!inside(m.index, m.index + m[0].length))
            tokens.push([m.index, m.index + m[0].length, 'mention', m[1]]);
    }
    HASHTAG_RE.lastIndex = 0;
    while ((m = HASHTAG_RE.exec(text))) {
        if (!inside(m.index, m.index + m[0].length))
            tokens.push([m.index, m.index + m[0].length, 'hashtag', m[1]]);
    }
    tokens.sort((a, b) => a[0] - b[0]);
    let out = '';
    let pos = 0;
    for (const [s, e, kind, val] of tokens) {
        if (s < pos)
            continue;
        out += escapeHtml(text.slice(pos, s));
        if (kind === 'url') {
            let disp = val.replace(/^https?:\/\//, '');
            if (disp.length > 50)
                disp = disp.slice(0, 47) + '…';
            out += `<a href="${escapeHtml(val)}" target="_blank" rel="noopener">${escapeHtml(disp)}</a>`;
        }
        else if (kind === 'mention') {
            out += `<a href="https://x.com/${val}" target="_blank" rel="noopener">@${val}</a>`;
        }
        else {
            out += `<a href="https://x.com/hashtag/${val}" target="_blank" rel="noopener">#${val}</a>`;
        }
        pos = e;
    }
    out += escapeHtml(text.slice(pos));
    return out.replace(/\n/g, '<br>');
}

const MEDIA_RE = /!\[(photo)\]\(([^)]+)\)|\[(video|animated_gif)\]\(([^)]+)\)/g;

/**
 * Parse the Media field into [{ kind: 'photo'|'video'|'gif', local }].
 * `local` is the path from the Media field (e.g. data/tweet_media/<id>-<hash>.jpg).
 * The files are deployed on this site (dist/data/tweet_media/), so pages use
 * them directly instead of hotlinking pbs.twimg.com, which now 403s/404s
 * for most of them. Videos/GIFs get no og image — the page falls back to
 * the avatar.
 */
function parseMedia(field) {
    const items = [];
    if (!field)
        return items;
    MEDIA_RE.lastIndex = 0;
    let m;
    while ((m = MEDIA_RE.exec(field))) {
        if (m[1] === 'photo') {
            items.push({ kind: 'photo', local: m[2] });
        }
        else {
            items.push({ kind: m[3] === 'animated_gif' ? 'gif' : 'video', local: m[4] });
        }
    }
    return items;
}

/** Parse data/tweets.md into [{ id, date, likes, retweets, replyUser, replyStatus, media, text }]. */
function parseTweets(md) {
    const tweets = [];
    for (const rec of md.split('\n### ').slice(1)) {
        const id = rec.split('\n', 1)[0].trim();
        if (!/^\d+$/.test(id))
            continue;
        const get = (re) => {
            const m = rec.match(re);
            return m ? m[1] : null;
        };
        const date = get(/- \*\*Date:\*\* (\S+)/);
        const likes = parseInt(get(/- \*\*Likes:\*\* (\d+)/) || '0', 10);
        const retweets = parseInt(get(/- \*\*Retweets:\*\* (\d+)/) || '0', 10);
        const reply = rec.match(/- \*\*Reply to:\*\* @(\S+) \(status (\d+)\)/);
        const mediaField = get(/- \*\*Media:\*\* (.+)/);
        const text = get(/- \*\*Text:\*\* ?([\s\S]*?)(?:\n\s*\n|\n?$)/) || '';
        // Quoted tweet: the last status URL in the Links field (Twitter appends
        // the quoted post's URL at the end of the text). Null when the tweet
        // doesn't quote another post.
        const linksField = get(/- \*\*Links:\*\* (.+)/) || '';
        const statusUrls = [...linksField.matchAll(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/g)].map((m) => m[1]);
        const quoteId = statusUrls.length ? statusUrls[statusUrls.length - 1] : null;
        tweets.push({
            id,
            date,
            likes,
            retweets,
            replyUser: reply ? reply[1] : null,
            replyStatus: reply ? reply[2] : null,
            media: parseMedia(mediaField),
            text: text.trim(),
            quoteId,
        });
    }
    return tweets;
}

/**
 * Media grid mirroring the viewer's (.md n1-4, .mi photo spans, .mf video
 * notice). Photos use the deployed local files (../data/tweet_media/...),
 * not pbs.twimg.com. Videos/GIFs link to the local mp4 file.
 */
function mediaHtml(media, tid) {
    if (!media.length)
        return '';
    const n = Math.min(media.length, 4);
    const items = media.slice(0, 4).map((it) => {
        if (it.kind === 'photo')
            return `<span class="mi"><img src="../${it.local}" alt="Photo from tweet ${tid}" loading="lazy" onerror="this.remove()"></span>`;
        const kind = it.kind === 'gif' ? 'GIF' : 'Video';
        return `<div class="mf">${svgStroke(VID_ICON)}<span>${kind} — <a href="../${it.local}" target="_blank" rel="noopener">Watch</a></span></div>`;
    });
    return `<div class="md n${n}">${items.join('')}</div>`;
}

/**
 * Quote card for a quoted tweet that is in the archive: the quoted post's
 * author, date, text and photos, linking to its own static page. The quoted
 * post is always by the author (the archive only holds her tweets), so the
 * card uses her avatar and name. Returns '' when the quoted post is not in
 * the archive (nothing local to embed).
 */
function quoteHtml(q) {
    if (!q)
        return '';
    const qtext = q.text.trim();
    const qtx = qtext ? `<div class="qx">${linkify(qtext)}</div>` : '';
    const qmd = mediaHtml(q.media, q.id);
    return `<div class="qc">`
        + `<a class="nm" href="${q.id}.html"><div class="qh"><span class="av"><img src="../data/miya.png" alt="${AUTHOR_NAME}"></span><div><b>${AUTHOR_NAME}</b><div class="mu">@${AUTHOR_HANDLE} · ${fmtDateShort(q.date)}</div></div></div></a>`
        + qtx + qmd
        + `</div>`;
}

/**
 * Remove the quoted post's status URL from the displayed text (Twitter hides
 * it and shows the quote card instead). Returns the cleaned text.
 */
function stripQuoteUrl(text, quoteId) {
    if (!quoteId)
        return text;
    return text
        .replace(new RegExp(`https?://(?:twitter\\.com|x\\.com)/\\w+/status/${quoteId}\\s*`, 'g'), '')
        .trim();
}

function tweetPage(t, idSet, byId) {
    const pageUrl = `${SITE_URL}/tweet/${t.id}.html`;
    const firstPhoto = t.media.find((it) => it.kind === 'photo');
    // og:image needs an absolute URL; use the deployed local file (same site,
    // no hotlink block) instead of pbs.twimg.com.
    const ogImage = firstPhoto ? `${SITE_URL}/${firstPhoto.local}` : AVATAR_URL;
    const card = firstPhoto ? 'summary_large_image' : 'summary';
    // The quoted post, when it is in the archive, is embedded as a card below
    // the text — so its status URL is stripped from the displayed text, as
    // Twitter does. When the quoted post is not in the archive there is
    // nothing to embed, so the URL stays as a link.
    const quoted = t.quoteId && idSet.has(t.quoteId) ? byId.get(t.quoteId) : null;
    const displayText = quoted ? stripQuoteUrl(t.text, t.quoteId) : t.text;
    // Photo-only tweets have an empty Text field: fall back to a date-based
    // title/description so the meta tags are never blank.
    const hasText = displayText.trim().length > 0;
    const titleText = hasText ? plainSnippet(displayText, 100) : `Photo · ${fmtDateShort(t.date)}`;
    const title = `${titleText} · ${AUTHOR_NAME} (@${AUTHOR_HANDLE})`;
    // The embed title (og:title / twitter:title) is the author's name and
    // handle, as on Twitter — not the tweet text. The tweet text stays as
    // the embed description.
    const embedTitle = `${AUTHOR_NAME} (@${AUTHOR_HANDLE})`;
    const desc = hasText ? plainSnippet(displayText, 300)
        : `Photo posted by ${AUTHOR_NAME} (@${AUTHOR_HANDLE}) on ${fmtDateShort(t.date)} in the Miya archive.`;
    const metaDesc = hasText ? plainSnippet(displayText, 155) : desc;

    // Replying-to, viewer's format: the @handle, linking to the parent tweet's
    // own page when it is in the archive, else out to X. A self-reply drops
    // the author's own handle (as the viewer does) and links the parent page.
    let replyLine = '';
    if (t.replyStatus) {
        if (idSet.has(t.replyStatus)) {
            const self = t.replyUser && t.replyUser.toLowerCase() === AUTHOR_HANDLE.toLowerCase();
            // A self-reply gets no "Replying to" line at all; replies to
            // someone else link the parent tweet's own page.
            replyLine = self
                ? ''
                : `<div class="mu">Replying to <a href="${t.replyStatus}.html">@${escapeHtml(t.replyUser)}</a></div>`;
        }
        else if (t.replyUser) {
            // Parent not in the archive: link out to X — unless the parent is
            // by the author herself (a self-reply), which gets no line at all.
            const self = t.replyUser.toLowerCase() === AUTHOR_HANDLE.toLowerCase();
            replyLine = self
                ? ''
                : `<div class="mu">Replying to <a href="https://x.com/${escapeHtml(t.replyUser)}/status/${t.replyStatus}" target="_blank" rel="noopener">@${escapeHtml(t.replyUser)} on X</a></div>`;
        }
    }
    const rtLabel = /^RT @/.test(t.text)
        ? `<div class="rtl"><span class="ri">${svgIcon(ICON_RETWEET_PATH, 14)}</span><a class="rtn" href="../#/tweets">${AUTHOR_NAME} Retweeted</a></div>` : '';
    const tx = hasText ? `<div class="tx">${linkify(displayText)}</div>` : '';

    const viewApp = `<div class="bar"><a href="../#/tweet/${t.id}">View in archive</a></div>`;

    const ld = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: title,
        description: desc,
        author: { '@type': 'Person', name: AUTHOR_NAME, alternateName: AUTHOR_HANDLE },
        datePublished: t.date,
        url: pageUrl,
    };
    if (firstPhoto)
        ld.image = `${SITE_URL}/${firstPhoto.local}`;

    return '<!doctype html>\n'
        + '<html lang="en" data-t="light">\n<head>\n<meta charset="utf-8">\n'
        + '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
        + `<title>Miya Archive · ${escapeHtml(title)}</title>\n`
        + `<link rel="icon" href="../assets/favicon.jpg" type="image/jpeg">\n`
        + `<meta name="description" content="${escapeHtml(metaDesc)}">\n`
        + `<meta name="author" content="${AUTHOR_NAME}">\n`
        + `<meta property="og:title" content="${escapeHtml(embedTitle)}">\n`
        + `<meta property="og:description" content="${escapeHtml(desc)}">\n`
        + `<meta property="og:type" content="article">\n`
        + `<meta property="og:url" content="${pageUrl}">\n`
        + `<meta property="og:image" content="${ogImage}">\n`
        + `<meta name="twitter:card" content="${card}">\n`
        + `<meta name="twitter:title" content="${escapeHtml(embedTitle)}">\n`
        + `<meta name="twitter:description" content="${escapeHtml(desc)}">\n`
        + `<meta name="twitter:image" content="${ogImage}">\n`
        + `<link rel="canonical" href="${pageUrl}">\n`
        + '<link rel="stylesheet" href="../app.css">\n'
        + '<link rel="stylesheet" href="styles.css">\n'
        + '<script type="application/ld+json">\n' + JSON.stringify(ld, null, 2) + '\n</script>\n'
        + '</head>\n<body>\n'
        + '<div id="app"><nav class="sp" aria-hidden="true"></nav><main>\n'
        + '<header class="hd0">'
        + `<a class="bk" href="../" aria-label="Back to archive">${svgIcon(ICON_BACK_PATH, 20)}</a>`
        + `<div><b>Post</b></div>`
        + '</header>\n'
        + `<article class="tw fo">\n`
        + rtLabel
        + '<div class="fh">'
        + `<a class="avl2" href="../"><span class="av"><img src="../data/miya.png" alt="${AUTHOR_NAME}"></span></a>`
        + `<div><a class="nm" href="../"><b>${AUTHOR_NAME}</b></a><div class="mu"><a class="nm" href="../">@${AUTHOR_HANDLE}</a> · ${fmtDateShort(t.date)}</div></div>`
        + '</div>\n'
        + replyLine
        + tx
        + mediaHtml(t.media, t.id)
        + quoteHtml(quoted)
        + `<div class="st"><span><b>${t.retweets.toLocaleString()}</b> Retweets</span><span><b>${t.likes.toLocaleString()}</b> Likes</span></div>\n`
        + '</article>\n'
        + viewApp
        + '</main><aside class="sp" aria-hidden="true"></aside></div>\n'
        + '</body>\n</html>\n';
}

const STYLES = `/* Miya Archive — per-tweet pages. The tweet card itself is styled by the
   viewer's own stylesheet (../app.css); this file only covers the bits the
   viewer does not have: the header back-button colour, the quote card, and
   the layout spacers. The "View in archive" link uses the viewer's own .bar class
   (the same bar as "View in timeline" in the post view). */
/* The back arrow is a link, and links are blue by default; in the viewer it
   is a span, so it renders in the text colour. Force it back to black here. */
.hd0 a.bk { color: var(--tx); }
/* The timestamp line is gone, so the counts line lost the divider above it
   (the timestamp's border-bottom). Give it its own top divider, with a
   margin above it — the border sits at the top edge of .st and its padding
   is below the border, so without the margin the line touches the text. */
.tw.fo .st { border-top: 1px solid var(--bd); margin-top: 16px; }
/* Quote card: a bordered box inside the tweet, like Twitter's quote embed. */
.qc {
  display: block;
  margin-top: 12px;
  padding: 12px;
  border: 1px solid var(--bd);
  border-radius: 16px;
  color: var(--tx);
  text-decoration: none;
}
.qc:hover { background: var(--hv); }
/* The card itself is a div, not a link: the quoted text can contain its own
   links, and an <a> inside an <a> is invalid — the browser splits the card
   apart. The header is the link to the quoted tweet instead. */
.qc > a {
  display: block;
  color: inherit;
  text-decoration: none;
}
.qc .qh {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  line-height: 20px;
}
.qc .qh > div { min-width: 0; }
.qc .qh b { display: block; }
.qc .qh .av { width: 20px; height: 20px; }
.qc .qh .av img { width: 20px; height: 20px; }
.qc .qx { margin-top: 4px; font-size: 15px; line-height: 20px; }
/* The action row was removed from the static page, so the stats' bottom
   border sat directly on the card's own bottom border — two lines touching.
   Drop the stats border so there is a single divider above "View in archive".
   (Viewer only: the app still has its action row, so its stats border stays.) */
.tw.fo .st { border-bottom: 0; }
/* The static page is one centred column, not the app's three-column flex.
   The empty nav/aside spacers made the column drift with viewport width —
   on a narrow window it went full-bleed, so the text stretched across the
   whole screen. Drop the spacers and centre main outright; on phones it
   stays full-width, as in the app. */
#app { display: block; }
nav.sp, aside.sp { display: none; }
main { width: 600px; max-width: 100%; margin: 0 auto; }
`;


/** Generate all per-tweet pages into <out>/tweet/. `out` is the dist dir. */
export function buildTweetPages(out) {
    const md = fs.readFileSync('data/tweets.md', 'utf8');
    const tweets = parseTweets(md);
    tweets.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    const idSet = new Set(tweets.map((t) => t.id));
    const byId = new Map(tweets.map((t) => [t.id, t]));
    const dir = path.join(out, 'tweet');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'styles.css'), STYLES);
    let withPhoto = 0;
    let withReply = 0;
    let withQuote = 0;
    tweets.forEach((t, i) => {
        if (t.media.some((it) => it.kind === 'photo'))
            withPhoto++;
        if (t.replyStatus && idSet.has(t.replyStatus))
            withReply++;
        if (t.quoteId && idSet.has(t.quoteId))
            withQuote++;
        const html = tweetPage(t, idSet, byId);
        fs.writeFileSync(path.join(dir, t.id + '.html'), html);
    });
    console.log(`tweet pages: ${tweets.length} in ${dir} (${withPhoto} with a photo for og:image, ${withReply} replies link inside the archive, ${withQuote} quotes embedded)`);
    return tweets.length;
}

// Run standalone: node scripts/build-tweet-pages.mjs [out-dir]
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
    buildTweetPages(process.argv[2] || 'dist');
}
