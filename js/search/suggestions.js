/**
 * Search suggestions for the sidebar search box (#sq): recent searches, hashtags,
 * mentions and frequent words from the archive. Typing shows a dropdown under the
 * box; picking one (or Enter) runs the search. Typing alone never navigates.
 */

import { $, escapeHtml } from '../core/dom.js';
import { state } from '../core/state.js';
import { ICON_CLOSE_PATH, ICON_SEARCH_PATH, filledIcon } from '../core/icons.js';
import { buildKeywordIndex } from '../data/keywords.js';
import { submitSearchBox } from './search-state.js';

const MAX_SHOWN = 7;
const MAX_RECENT = 5;

let index = null; // cached [{ label, query, kind, count }]

/**
 * Named suggestions-dropdown state, shared by both search boxes (#sq and #qm).
 * `owner` is the input the open dropdown belongs to (null = no dropdown open);
 * `list` is the suggestions currently shown for that input; `active` is the
 * highlighted suggestion index (-1 = none); `open` is whether a dropdown
 * (list or the empty-box hint) is currently shown. Open/closed is this field,
 * not just whether a .sugg element exists in the DOM.
 */
const sugg = { owner: null, list: [], active: -1, open: false };

/**
 * Build the suggestion index once from the loaded archive: hashtags and mentions
 * (counted per tweet) plus the frequent-word index. Cached for the session.
 */
function buildIndex() {
    if (index)
        return index;
    const tags = new Map();
    const users = new Map();
    for (const t of state.tweets) {
        if (t.so && t.o)
            continue;
        const seenT = new Set();
        for (const m of t.x.match(/#[\p{L}\p{N}_]+/gu) || []) {
            const k = m.toLowerCase();
            if (!seenT.has(k)) {
                seenT.add(k);
                tags.set(k, (tags.get(k) || 0) + 1);
            }
        }
        const seenU = new Set();
        for (const m of ((t.mn || '') + ' ' + t.x).match(/@[\p{L}\p{N}_]+/gu) || []) {
            const k = m.toLowerCase();
            if (!seenU.has(k)) {
                seenU.add(k);
                users.set(k, (users.get(k) || 0) + 1);
            }
        }
    }
    const out = [];
    for (const [label, count] of tags)
        out.push({ label, query: label, kind: 'tag', count });
    for (const [label, count] of users)
        out.push({ label, query: label, kind: 'user', count });
    for (const [label, count] of buildKeywordIndex())
        out.push({ label, query: label, kind: 'word', count });
    index = out;
    return index;
}

/** Suggestions whose label starts with the typed text (leading #/@ ignored). Archive words only — recent searches stay in the Recent view, never here. */
function matchAll(q) {
    const needle = q.trim().toLowerCase().replace(/^[@#]/, '');
    if (!needle)
        return [];
    const out = [];
    for (const e of buildIndex()) {
        if (e.label.replace(/^[@#]/, '').startsWith(needle))
            out.push(e);
    }
    out.sort((a, b) => b.count - a.count);
    return out.slice(0, MAX_SHOWN);
}

function dropdownEl(input) {
    let dd = input.parentElement.querySelector('.sugg');
    if (!dd) {
        dd = document.createElement('div');
        dd.className = 'sugg';
        input.parentElement.appendChild(dd);
    }
    return dd;
}

export function hideSuggestions(input) {
    // the dropdown element is per-input, so removing it is always safe;
    // but only the owning input may reset the shared list/highlight, or a
    // stale blur timer for #qm could wipe #sq's live list after a refocus.
    const dd = input.parentElement.querySelector('.sugg');
    if (dd)
        dd.remove();
    if (sugg.owner === input) {
        sugg.owner = null;
        sugg.list = [];
        sugg.active = -1;
        sugg.open = false;
    }
}

/* Recent searches live in localStorage under 'rs' (see js/core/storage.js); these mirror it without importing storage. */
function persistRecents() {
    try {
        localStorage.rs = JSON.stringify(state.recentSearches);
    }
    catch (e) {
    }
}

function removeRecent(q) {
    state.recentSearches = state.recentSearches.filter(x => x !== q);
    persistRecents();
}

function clearRecents() {
    state.recentSearches = [];
    persistRecents();
}

/**
 * Render a suggestion label with the part the user has not typed yet in bold,
 * Twitter-style: typed "intro" -> intro<strong>vert</strong>. Leading #/@ on the
 * label counts as typed only when the user typed it too.
 */
function boldRemainder(label, typed) {
    const t = (typed || '').trim().toLowerCase();
    if (!t)
        return escapeHtml(label);
    const needle = t.replace(/^[@#]/, '');
    const hasPrefix = /^[@#]/.test(label);
    const bare = hasPrefix ? label.slice(1) : label;
    if (!needle || !bare.toLowerCase().startsWith(needle))
        return escapeHtml(label);
    const cut = (hasPrefix ? 1 : 0) + needle.length;
    return escapeHtml(label.slice(0, cut)) + `<strong>${escapeHtml(label.slice(cut))}</strong>`;
}

const MAG = filledIcon(ICON_SEARCH_PATH, 22);
const X_ICON = filledIcon(ICON_CLOSE_PATH, 18);

/** Show the dropdown: recent searches for an empty box, matches otherwise. */
export function showSuggestions(input) {
    const q = input.value;
    const isRecentView = !q.trim();
    let list;
    if (isRecentView)
        list = state.recentSearches.slice(0, MAX_RECENT).map(r => ({ label: r, query: r, kind: 'recent', count: Infinity }));
    else
        list = matchAll(q);
    sugg.owner = input;
    sugg.list = list;
    sugg.active = -1;
    const dd = dropdownEl(input);
    if (!list.length) {
        if (isRecentView) {
            // empty box, no recents: Twitter's hint instead of an empty dropdown
            dd.innerHTML = '<div class="sugg-empty">Try searching for people, hashtags, or keywords</div>';
            sugg.open = true;
            return;
        }
        dd.remove();
        sugg.owner = null;
        sugg.open = false;
        return;
    }
    sugg.open = true;
    let html = '';
    if (isRecentView)
        html += `<div class="sugg-hd"><span>Recent</span><a class="sugg-clear">Clear all</a></div>`;
    html += list.map((e, i) => {
        const ic = MAG; // every suggestion gets the magnifier; the # / @ already live in the label itself
        const x = e.kind == 'recent' && isRecentView ? `<span class="sugg-x" data-q="${escapeHtml(e.query)}" title="Remove">${X_ICON}</span>` : '';
        const tx = isRecentView ? escapeHtml(e.label) : boldRemainder(e.label, q);
        return `<div class="sugg-it" data-i="${i}"><span class="sugg-ic">${ic}</span><span class="sugg-tx">${tx}</span>${x}</div>`;
    }).join('');
    dd.innerHTML = html;
    // mousedown (not click) so the pick lands before the input blurs and hides the list
    dd.querySelectorAll('.sugg-it').forEach(el => {
        el.addEventListener('mousedown', ev => {
            ev.preventDefault();
            pickSuggestion(input, +el.dataset.i);
        });
        el.addEventListener('mouseenter', () => setActive(input, +el.dataset.i));
    });
    dd.querySelectorAll('.sugg-x').forEach(el => {
        el.addEventListener('mousedown', ev => {
            ev.preventDefault();
            ev.stopPropagation();
            removeRecent(el.dataset.q);
            showSuggestions(input);
        });
    });
    const clear = dd.querySelector('.sugg-clear');
    if (clear)
        clear.addEventListener('mousedown', ev => {
            ev.preventDefault();
            clearRecents();
            hideSuggestions(input);
        });
}

function setActive(input, i) {
    if (sugg.owner !== input)
        return;
    sugg.active = i;
    const dd = input.parentElement.querySelector('.sugg');
    if (!dd)
        return;
    dd.querySelectorAll('.sugg-it').forEach((el, j) => el.classList.toggle('on', j === i));
}

function pickSuggestion(input, i) {
    const e = sugg.list[i];
    if (!e)
        return;
    hideSuggestions(input);
    input.value = e.query;
    submitSearchBox(e.query, '#' + input.id);
}

/** Arrow keys move the highlight; Enter picks it (or submits the typed text); Escape closes. Returns true when the key was consumed. */
export function handleSuggestKey(input, e) {
    if (e.key == 'ArrowDown' || e.key == 'ArrowUp') {
        if (!sugg.list.length) {
            showSuggestions(input);
            return true;
        }
        e.preventDefault();
        const d = e.key == 'ArrowDown' ? 1 : -1;
        setActive(input, (sugg.active + d + sugg.list.length) % sugg.list.length);
        return true;
    }
    else if (e.key == 'Enter') {
        e.preventDefault();
        if (sugg.active >= 0 && sugg.list[sugg.active])
            pickSuggestion(input, sugg.active);
        else if (input.value.trim()) {
            hideSuggestions(input);
            submitSearchBox(input.value, '#' + input.id);
        }
        else
            hideSuggestions(input);
        return true;
    }
    else if (e.key == 'Escape') {
        hideSuggestions(input);
        return true;
    }
    return false;
}
