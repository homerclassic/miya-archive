/**
 * Parses the exported Markdown archive (data/tweets.md) into tweet objects.
 * 
 * Tweet fields (kept short because thousands of objects are created):
 *   id  string id            t   timestamp (ms)         l   likes          r   retweets
 *   rp  in-reply-to id       rh  reply-to handle        x   full text      lc  lower-cased text
 *   mn  mentions (lower)     rt  is a retweet           ra  retweeted author   rb  retweet body
 *   m   media paths          lk  has links
 * Fields added later by linkRetweets(): n (normalised text), so (self retweet), o (original tweet).
 */

/**
 * Parse the Markdown archive into an array of tweet objects (see the field legend at the top of this file).
 */
export function parseArchive(txt) {
    const out = [];
    for (const b of txt.split(/\n### (?=\d+\n)/).slice(1)) {
        const nl = b.indexOf('\n');
        const o = {};
        for (const l of b.slice(nl + 1).split('\n')) {
            const m = /^- \*\*([\w ]+):\*\* ?(.*)$/.exec(l);
            if (m)
                o[m[1]] = m[2];
        }
        const x = (o.Text || '').replace(/\\n/g, '\n').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        out.push({
            id: b.slice(0, nl).trim(), t: Date.parse(o.Date), l: +o.Likes || 0, r: +o.Retweets || 0, rp: o.in_reply_to_status_id || '', rh: ((o['Reply to'] || '').match(/^@(\w+)/) || [])[1] || '', x, lc: x.toLowerCase().replace(/[’‘]/g, "'"), mn: (o.Mentions || '').toLowerCase(), rt: /^RT @/.test(x), ra: (/^RT @(\w+):/.exec(x) || [])[1] || '', rb: x.replace(/^RT @\w+: ?/, ''), m: [...(o.Media || '').matchAll(/\]\(([^)]+)\)/g)].map(m => m[1]), lk: !!o.Links || /https?:\/\//.test(x)
        });
    }
    return out;
}
