/**
 * Sticky page header used by every page.
 */

import { encodeUri } from '../core/dom.js';
import { ICONS, icon } from '../core/icons.js';
import { state } from '../core/state.js';
import { avatar } from './avatar.js';

/**
 * Sticky header. `back` shows a back arrow, `pf` marks the profile header.
 */
export const pageHeader = (t, s = '', b, pf) => `<div class="hd0${pf ? ' pfh' : ''}">${b ? `<span class="bk" onclick="history.back()">${icon(ICONS.bk, 20)}</span>` : `<span class="mav" data-dr="1" role="button" aria-label="Open menu">${avatar('s')}</span>`}${pf ? `<span class="bk" role="button" aria-label="Back to Home" data-go="/">${icon(ICONS.bk, 20)}</span>` : ''}<div><b>${t}</b><small>${s}</small></div>${pf ? `<a class="hsr" href="#/search/${encodeUri('from:' + state.ownerHandle + ' ')}" aria-label="Search this account">${icon(ICONS.srch, 20)}</a>` : ''}</div>`;
