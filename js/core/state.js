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
  /** search highlight regex for the current query */
  highlightRegex: null,
  /** current search string */
  searchQuery: '',
  /** months covered by the archive (for the date filter) */
  months: [],
  /** cached word counts for quick-search */
  keywordCounts: null,
  /** open image viewer (null = closed) */
  lightbox: null,
  /** tweet ids liked in this browser */
  likedIds: new Set(),
  /** tweet ids bookmarked in this browser */
  bookmarkedIds: [],
  /** timeline sort direction (1 = oldest first) */
  oldestFirst: 1,
  /** query being edited in the advanced-search dialog (null = closed) */
  advancedQuery: null,
  /** cached year / month / day availability */
  periodsCache: null,
  /** recent searches */
  recentSearches: [],
  /** shuffled "For you" feed (stable while navigating) */
  forYouFeed: null,
  /** history key -> scroll position */
  scrollMemory: new Map(),
  /** monotonic key for history entries */
  historyKeyCounter: Date.now(),
  /** key of the history entry being shown */
  currentHistoryKey: null,
  /** scroll position to restore after the next render */
  pendingRestore: null,
  /** how many rows the current lazy list has rendered */
  renderedCount: 0,
};
