/**
 * The "Advanced search" dialog: filter chips that rewrite the query string.
 */

import { $, encodeUri, escapeHtml, navigate } from '../core/dom.js';
import { state } from '../core/state.js';
import { SORT_LABELS, applyOperator, parseQuery, tokenizeQuery } from './query.js';
import { isSearchRoute, setSearchQuery } from './search-state.js';

const chipButton = (on, op, v, l) => `<button class="chip${on ? ' on' : ''}" data-op="${op}" data-v="${escapeHtml(String(v))}">${l}</button>`;

const chipGroup = (h, b) => `<div class="cg"><div class="cl">${h}</div><div class="cr">${b}</div></div>`;

const closeAdvancedSearch = () => {
    state.advDialog.open = false;
    state.advDialog.draft = '';
    renderAdvancedModal();
};

export function openAdvancedSearch() {
    state.advDialog.open = true;
    state.advDialog.draft = isSearchRoute() ? state.searchQuery : '';
    renderAdvancedModal();
}

const pad = n => String(n).padStart(2, '0');

// UTC calendar day of a timestamp, as YYYY-MM-DD (the date-input format).
const isoDay = ms => {
    const x = new Date(ms);
    return x.getUTCFullYear() + '-' + pad(x.getUTCMonth() + 1) + '-' + pad(x.getUTCDate());
};

// Replace any since:/until:/before:/after: in q with the given dates (swapped if inverted).
const withDates = (q, s, u) => {
    const a = tokenizeQuery(q).filter(t => !/^-?(?:since|until|before|after):/i.test(t));
    if (s && u && s > u)
        [s, u] = [u, s];
    if (s)
        a.push('since:' + s);
    if (u)
        a.push('until:' + u);
    return a.join(' ');
};

function renderAdvancedModal() {
    let m = $('#adv');
    if (!state.advDialog.open) {
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
                const q = withDates(state.advDialog.draft, m.querySelector('#adv-since').value, m.querySelector('#adv-until').value);
                closeAdvancedSearch();
                isSearchRoute() ? setSearchQuery(q, { push: 1 }) : navigate('/search/' + encodeUri(q));
                return;
            }
            const b = e.target.closest('[data-op]');
            if (b) {
                state.advDialog.draft = applyOperator(state.advDialog.draft, b.dataset.op, b.dataset.v);
                renderAdvancedModal();
            }
        };
        m.onchange = e => {
            if (e.target.id == 'adv-since' || e.target.id == 'adv-until')
                state.advDialog.draft = withDates(state.advDialog.draft, m.querySelector('#adv-since').value, m.querySelector('#adv-until').value);
        };
    }
    const f = parseQuery(state.advDialog.draft);
    const eff = f.sort || (f.txt ? 'best' : 'new');
    let h = `<div class="mb"><div class="mh"><button class="x" data-cl="1" aria-label="Close" style="font-size:22px;padding:4px 10px">✕</button><b>Advanced search</b><button class="go" data-sub="1">Search</button></div><div class="mc">`;
    h += chipGroup('Show', [['', 'Everything'], ['original', 'Originals'], ['reply', 'Replies'], ['thread', 'Threads'], ['rt', 'Retweets'], ['quote', 'Quotes']].map(([k, l]) => chipButton(k ? f.type.length == 1 && f.type[0] == k : !f.type.length && !f.ntype.length, 'type', k, l)).join(''));
    h += chipGroup('Sort by', Object.entries(SORT_LABELS).filter(([k]) => k != 'best' || f.txt).map(([k, l]) => chipButton(eff == k, 'sort', k, l)).join(''));
    h += chipGroup('Contains', chipButton(f.has.includes('media'), 'has', 'media', 'Photos &amp; video') + chipButton(f.has.includes('link'), 'has', 'link', 'Links'));
    h += chipGroup('Likes', [[0, 'Any'], [1, '1+'], [10, '10+'], [50, '50+'], [100, '100+'], [500, '500+']].map(([v, l]) => chipButton(f.minl == v, 'minl', v, l)).join(''));
    h += chipGroup('Retweets', [[0, 'Any'], [1, '1+'], [5, '5+'], [10, '10+'], [50, '50+']].map(([v, l]) => chipButton(f.minr == v, 'minr', v, l)).join(''));
    const sv = f.since ? isoDay(f.since) : '';
    const uv = f.until ? isoDay(f.until - 864e5) : '';
    const dateStyle = 'border:1px solid var(--bd);border-radius:999px;padding:6px 14px;font-size:14px;background:transparent;color:var(--tx);font-family:inherit';
    h += chipGroup('Since', `<input type="date" id="adv-since" value="${sv}" style="${dateStyle}">`);
    h += chipGroup('Until', `<input type="date" id="adv-until" value="${uv}" style="${dateStyle}">`);
    m.innerHTML = h + '</div></div>';
}

/**
 * Registers this module's global event listeners. Called once from main.js.
 */
export function initAdvancedModal() {
    document.addEventListener('keydown', e => {
        if (e.key == 'Escape' && state.advDialog.open)
            closeAdvancedSearch();
    });
}
