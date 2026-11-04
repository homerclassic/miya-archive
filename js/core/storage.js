/**
 * localStorage persistence for likes, bookmarks and recent searches. Every access is wrapped in try/catch
 * because storage can be unavailable (private mode, file://).
 */

import { state } from './state.js';
import { renderSideCard } from '../ui/shell.js';

try {
    state.likedIds = new Set(JSON.parse(localStorage.lk || '[]'));
    state.bookmarkedIds = JSON.parse(localStorage.bm || '[]');
    if (!Array.isArray(state.bookmarkedIds))
        state.bookmarkedIds = [];
}
catch (e) {
    state.likedIds = new Set();
    state.bookmarkedIds = [];
}

export const persistHistory = () => {
    try {
        localStorage.lk = JSON.stringify([...state.likedIds]);
        localStorage.bm = JSON.stringify(state.bookmarkedIds);
    }
    catch (e) {
    }
};

try {
    state.recentSearches = JSON.parse(localStorage.rs || '[]');
    if (!Array.isArray(state.recentSearches))
        state.recentSearches = [];
}
catch (e) {
    state.recentSearches = [];
}

const saveRecentSearches = () => {
    try {
        localStorage.rs = JSON.stringify(state.recentSearches);
    }
    catch (e) {
    }
};

export const addRecentSearch = q => {
    q = (q || '').trim();
    if (q.length < 2)
        return;
    state.recentSearches = [q, ...state.recentSearches.filter(x => x != q)].slice(0, 8);
    saveRecentSearches();
    renderSideCard();
};
