/**
 * Start-up: fetches the archive, parses it and renders the first route.
 */

import { DATA_URL } from './core/config.js';
import { main } from './core/dom.js';
import { state } from './core/state.js';
import { linkRetweets } from './data/link-tweets.js';
import { parseArchive } from './data/parse-archive.js';
import { handleRoute } from './router.js';
import { renderShell } from './ui/shell.js';

/**
 * Install a freshly parsed archive: sort, index, detect the owner handle, link retweets, build the shell and show the first route.
 */
function loadArchive(txt) {
    state.keywordCounts = null;
    state.forYouFeed = null;
    state.tweets = parseArchive(txt).sort((a, b) => a.t - b.t);
    state.tweetsById = {};
    state.repliesByParent = {};
    state.indexById = {};
    state.tweets.forEach((t, i) => {
        state.tweetsById[t.id] = t;
        state.indexById[t.id] = i;
    });
    const c = {};
    for (const t of state.tweets)
        if (state.tweetsById[t.rp]) {
            (state.repliesByParent[t.rp] || (state.repliesByParent[t.rp] = [])).push(t);
            c[t.rh] = (c[t.rh] || 0) + 1;
        }
    state.ownerHandle = Object.keys(c).sort((a, b) => c[b] - c[a])[0] || 'me';
    state.loadStatus = 'ready';
    linkRetweets();
    renderShell();
    handleRoute();
}

/**
 * Fetch data/tweets.md, parse it and render the first route.
 */
export function startApp() {
    state.loadStatus = 'loading';
    main.innerHTML = '<div class="spin-loader" role="status" aria-label="Loading"><svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><circle class="pc" cx="12" cy="12" r="9" pathLength="100"/></svg></div>';
    fetch(DATA_URL).then(r => {
        if (!r.ok)
            throw new Error('HTTP ' + r.status);
        return r.text();
    }).then(loadArchive).catch(e => {
        state.loadStatus = 'error';
        state.loadError = e;
        main.innerHTML = '<div class="more" style="padding:40px 24px;white-space:normal;text-align:center"><b style="display:block;font-size:20px;color:var(--tx);margin-bottom:8px">Couldn’t load data/tweets.md</b>Keep the <code>data</code> folder next to index.html, and open the page through a web server (http://) rather than by double-clicking it (file://), since browsers block loading files that way.</div>';
    });
}
