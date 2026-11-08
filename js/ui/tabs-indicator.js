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
 */
export function moveTabsIndicator() {
    document.querySelectorAll('.tabs2').forEach(bar => {
        const ind = bar.querySelector('.tabs2-ind');
        const active = bar.querySelector('a.on');
        if (!ind || !active)
            return;
        const cx = active.offsetLeft + active.offsetWidth / 2;
        ind.style.transform = `translateX(${cx - 28}px)`;
        ind.classList.add('on');
    });
}
