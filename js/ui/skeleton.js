/**
 * Skeleton placeholders: grey shimmering shapes that stand in for content that is still loading.
 * The same markup is inlined in index.html so something useful is on screen before any JavaScript runs.
 */

/** One skeleton tweet row (avatar + three text lines). */
const skeletonTweet = () =>
  '<div class="sk-tweet" aria-hidden="true">' +
  '<div class="sk sk-av"></div>' +
  '<div class="sk-body">' +
  '<div class="sk sk-line" style="width:38%"></div>' +
  '<div class="sk sk-line" style="width:96%"></div>' +
  '<div class="sk sk-line" style="width:82%"></div>' +
  '<div class="sk sk-line" style="width:54%"></div>' +
  '</div></div>';

/** `count` skeleton tweet rows, announced to assistive tech as a single busy region. */
export const skeletonTweets = (count = 3) =>
  `<div class="sk-list" role="status" aria-busy="true" aria-label="Loading">${skeletonTweet().repeat(count)}</div>`;
