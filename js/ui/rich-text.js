/**
 * Turns raw tweet text into safe HTML: links, @mentions, #hashtags, search highlighting and quick-search words.
 */

import { escapeHtml } from '../core/dom.js';
import { state } from '../core/state.js';
import { WORD_REGEX, buildKeywordIndex } from '../data/keywords.js';

/* profile links: other users open their profile on X (works even for deleted/suspended accounts); the archive's own author opens the Tweets page */
function profileHref(u) {
    u = String(u || '').replace(/^@/, '');
    return u.toLowerCase() == state.ownerHandle.toLowerCase() ? { h: '#/tweets', t: '' } : { h: `https://x.com/${encodeURIComponent(u)}`, t: ' target="_blank" rel="noopener"' };
}

export function profileAnchor(u, cls, inner) {
    const p = profileHref(u);
    return `<a${cls ? ` class="${cls}"` : ''} href="${p.h}"${p.t}>${inner}</a>`;
}

export const linkify = x => escapeHtml(x).replace(/(https?:\/\/\S+)|(^|[^\w&])([@#])(\w+)/g, (m, u, p, s, w) => {
    if (!u) {
        if (s == '@') {
            const q = profileHref(w);
            return `${p}<a href="${q.h}"${q.t}>@${w}</a>`;
        }
        return `${p}<a data-q="${s}${w}">${s}${w}</a>`;
    }
    const id = (u.match(/(?:twitter|x)\.com\/[\w\/]*?status(?:es)?\/(\d+)/i) || [])[1];
    const txt = u.replace(/^https?:\/\//, '').slice(0, 40);
    return id && state.tweetsById[id] ? `<a href="#/t/${id}" title="Open this tweet in the archive">${txt}</a>` : `<a href="${u}" target="_blank" rel="noopener">${txt}</a>`;
});

export const highlightHtml = h => state.highlightStatus == 'none' ? h : h.split(/(<[^>]*>|&[a-z]+;)/).map(p => /^(<|&[a-z]+;$)/.test(p) ? p : p.replace(state.highlightRegex, '<mark>$&</mark>')).join('');

/**
 * Escape tweet text and add links, mentions, hashtags, search highlights and quick-search words.
 */
export const richText = x => wrapKeywords(highlightHtml(linkify(x)));

const wrapKeywords = h => {
    if (state.keywordCountsStatus == 'unbuilt') {
        state.keywordCounts = buildKeywordIndex();
        state.keywordCountsStatus = 'ready';
    }
    let a = 0;
    return h.split(/(<[^>]*>|&[a-z]+;)/).map(p => {
        if (p[0] == '<') {
            if (/^<a[\s>]/.test(p))
                a++;
            else if (p == '</a>')
                a--;
            return p;
        }
        if (a > 0 || /^&[a-z]+;$/.test(p))
            return p;
        return p.replace(WORD_REGEX, w => {
            const k = w.toLowerCase().replace(/[’‘]/g, "'");
            return w.length >= 3 && (state.keywordCounts.get(k) || 0) >= 3 ? `<span class="kw" data-q="&quot;${k}&quot;">${w}</span>` : w;
        });
    }).join('');
};
