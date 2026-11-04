/**
 * Who the archive belongs to: display name and whether the custom profile card applies.
 */

import { DISPLAY_NAME, FEATURED_HANDLE } from './config.js';
import { state } from './state.js';

export const isFeaturedProfile = () => state.ownerHandle.toLowerCase() == FEATURED_HANDLE;

export const displayName = () => isFeaturedProfile() ? DISPLAY_NAME : state.ownerHandle;
