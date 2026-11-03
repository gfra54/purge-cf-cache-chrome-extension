/**
 * What the extension knows about the cf-cache-status response header: the badge
 * of each value and a plain sentence explaining it. This module has no side
 * effect, so both the background script and the popup can import it.
 * @see https://developers.cloudflare.com/cache/concepts/cache-responses/
 */

const COLORS = {
    green: '#2e7d32',
    red: '#c62828',
    orange: '#e65100',
    grey: '#546e7a',
};

const STATUSES = {
    HIT: { color: COLORS.green, meaning: 'Served from the CloudFlare cache.' },
    MISS: { color: COLORS.red, meaning: 'Not in the CloudFlare cache, fetched from the origin server.' },
    EXPIRED: { color: COLORS.orange, meaning: 'The cached copy had expired, fetched again from the origin server.' },
    STALE: { color: COLORS.orange, meaning: 'Expired copy served because the origin server could not be reached.' },
    REVALIDATED: { color: COLORS.orange, meaning: 'Expired copy checked with the origin server, which confirmed it is still valid.' },
    UPDATING: { color: COLORS.orange, meaning: 'Expired copy served while a fresh one is being fetched.' },
    DYNAMIC: { color: COLORS.grey, meaning: 'Not eligible for caching (dynamic content), always fetched from the origin server.' },
    BYPASS: { color: COLORS.grey, meaning: 'Caching was bypassed, fetched from the origin server.' },
};

/** The key under which the status of a tab is kept in the session storage. */
export const storageKey = tabId => `cfCacheStatus:${tabId}`;

/**
 * Describes a cf-cache-status value. A value this extension does not know is
 * still shown, in grey.
 * @param {String} status the header value, e.g. HIT
 * @returns {{status: String, text: String, color: String, meaning: String}|null}
 */
export function describeStatus(status) {
    const value = String(status || '').trim().toUpperCase();
    if (!value) {
        return null;
    }

    const known = STATUSES[value];
    return {
        status: value,
        // A badge only has room for three letters.
        text: value.slice(0, 3),
        color: known ? known.color : COLORS.grey,
        meaning: known ? known.meaning : 'Cache status not documented by CloudFlare.',
    };
}
