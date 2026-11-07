/**
 * Global delegated click handling (likes, bookmarks, navigation, header tap).
 */

import { encodeUri, navigate, scrollToTop } from './core/dom.js';
import { state } from './core/state.js';
import { addRecentSearch } from './core/storage.js';
import { handleRoute, navKey } from './router.js';
import { isSearchRoute } from './search/search-state.js';
import { openDrawer } from './ui/drawer.js';
import { setBookmark, setLike } from './ui/like-bookmark.js';
import { openLightbox } from './ui/lightbox.js';
import { draftPostOnX, openShareMenu } from './ui/post-actions.js';
import { triggerPullToRefresh } from './ui/pull-to-refresh.js';

/**
 * Tapping the header or the active nav item scrolls to top, then refreshes.
 */
function handleHeaderTap(e) {
    const hd = e.target.closest('.hd0');
    if (hd && !e.target.closest('.bk,.mav,a,button,input,[data-q],[data-go]')) {
        scrollToTop();
        return true;
    }
    const na = e.target.closest('#nav>a.on[data-n]');
    if (na) {
        const sec = state.route.section;
        const cur = sec == 't' || sec == 'tweet' || sec == 'at' ? null : navKey(sec);
        if (na.dataset.n == '' && sec == 'explore') {
            e.preventDefault();
            location.hash = '#/';
            return true;
        }
        if (na.dataset.n == cur && cur != 'at') {
            e.preventDefault();
            const mob = matchMedia('(max-width:700px)').matches;
            if (na.dataset.n != '') {
                if (scrollY > 8 || mob)
                    scrollToTop();
                else
                    handleRoute(true);
            }
            else if (mob && triggerPullToRefresh)
                triggerPullToRefresh();
            else
                handleRoute(true);
            return true;
        }
    }
    return false;
}

/**
 * Registers this module's global event listeners. Called once from main.js.
 */
export function initEvents() {
    document.addEventListener('click', e => {
        if (e.target.closest('[data-dr]')) {
            openDrawer();
            return;
        }
        if (handleHeaderTap(e))
            return;
        {
            const xe = e.target.closest('[data-ext]');
            if (xe && !e.target.closest('a')) {
                open(xe.dataset.ext, '_blank', 'noopener');
                return;
            }
        }
        const mi = e.target.closest('.mi');
        if (mi) {
            e.stopPropagation();
            openLightbox(mi);
            return;
        }
        const rb = e.target.closest('.a.g[data-rt]');
        if (rb) {
            e.stopPropagation();
            draftPostOnX(rb.dataset.rt, rb);
            return;
        }
        const sh = e.target.closest('.a.s[data-sh]');
        if (sh) {
            e.stopPropagation();
            openShareMenu(sh);
            return;
        }
        const ab = e.target.closest('.a.p,.a.k');
        if (ab) {
            const tw = ab.closest('.tw');
            const id = tw && tw.dataset.id;
            if (id) {
                e.stopPropagation();
                if (ab.classList.contains('p'))
                    setLike(id, !state.likedIds.has(id));
                else
                    setBookmark(id, !state.bookmarkedIds.includes(id));
                return;
            }
        }
        const q = e.target.closest('[data-q]');
        const g = e.target.closest('[data-go]');
        if (q) {
            e.stopPropagation();
            return navigate('/search/' + encodeUri(q.dataset.q));
        }
        if (g)
            return navigate(g.dataset.go);
        if (e.target.closest('a[href],button,input,label,select,summary'))
            return;
        const t = e.target.closest('.tw');
        if (t && !t.closest('#lb') && !getSelection().toString()) {
            const id = t.dataset.id;
            if (isSearchRoute())
                addRecentSearch(state.searchQuery);
            if (location.hash == '#/t/' + id)
                return;
            navigate('/t/' + id);
        }
    });
}
