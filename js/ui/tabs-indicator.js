/**
 * Sliding blue indicator for the in-page tab bars (.tabs2): home (For you / Threads /
 * Most retweeted / Most liked), profile (Tweets / Tweets & replies / Media) and history
 * (Bookmarks / Likes). X slides one bar between tabs instead of redrawing it under the
 * new tab, so the bar is a real element (.tabs2-ind) positioned here — the old static
 * ::after on the active tab could only appear and disappear, never glide.
 *
 * The bar keeps its 56px width and centers under the active tab. Positioning reads
 * the active tab's box (offsetLeft/offsetWidth, relative to the .tabs2 offset parent),
 * so it stays correct when the tabs resize. Call it after any render that rebuilds a
 * .tabs2 (route change, profile oldest-first toggle) and on window resize.
 *
 * A tab switch re-renders the bar, so the indicator element is fresh and a plain set
 * would teleport it to the new tab. moveTabsIndicator instead glides it from where it
 * was (FLIP: park the fresh element at the old spot with no transition, force a reflow,
 * then transition to the new spot).
 */

// Last indicator spot, keyed by which tab bar it belonged to (its tab labels). A switch
// inside one page glides from the stored spot; a different page just appears (no glide).
let lastInd = { key: '', x: null };

export function moveTabsIndicator() {
    document.querySelectorAll('.tabs2').forEach(bar => {
        const ind = bar.querySelector('.tabs2-ind');
        const active = bar.querySelector('a.on');
        if (!ind || !active)
            return;
        const cx = active.offsetLeft + active.offsetWidth / 2;
        const x = cx - 28;
        const key = [...bar.querySelectorAll('a')].map(a => a.textContent).join('|');
        if (lastInd.key === key && lastInd.x !== null && lastInd.x !== x) {
            ind.style.transition = 'none';
            ind.style.transform = `translateX(${lastInd.x}px)`;
            void ind.offsetWidth;
            ind.style.transition = '';
            ind.style.transform = `translateX(${x}px)`;
        } else {
            ind.style.transform = `translateX(${x}px)`;
        }
        ind.classList.add('on');
        lastInd = { key, x };
    });
}
