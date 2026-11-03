/* Copyright 2019 Tosho Toshev

   Licensed under the Apache License, Version 2.0 (the 'License');
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an 'AS IS' BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/
/* eslint-disable no-undef */

/**
 * Provides convenient methods for communicating with the CloudFlare API
 * @see https://api.cloudflare.com
 */
export default class CloudFlareApi {
    constructor(email, key, token) {
        this.email = email;
        this.key = key;
        this.token = token;
        this.cloudFlareApiUrl = 'https://api.cloudflare.com/client/v4/';
    }

    /**
     * Builds the authentication headers. An API token takes precedence over the
     * legacy e-mail and global key pair.
     */
    buildHeaders() {
        if (this.token) {
            return {
                'Content-Type': 'application/json',
                // A space or a line break pasted with the token makes CloudFlare refuse it.
                Authorization: `Bearer ${String(this.token).trim()}`,
            };
        }

        return {
            'Content-Type': 'application/json',
            'x-auth-Email': this.email,
            'x-auth-key': this.key,
        };
    }

    /**
     * Sends a request to the CloudFlare API and turns every failure into an Error
     * whose message says what went wrong: network problem, HTTP status, the error
     * CloudFlare returned and, for the usual causes, what to do about it.
     * @param {String} url the API url
     * @param {Object} options the fetch options
     * @param {String} action what the request does, used to word the error
     */
    async call(url, options, action) {
        let result;
        try {
            result = await fetch(url, options);
        } catch (error) {
            throw new Error(`${action} failed: api.cloudflare.com is unreachable (${error.message}). Check the network connection, the VPN or an ad blocker, and that the browser granted this extension access to websites (the Grant access button of the popup).`);
        }

        let data = null;
        try {
            data = await result.json();
        } catch (error) {
            // The body is not JSON, the status code is all there is to report.
        }

        if (!result.ok || !data || data.success === false) {
            const details = data && Array.isArray(data.errors)
                ? data.errors.map(error => `${error.code} ${error.message}`).join('; ')
                : '';
            let hint = '';
            const unknownToken = data && Array.isArray(data.errors)
                && data.errors.some(error => error.code === 9109 || error.code === 6003 || error.code === 6111);
            if (unknownToken) {
                hint = ' CloudFlare does not recognise this API token: it was mistyped, revoked or has expired. Create a new one in the CloudFlare dashboard (My Profile > API Tokens) and paste it again in the extension options.';
            } else if (result.status === 401 || result.status === 403) {
                hint = ' The API token is invalid, expired or lacks a permission: it needs Zone > Zone > Read and Zone > Cache Purge > Purge, on the zones you want to purge (or on all zones).';
            } else if (result.status === 429) {
                hint = ' CloudFlare rate limit reached, wait a moment before purging again.';
            }

            throw new Error(`${action} failed (HTTP ${result.status}${details ? `: ${details}` : ''}).${hint}`);
        }

        return data;
    }

    /**
     * Gets the CloudFlare zoneId for the current domain
     * @see https://api.cloudflare.com/#zone-list-zones
     * @param {String} domain a domain name.
     */
    async getZoneId(domain) {
        const url = `${this.cloudFlareApiUrl}zones?name=${encodeURIComponent(domain)}&status=active`;
        const data = await this.call(url, { method: 'GET', headers: this.buildHeaders() }, `Looking up the zone of ${domain}`);
        if (data.result && data.result.length > 0) {
            return data.result[0].id;
        }

        throw new Error(`No active CloudFlare zone named "${domain}" is visible to this API token.`);
    }

    /**
     * Gets every active CloudFlare zone the credentials have access to. The zone
     * list is paginated, so every page is walked until the last one is read.
     * @see https://api.cloudflare.com/#zone-list-zones
     */
    async getZones() {
        const headers = this.buildHeaders();
        const zones = [];
        let page = 1;
        let totalPages = 1;

        do {
            const url = `${this.cloudFlareApiUrl}zones?status=active&per_page=50&page=${page}&order=name&direction=asc`;
            // The page count is only known once the previous page came back.
            // eslint-disable-next-line no-await-in-loop
            const data = await this.call(url, { method: 'GET', headers }, 'Loading the zone list');
            zones.push(...data.result);
            totalPages = (data.result_info && data.result_info.total_pages) || 1;
            page += 1;
        } while (page <= totalPages);

        return zones;
    }

    /**
     * Purges the CloudFlare cache for a particular domain for a provided set of urls.
     * @see https://api.cloudflare.com/#zone-purge-files-by-url
     * @param {Object} purgeSettings an array of urls to purge
     * @param {String} zoneId the zone ID of the domain
     */
    async purgeCache(purgeSettings, zoneId) {
        if (!purgeSettings) {
            throw new Error('No files for purging.');
        }

        const url = `${this.cloudFlareApiUrl}zones/${zoneId}/purge_cache`;
        const data = await this.call(url, {
            method: 'DELETE',
            headers: this.buildHeaders(),
            body: JSON.stringify(purgeSettings),
        }, 'The purge request');

        return data.result && data.result.id ? data.result.id : 'accepted';
    }

    /**
     * Gets the development mode setting for the provided zone
     * @see https://api.cloudflare.com/#zone-settings-get-development-mode-setting
     * @param {String} zoneId the zone ID
     */
    async getZoneDevelopmentMode(zoneId) {
        const url = `${this.cloudFlareApiUrl}zones/${zoneId}/settings/development_mode`;
        const headers = this.buildHeaders();
        const result = await fetch(url, {
            method: 'GET',
            headers,
        });

        if (result && result.ok) {
            const data = await result.json();
            return data.result.value === 'on';
        }

        throw new Error('Unable to get the development mode setting.');
    }

    /**
     * Sets the development mode setting for the provided zone
     * @see https://api.cloudflare.com/#zone-settings-change-development-mode-setting
     * @param {String} zoneId
     * @param {Boolean} developmentModeState
     */
    async setZoneDevelopmentMode(zoneId, developmentModeState) {
        const url = `${this.cloudFlareApiUrl}zones/${zoneId}/settings/development_mode`;
        const headers = this.buildHeaders();
        const val = developmentModeState ? 'on' : 'off';
        const result = await fetch(url, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
                value: val,
            }),
        });

        if (result && result.ok) {
            const data = await result.json();
            return data.result.value === 'on';
        }

        throw new Error('Unable to set the development mode setting.');
    }
}
