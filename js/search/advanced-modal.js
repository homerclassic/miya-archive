/**
 * The "Advanced search" dialog: filter chips that rewrite the query string.
 */

import { $, encodeUri, escapeHtml, navigate } from '../core/dom.js';
import { MONTH_NAMES } from '../core/format.js';
import { state } from '../core/state.js';
import { SORT_LABELS, applyOperator, parseQuery } from './query.js';
import { isSearchRoute, setSearchQuery } from './search-state.js';

const chipButton = (on, op, v, l) => `<button class="chip${on ? ' on' : ''}" data-op="${op}" data-v="${escapeHtml(String(v))}">${l}</button>`;

const chipGroup = (h, b) => `<div class="cg"><div class="cl">${h}</div><div class="cr">${b}</div></div>`;

const closeAdvancedSearch = () => {
    state.advancedQuery = null;
    renderAdvancedModal();
};

export function openAdvancedSearch() {
    state.advancedQuery = isSearchRoute() ? state.searchQuery : '';
    renderAdvancedModal();
}

function availablePeriods() {
    if (state.periodsCache && state.periodsCache.T === state.tweets && state.periodsCache.n === state.tweets.length)
        return state.periodsCache;
    const y = new Set();
    const m = new Set();
    const d = new Set();
    for (const t of state.tweets) {
        if (!(t.t > 0))
            continue;
        const x = new Date(t.t);
        const Y = x.getUTCFullYear();
        const M = x.getUTCMonth() + 1;
        y.add(Y);
        m.add(Y + '-' + M);
        d.add(Y + '-' + M + '-' + x.getUTCDate());
    }
    return state.periodsCache = {
        T: state.tweets, n: state.tweets.length, y: [...y].sort((a, b) => a - b), m, d
    };
}

function renderAdvancedModal() {
    let m = $('#adv');
    if (state.advancedQuery == null) {
        m && m.remove();
        return;
    }
    if (!m) {
        m = document.createElement('div');
        m.id = 'adv';
        m.className = 'ov';
        document.body.append(m);
        m.onclick = e => {
            if (e.target == m || e.target.closest('[data-cl]'))
                return closeAdvancedSearch();
            if (e.target.closest('[data-sub]')) {
                const q = state.advancedQuery;
                state.advancedQuery = null;
                renderAdvancedModal();
                isSearchRoute() ? setSearchQuery(q, { push: 1 }) : navigate('/search/' + encodeUri(q));
                return;
            }
            const b = e.target.closest('[data-op]');
            if (b) {
                state.advancedQuery = applyOperator(state.advancedQuery, b.dataset.op, b.dataset.v);
                renderAdvancedModal();
            }
        };
    }
    const f = parseQuery(state.advancedQuery);
    const eff = f.sort || (f.txt ? 'best' : 'new');
    const ys = [...new Set(state.months.map(x => x.y))];
    let h = `<div class="mb"><div class="mh"><button class="x" data-cl="1" aria-label="Close" style="font-size:22px;padding:4px 10px">✕</button><b>Advanced search</b><button class="go" data-sub="1">Search</button></div><div class="mc">`;
    h += chipGroup('Show', [['', 'Everything'], ['original', 'Originals'], ['reply', 'Replies'], ['thread', 'Threads'], ['rt', 'Retweets'], ['quote', 'Quotes']].map(([k, l]) => chipButton(k ? f.type.length == 1 && f.type[0] == k : !f.type.length && !f.ntype.length, 'type', k, l)).join(''));
    h += chipGroup('Sort by', Object.entries(SORT_LABELS).filter(([k]) => k != 'best' || f.txt).map(([k, l]) => chipButton(eff == k, 'sort', k, l)).join(''));
    h += chipGroup('Contains', chipButton(f.has.includes('media'), 'has', 'media', 'Photos &amp; video') + chipButton(f.has.includes('link'), 'has', 'link', 'Links'));
    h += chipGroup('Likes', [[0, 'Any'], [1, '1+'], [10, '10+'], [50, '50+'], [100, '100+'], [500, '500+']].map(([v, l]) => chipButton(f.minl == v, 'minl', v, l)).join(''));
    h += chipGroup('Retweets', [[0, 'Any'], [1, '1+'], [5, '5+'], [10, '10+'], [50, '50+']].map(([v, l]) => chipButton(f.minr == v, 'minr', v, l)).join(''));
    const D = availablePeriods();
    const pad = n => String(n).padStart(2, '0');
    const sel = f.sr && f.sr == f.ur ? /^(\d{4})(?:-(\d{1,2})(?:-(\d{1,2}))?)?$/.exec(f.sr) : null;
    const sy = sel ? +sel[1] : 0;
    const sm = sel && sel[2] ? +sel[2] : 0;
    const sd = sel && sel[3] ? +sel[3] : 0;
    let w = `<div class="cr">${chipButton(!f.sr && !f.ur, 'range', '', 'All time')}${D.y.map(y => chipButton(sy == y, 'range', y, y)).join('')}</div>`;
    if (sy)
        w += `<div class="mg">${MONTH_NAMES.map((n, k) => `<button class="chip mo${sm == k + 1 ? ' on' : ''}" data-op="range" data-v="${sy}-${pad(k + 1)}"${D.m.has(sy + '-' + (k + 1)) ? '' : ' disabled'}>${n}</button>`).join('')}</div>`;
    if (sy && sm) {
        const nd = new Date(Date.UTC(sy, sm, 0)).getUTCDate();
        const mv = sy + '-' + pad(sm);
        w += `<div class="dr">${chipButton(!sd, 'range', mv, 'All days')}${Array.from({ length: nd }, (_, k) => k + 1).map(d => `<button class="chip mo${sd == d ? ' on' : ''}" data-op="range" data-v="${mv}-${pad(d)}"${D.d.has(sy + '-' + sm + '-' + d) ? '' : ' disabled'}>${d}</button>`).join('')}</div>`;
    }
    h += `<div class="cg"><div class="cl">When</div>${w}</div>`;
    m.innerHTML = h + '</div></div>';
}

/**
 * Registers this module's global event listeners. Called once from main.js.
 */
export function initAdvancedModal() {
    document.addEventListener('keydown', e => {
        if (e.key == 'Escape' && state.advancedQuery != null)
            closeAdvancedSearch();
    });
}
