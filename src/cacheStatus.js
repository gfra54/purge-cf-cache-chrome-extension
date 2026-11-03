/* eslint-disable no-undef */

/**
 * Shows the CloudFlare cache status of the page of each tab (the value of the
 * cf-cache-status response header) as a badge on top of the extension icon.
 *
 * The status is read from the response of the main document as the browser
 * receives it, so it costs no extra request. It is kept in the session storage,
 * because the background script can be stopped and restarted between two pages.
 */

import { describeStatus, storageKey } from './cacheStatusInfo.js';

/**
 * Paints the badge of a tab from the status kept for it, or clears it.
 * @param {Number} tabId the tab
 */
async function applyBadge(tabId) {
    const key = storageKey(tabId);
    const stored = await chrome.storage.session.get(key);
    const info = stored[key];
    const status = info && info.status;
    const badge = describeStatus(status);
    try {
        await chrome.action.setBadgeText({ tabId, text: badge ? badge.text : '' });
        if (badge) {
            await chrome.action.setBadgeBackgroundColor({ tabId, color: badge.color });
            if (chrome.action.setBadgeTextColor) {
                await chrome.action.setBadgeTextColor({ tabId, color: '#ffffff' });
            }
        }

        await chrome.action.setTitle({
            tabId,
            title: status ? `Advanced Purge Plugin - cache status: ${status}` : 'Advanced Purge Plugin',
        });
    } catch (error) {
        // The tab was closed in the meantime, there is nothing left to paint.
    }
}

/**
 * Keeps the cf-cache-status of a tab. A page served without that header, which
 * means a site that is not behind CloudFlare, clears the status.
 */
async function onHeadersReceived(details) {
    if (details.tabId < 0) {
        return;
    }

    const headers = details.responseHeaders || [];
    const read = name => {
        const header = headers.find(item => item.name.toLowerCase() === name);
        return header && header.value ? header.value.trim() : '';
    };
    const status = read('cf-cache-status');
    const key = storageKey(details.tabId);
    if (status) {
        await chrome.storage.session.set({
            [key]: {
                status: status.toUpperCase(),
                age: read('age'),
                ray: read('cf-ray'),
                url: details.url,
            },
        });
    } else {
        await chrome.storage.session.remove(key);
    }

    await applyBadge(details.tabId);
}

chrome.webRequest.onHeadersReceived.addListener(
    onHeadersReceived,
    { urls: ['http://*/*', 'https://*/*'], types: ['main_frame'] },
    ['responseHeaders'],
);

// The browser resets the badge of a tab when it navigates, which can happen after
// the headers were received, so the badge is painted again once the page commits.
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status || changeInfo.url) {
        applyBadge(tabId);
    }
});

chrome.tabs.onRemoved.addListener((tabId) => {
    chrome.storage.session.remove(storageKey(tabId));
});
