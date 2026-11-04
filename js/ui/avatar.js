/**
 * Avatar markup for the archive owner and for other accounts.
 */

import { AVATAR_URL } from '../core/config.js';
import { escapeHtml } from '../core/dom.js';
import { state } from '../core/state.js';

export const avatar = c => `<div class="av ${c || ''}"><span>${escapeHtml(state.ownerHandle[0] || '?').toUpperCase()}</span><img src="${AVATAR_URL}" alt="" data-fallback="remove"></div>`;

export const remoteAvatar = h => `<div class="av df"><svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="16" r="7" fill="#fff"/><path d="M6 40c0-9 6-14 14-14s14 5 14 14z" fill="#fff"/></svg>${h ? `<img alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" src="https://unavatar.io/x/${encodeURIComponent(String(h).replace(/^@/, ''))}" data-fallback="remove">` : ''}</div>`;
