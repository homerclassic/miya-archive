/**
 * Sticky page header used by every page.
 */

import { encodeUri } from '../core/dom.js';
import { ICON_BACK_PATH, ICON_SEARCH_PATH, filledIcon } from '../core/icons.js';
import { state } from '../core/state.js';
import { avatar } from './avatar.js';

/**
 * Sticky header. `back` shows a back arrow, `pf` marks the profile header.
 */
export const pageHeader = (t, s = '', b, pf) => `<div class="hd0${pf ? ' pfh' : ''}">${b ? `<span class="bk" onclick="history.back()">${filledIcon(ICON_BACK_PATH, 20)}</span>` : `<span class="mav" data-dr="1" role="button" aria-label="Open menu">${avatar('s')}</span>`}${pf ? `<span class="bk" role="button" aria-label="Back to Home" data-go="/">${filledIcon(ICON_BACK_PATH, 20)}</span>` : ''}<div><b>${t}</b><small>${s}</small></div>${pf ? `<a class="hsr" href="#/search/${encodeUri('from:' + state.ownerHandle + ' ')}" aria-label="Search this account">${filledIcon(ICON_SEARCH_PATH, 18)}</a>` : ''}</div>`;
