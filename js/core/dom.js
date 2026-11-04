/**
 * Tiny DOM and URL helpers shared by every module.
 */

export const $ = s => document.querySelector(s);

export const main = $('#main');

export const escapeHtml = s => s.replace(/[&<>"]/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'
}[c]));

export const encodeUri = encodeURIComponent;

export const navigate = p => {
    location.hash = '#' + p;
};

let toastTimer;

export function showToast(m) {
    let t = $('#toast');
    if (!t) {
        t = document.createElement('div');
        t.id = 'toast';
        t.setAttribute('role', 'status');
        document.body.append(t);
    }
    t.textContent = m;
    t.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('on'), 2600);
}

/* ===== tap header / active tab: scroll to top, then refresh ===== */
export const scrollToTop = () => scrollTo({ top: 0, behavior: 'smooth' });
