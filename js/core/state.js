/**
 * Shared mutable application state. Every module reads and writes this one object, so a value that used to be a
 * top-level `let` is now `state.<name>`.
 */
export const state = {
  /** every tweet, sorted by time */
  tweets: [],
  /** id -> tweet */
  tweetsById: {},
  /** parent id -> [reply tweets] (only parents present in the archive) */
  repliesByParent: {},
  /** id -> position in `tweets` */
  indexById: {},
  /** the archive owner's handle (the most replied-to account) */
  ownerHandle: 'me',
  /** archive data lifecycle: boot (before startApp) -> loading -> ready | error */
  loadStatus: 'boot',
  /** the fetch/parse error when loadStatus is 'error' (null otherwise) */
  loadError: null,
  /** search highlight regex for the current query (null when no highlight is active) */
  highlightRegex: null,
  /** highlight state: 'none' = no highlight, 'active' = highlightRegex is set (set alongside it) */
  highlightStatus: 'none',
  /** current search string */
  searchQuery: '',
  /** months covered by the archive (for the date filter) */
  months: [],
  /** cached word counts for quick-search (null until built) */
  keywordCounts: null,
  /** keyword-counts cache state: 'unbuilt' = not built yet, 'ready' = keywordCounts is usable */
  keywordCountsStatus: 'unbuilt',
  /** open image viewer (null = closed) */
  lightbox: null,
  /** tweet ids liked in this browser */
  likedIds: new Set(),
  /** tweet ids bookmarked in this browser */
  bookmarkedIds: [],
  /** timeline sort direction (true = oldest first) */
  oldestFirst: true,
  /** advanced-search dialog: open flag plus the draft query being edited (null = closed) */
  advDialog: { open: false, draft: '' },
  /** recent searches */
  recentSearches: [],
  /** shuffled "For you" feed (stable while navigating) (null until built) */
  forYouFeed: null,
  /** "For you" feed state: 'unbuilt' = not built yet, 'ready' = forYouFeed is usable */
  forYouFeedStatus: 'unbuilt',
  /** history key -> scroll position */
  scrollMemory: new Map(),
  /** monotonic key for history entries */
  historyKeyCounter: Date.now(),
  /** current navigation: the history key being shown, which way we got here, and the scroll position to restore (back only) */
  nav: { key: null, direction: 'forward', restore: null },
  /** current route, set by the router on every navigation: the section and the rest of the path.
      This is the single named read for "what page are we on" — call sites must read this, not re-parse location.hash. */
  route: { section: '', rest: '' },
  /** reader mode toggle (true = on). Mirrored to documentElement dataset.r ('1' = on, absent = off) by the shell setter. */
  readerMode: false,
  /** quick-search toggle (true = on). Mirrored to documentElement dataset.k ('0' = off, absent = on) by the shell setter. */
  quickSearch: false,
};

/** Single toggle for the timeline sort direction (oldest-first <-> newest-first). */
export function toggleOldestFirst() {
    state.oldestFirst = !state.oldestFirst;
}
