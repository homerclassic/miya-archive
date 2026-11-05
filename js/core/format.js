/**
 * Number, date and text formatting helpers.
 * All dates render in UTC so every viewer sees the same date, matching the UTC search filter.
 */

export const formatDateTime = ms => new Date(ms).toLocaleString([], {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'UTC'
});

export const normalizeForMatch = s => s.toLowerCase().replace(/https?:\/\/\S+/g, ' ').replace(/[’‘]/g, "'").replace(/…|\.{3}/g, ' ').replace(/\s+/g, ' ').trim();

export const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const formatDate = ms => new Date(ms).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

export const formatCount = n => n >= 1e4 ? (n / 1e3).toFixed(n >= 1e5 ? 0 : 1).replace('.0', '') + 'K' : n.toLocaleString();

export const VIDEO_URL_RX = /\.(?:mp4|mov|m4v|webm)(?:[?#]|$)/i;
