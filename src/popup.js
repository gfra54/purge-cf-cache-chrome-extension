/* Copyright 2019 Tosho Toshev

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License. */
/* eslint-disable no-undef */
/* eslint-disable no-console */

import Utility from './utility.js';
import PurgeInfo from './info.js';
import { describeStatus, storageKey } from './cacheStatusInfo.js';

class PopUp {
    constructor() {
        this.utility = new Utility();
        this.purgeInfo = new PurgeInfo();
        this.currentUrl = null;
        this.currentTabId = null;
        this.settings = null;
        this.settingsSet = false;
        this.defaultPromptText = 'Purge entire cache?';
        this.zones = [];
        this.selectedZone = null;
        this.protectedHostname = null;
        this.elements = {
            purgeButton: document.querySelector('#purgeButton'),
            purgeAllButton: document.querySelector('#purgeAllButton'),
            purgeDomainButton: document.querySelector('#purgeDomainButton'),
            purgeTagButton: document.querySelector('#purgeTagButton'),
            devModeWrapper: document.querySelector('.dev-mode-wrapper'),
            optionsButton: document.querySelector('#optionsButton'),
            prompText: document.querySelector('#prompt-text'),
            lightBox: document.querySelector('#lightbox'),
            devMode: document.querySelector('#dev-mode'),
            status: document.querySelector('#status'),
            statusDetail: document.querySelector('#status-detail'),
            cacheStatus: document.querySelector('#cache-status'),
            refresh: document.querySelector('#refresh'),
            refreshCheckbox: document.querySelector('.refresh-checkbox'),
            subStatus: document.querySelector('#sub-status'),
            promptElement: document.querySelector('#lightbox'),
            promptYes: document.querySelector('#promptYes'),
            promptNo: document.querySelector('#promptNo'),
            infoBtn: document.querySelector('#infoBtn'),
            selectProfiles: document.querySelector('#select-profiles'),
            profilesParent: document.querySelector('.profiles-parent'),
            selectZones: document.querySelector('#select-zones'),
            zonesParent: document.querySelector('.zones-parent'),
            zoneLinks: document.querySelector('.zone-links'),
            inputPrompt: document.querySelector('#input-lightbox'),
            inputPromptText: document.querySelector('#input-prompt-text'),
            inputPromptHint: document.querySelector('#input-prompt-hint'),
            inputPromptValue: document.querySelector('#input-prompt-value'),
            inputPromptYes: document.querySelector('#inputPromptYes'),
            inputPromptNo: document.querySelector('#inputPromptNo'),
            blacklistWarning: document.querySelector('#blacklist-warning'),
        };

        this.hideElement(this.elements.purgeButton);
        this.hideElement(this.elements.purgeAllButton);
        this.hideElement(this.elements.purgeDomainButton);
        this.hideElement(this.elements.purgeTagButton);
        this.hideElement(this.elements.devModeWrapper);
        this.hideElement(this.elements.refreshCheckbox);
        this.hideElement(this.elements.infoBtn);
        this.hideElement(this.elements.profilesParent);
        this.hideElement(this.elements.zonesParent);
        this.hideElement(this.elements.zoneLinks);
        this.hideElement(this.elements.blacklistWarning);
        this.showElement(this.elements.optionsButton);
        this.elements.prompText.innerText = this.defaultPromptText;
        this.elements.purgeAllButton.addEventListener('click', this.purgeAllClick.bind(this));
        this.elements.purgeButton.addEventListener('click', this.purgeButtonClick.bind(this));
        this.elements.purgeDomainButton.addEventListener('click', this.purgeDomainClick.bind(this));
        this.elements.purgeTagButton.addEventListener('click', this.purgeTagClick.bind(this));
        this.elements.optionsButton.addEventListener('click', this.optionsButtonClick.bind(this));
        this.elements.devMode.addEventListener('change', this.toggleDeveloperMode.bind(this));
        this.elements.selectProfiles.addEventListener('change', this.changeProfile.bind(this));
        this.elements.selectZones.addEventListener('change', this.changeZone.bind(this));
        this.elements.zoneLinks.addEventListener('click', this.zoneLinkClick.bind(this));
        this.loadSettings();
        this.showCacheStatus();
    }

    static build() {
        return new PopUp();
    }

    /**
     * Shows, at the top of the popup, the cf-cache-status of the page of the current
     * tab as the background script recorded it when the page was received, with what
     * the value means. Nothing is shown for a page that was not served by CloudFlare.
     */
    async showCacheStatus() {
        const box = this.elements.cacheStatus;
        try {
            const tab = await this.utility.getCurrentTab();
            if (!tab) {
                return;
            }

            const key = storageKey(tab.id);
            const stored = await chrome.storage.session.get(key);
            const info = stored[key];
            const described = info && describeStatus(info.status);
            if (!described) {
                box.textContent = '';
                return;
            }

            const title = document.createElement('div');
            title.className = 'cache-title';
            const value = document.createElement('span');
            value.className = 'cache-value';
            value.textContent = described.status;
            title.append('CF cache status: ', value);

            const meaning = document.createElement('div');
            meaning.textContent = described.meaning;

            const extra = [];
            if (info.age) {
                extra.push(`Age ${info.age}s`);
            }

            if (info.ray) {
                extra.push(`Ray ${info.ray}`);
            }

            box.style.setProperty('--cache-color', described.color);
            box.replaceChildren(title, meaning);
            if (extra.length > 0) {
                const details = document.createElement('div');
                details.className = 'cache-extra';
                details.textContent = extra.join(' - ');
                box.append(details);
            }
        } catch (error) {
            console.log(error);
        }
    }

    /**
     * Loads the extension settings from the browser storage.
     */
    async loadSettings() {
        if (!chrome.storage) {
            const settings = await browser.storage.sync.get({
                tag: 'options',
                key: null,
                email: null,
                token: null,
                refresh: null,
                hidePurgeAll: false,
                showDevMode: false,
                profiles: null,
                blacklist: null,
            });
            this.setup(settings);
            return;
        }

        chrome.storage.sync.get({
            tag: 'options',
            key: null,
            email: null,
            token: null,
            refresh: null,
            hidePurgeAll: false,
            showDevMode: false,
            profiles: null,
            blacklist: null,
        }, (items) => {
            this.setup(items);
        });
    }

    /**
     * Initializes the main extension page.
     * @param {*} settings The extension settings that are preserved in the browser storage.
     */
    async setup(settings) {
        this.settings = settings;
        this.settingsSet = true;
        if (!this.settings.email && !this.settings.token) {
            this.settingsSet = false;
        }

        if (!this.settings.refresh) {
            this.settings.refresh = 10;
        }

        if (this.settingsSet) {
            this.showElement(this.elements.refreshCheckbox);
            this.showElement(this.elements.purgeButton);
            this.showElement(this.elements.purgeDomainButton);
            this.showElement(this.elements.purgeTagButton);
            this.showElement(this.elements.infoBtn);
            this.hideElement(this.elements.optionsButton);

            if (!this.settings.hidePurgeAll) {
                this.showElement(this.elements.purgeAllButton);
            }

            if (this.settings.showDevMode) {
                this.showElement(this.elements.devModeWrapper);
                const domain = await this.getCurrentDomain();
                try {
                    const zoneId = await this.getZoneId(domain);
                    if (zoneId) {
                        const zoneDevelopmentMode = await this.getZoneDevelopmentMode(zoneId);
                        if (zoneDevelopmentMode) {
                            this.elements.devMode.checked = zoneDevelopmentMode;
                        }
                    }
                } catch (error) {
                    console.log(error.message);
                }
            }

            await this.updateBlacklistWarning();

            if (this.settings.profiles && Object.keys(this.settings.profiles).length > 0) {
                const selectProfilesElem = this.elements.selectProfiles;
                selectProfilesElem.options[selectProfilesElem.options.length] = new Option('Default Token', this.settings.token);
                for (const profile in this.settings.profiles) {
                    const profileName = profile;
                    const profileToken = this.settings.profiles[profile];
                    selectProfilesElem.options[selectProfilesElem.options.length] = new Option(profileName, profileToken);
                }

                this.showElement(this.elements.profilesParent);
            }

            await this.loadZones();
        }
    }

    /**
     * Fills the zone select with every zone the current API token can read and
     * preselects the zone that serves the current tab, when there is one.
     */
    async loadZones() {
        const select = this.elements.selectZones;
        this.selectedZone = null;
        this.zones = [];
        this.showElement(this.elements.zonesParent);
        this.hideElement(this.elements.zoneLinks);
        this.setZonePlaceholder('Loading zones...');

        try {
            this.zones = await this.getZones();
        } catch (error) {
            this.setZonePlaceholder('Unable to load the zones');
            console.log(error.message);
            return;
        }

        if (this.zones.length === 0) {
            this.setZonePlaceholder('No zone on this token');
            return;
        }

        this.setZonePlaceholder('Select a zone');
        this.zones.forEach((zone) => {
            select.options[select.options.length] = new Option(zone.name, zone.id);
        });

        const currentZone = this.matchZone(await this.getCurrentHostname());
        if (currentZone) {
            select.value = currentZone.id;
            this.selectZone(currentZone);
        }
    }

    /**
     * Resets the zone select to a single, valueless entry.
     * @param {*} message the text of the entry
     */
    setZonePlaceholder(message) {
        const select = this.elements.selectZones;
        select.replaceChildren();
        select.options[0] = new Option(message, '');
    }

    /**
     * Finds the zone a hostname belongs to. The longest match wins, so a zone
     * for a sub-domain is preferred over the zone of its parent domain.
     * @param {*} hostname a hostname, sub-domain included
     */
    matchZone(hostname) {
        if (!hostname) {
            return null;
        }

        const matches = this.zones
            .filter(zone => hostname === zone.name || hostname.endsWith(`.${zone.name}`))
            .sort((a, b) => b.name.length - a.name.length);

        return matches.length > 0 ? matches[0] : null;
    }

    /**
     * A change handler for the zone select. Selecting a zone reveals the
     * shortcuts to its CloudFlare dashboard pages.
     * @param {*} e event handler object
     */
    changeZone(e) {
        const zone = this.zones.find(item => item.id === e.target.value);
        this.selectZone(zone);
    }

    /**
     * Keeps the selected zone and shows or hides its dashboard shortcuts.
     * @param {*} zone a CloudFlare zone, or a falsy value to clear the selection
     */
    selectZone(zone) {
        this.selectedZone = zone || null;
        if (this.selectedZone) {
            this.showElement(this.elements.zoneLinks);
        } else {
            this.hideElement(this.elements.zoneLinks);
        }
    }

    /**
     * A click handler for the dashboard shortcuts. Every shortcut carries the
     * dashboard page it opens in a data attribute.
     * @param {*} e event handler object
     */
    zoneLinkClick(e) {
        const button = e.target.closest('button[data-zone-page]');
        if (!button || !this.selectedZone) {
            return;
        }

        e.preventDefault();
        chrome.tabs.create({ url: this.zoneDashboardUrl(this.selectedZone, button.dataset.zonePage) });
    }

    /**
     * Builds a deep link to a page of the CloudFlare dashboard. The dashboard
     * resolves the :account placeholder itself when the zone carries no account,
     * which happens when the token is not allowed to read it.
     * @see https://blog.cloudflare.com/deeplinks-and-scrollanchor
     * @param {*} zone a CloudFlare zone
     * @param {*} page a dashboard page path, e.g. 'dns/records'
     */
    zoneDashboardUrl(zone, page) {
        const account = zone.account && zone.account.id
            ? encodeURIComponent(zone.account.id)
            : ':account';

        return `https://dash.cloudflare.com/?to=/${account}/${encodeURIComponent(zone.name)}/${page}`;
    }

    /**
     * Warns that the domain of the current tab sits on the blacklist. The warning
     * is informative only: the blacklist refuses the purges that wipe the cache of
     * the whole domain, while purging a single URL or a cache tag stays available.
     */
    async updateBlacklistWarning() {
        const hostname = await this.getCurrentHostname();
        const blocked = this.utility.blockedByBlacklist([hostname], this.settings.blacklist);
        this.protectedHostname = blocked.length > 0 ? hostname : null;
        if (!this.protectedHostname) {
            this.hideElement(this.elements.blacklistWarning);
            return;
        }

        const title = document.createElement('strong');
        title.textContent = `${this.protectedHostname} is blacklisted`;
        const detail = document.createElement('span');
        detail.textContent = 'Purging the cache of the whole domain is refused. Purging this page or a cache tag still works.';
        this.elements.blacklistWarning.replaceChildren(title, detail);
        this.showElement(this.elements.blacklistWarning);
    }

    /**
     * A click handler for the purge button.
     * @param {*} e event handler object
     */
    async purgeButtonClick(e) {
        e.preventDefault();
        await this.runPurge('the current page', async () => {
            const tab = await this.utility.getCurrentTab();
            if (!tab) {
                throw new Error('No active tab was found, so there is no page to purge.');
            }

            if (!tab.url) {
                throw new Error('The browser did not give the extension the address of this tab. Close the popup, click on the page, then open the popup again.');
            }

            if (!/^https?:\/\//i.test(tab.url)) {
                throw new Error(`${tab.url} is not a website. Only http and https pages can be purged.`);
            }

            // A single URL is never refused: the blacklist only guards the purges
            // that wipe the cache of a whole domain.
            const zoneId = await this.getZoneId(this.utility.getDomain(tab.url));
            return { zoneId, rayId: await this.purgeCache({ files: [tab.url] }, zoneId), what: tab.url };
        });
    }

    /**
     * A click handler for the purge all button.
     * @param {*} e event handler object
     */
    async purgeAllClick(e) {
        e.preventDefault();
        let currentDomain = '';
        try {
            currentDomain = await this.getCurrentDomain();
        } catch (error) {
            // An address that is not a website has no domain, handled right below.
        }

        if (!currentDomain) {
            this.report('error', 'PURGE FAILED', 'The current tab is not a website, so there is no domain to purge. Open the site first.');
            return;
        }

        this.showPrompt(currentDomain, async (domain) => {
            if (!this.allowFullPurge([domain, await this.getCurrentHostname()])) {
                return;
            }

            await this.runPurge(`the whole cache of ${domain}`, async () => {
                const zoneId = await this.getZoneId(domain);
                return { zoneId, rayId: await this.purgeCache({ purge_everything: true }, zoneId), what: domain };
            });
        });
    }

    /**
     * A click handler for the purge domain button. Asks the user for one or more
     * hostnames and purges every cached asset served from them.
     * @see https://developers.cloudflare.com/cache/how-to/purge-cache/purge-by-hostname/
     * @param {*} e event handler object
     */
    async purgeDomainClick(e) {
        e.preventDefault();
        const currentHostname = await this.getCurrentHostname();
        this.showInputPrompt({
            message: 'Hostname(s) to purge:',
            hint: 'Up to 100 hostnames, separated by commas. Blacklisted domains are refused.',
            placeholder: 'example.com, www.example.com',
            value: currentHostname,
        }, async (value) => {
            const hosts = this.parseHosts(value);
            if (hosts.length === 0) {
                this.report('error', 'INVALID HOSTNAME', 'Enter one or more hostnames, for example example.com.');
                return;
            }

            if (hosts.length > 100) {
                this.report('error', 'MAX 100 HOSTNAMES', `${hosts.length} hostnames were entered, CloudFlare accepts 100 at most.`);
                return;
            }

            if (!this.allowFullPurge(hosts)) {
                return;
            }

            await this.runPurge(`every asset of ${hosts.join(', ')}`, async () => {
                const zoneId = await this.getZoneId(hosts[0]);
                return { zoneId, rayId: await this.purgeCache({ hosts }, zoneId), what: hosts.join(', ') };
            });
        });
    }

    /**
     * A click handler for the purge tag button. Asks the user for one or more cache
     * tags and purges every asset served with a matching Cache-Tag response header.
     * The tags are purged in the zone of the current tab, since tags are zone scoped.
     * @see https://developers.cloudflare.com/cache/how-to/purge-cache/purge-by-tags/
     * @param {*} e event handler object
     */
    async purgeTagClick(e) {
        e.preventDefault();
        const domain = await this.getCurrentDomain();
        if (!domain) {
            // Cache tags are scoped to a zone, and the zone comes from the current tab.
            this.report('error', 'OPEN A SITE FIRST', 'Cache tags belong to a zone, and the zone is taken from the current tab. Open a website first.');
            return;
        }

        this.showInputPrompt({
            message: `Cache tag(s) to purge on ${domain}:`,
            hint: this.protectedHostname
                ? 'Up to 30 tags, separated by commas. Tags are case sensitive. Allowed even though this domain is blacklisted.'
                : 'Up to 30 tags, separated by commas. Tags are case sensitive.',
            placeholder: 'product-listing, homepage',
            value: '',
        }, async (value) => {
            const tags = this.parseTags(value);
            if (tags.length === 0) {
                this.report('error', 'INVALID TAG', 'Enter one or more cache tags, separated by commas. Tags are printable ASCII without spaces.');
                return;
            }

            if (tags.length > 30) {
                this.report('error', 'MAX 30 TAGS', `${tags.length} tags were entered, CloudFlare accepts 30 at most.`);
                return;
            }

            await this.runPurge(`the cache tags ${tags.join(', ')}`, async () => {
                const zoneId = await this.getZoneId(domain);
                return { zoneId, rayId: await this.purgeCache({ tags }, zoneId), what: tags.join(', ') };
            });
        });
    }

    /**
     * Splits a user provided string into a list of unique cache tags. CloudFlare
     * tags are printable ASCII without spaces, so anything else is dropped.
     * @param {*} value a comma separated list of cache tags
     */
    parseTags(value) {
        if (!value) {
            return [];
        }

        const tags = value.split(/[\s,]+/)
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0 && tag.length <= 1024 && /^[\x20-\x7E]+$/.test(tag));

        return [...new Set(tags)];
    }

    /**
     * Refuses a purge that would wipe the cache of a whole domain listed on the
     * blacklist configured in the extension options, before anything is sent to
     * CloudFlare. Purging a single URL or a cache tag stays allowed on such a
     * domain, so this only guards the purge everything and purge domain buttons.
     * @param {*} hostnames the hostnames whose entire cache is about to be purged
     */
    allowFullPurge(hostnames) {
        const blocked = this.utility.blockedByBlacklist(hostnames, this.settings.blacklist);
        if (blocked.length === 0) {
            return true;
        }

        this.report(
            'error',
            'BLOCKED BY BLACKLIST',
            `Protected domain: ${[...new Set(blocked)].join(', ')}. Nothing was sent to CloudFlare. Purge a single URL or a cache tag instead.`,
        );
        return false;
    }

    /**
     * Splits a user provided string into a list of unique hostnames.
     * @param {*} value a comma, semicolon or whitespace separated list of hostnames or URLs
     */
    parseHosts(value) {
        if (!value) {
            return [];
        }

        const hosts = value.split(/[\s,;]+/)
            .map(part => this.toHostname(part))
            .filter(host => host.length > 0);

        return [...new Set(hosts)];
    }

    /**
     * Normalizes a user provided value to a hostname. Accepts both a bare
     * hostname and a full URL. Returns an empty string when the value is invalid.
     * @param {*} value a hostname or an URL
     */
    toHostname(value) {
        const trimmed = value.trim().toLowerCase();
        if (!trimmed) {
            return '';
        }

        try {
            const url = trimmed.includes('://') ? trimmed : `https://${trimmed}`;
            const { hostname } = new URL(url);
            const isHostname = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;
            return isHostname.test(hostname) ? hostname : '';
        } catch (error) {
            return '';
        }
    }

    /**
     * A click handler that opens the extension options screen.
     * @param {*} e event handler object
     */
    optionsButtonClick(e) {
        e.preventDefault();
        chrome.tabs.create({ url: '/options.html' });
    }

    /**
     * Gets the domain of the currently opened tab.
     */
    async getCurrentDomain() {
        const tab = await this.utility.getCurrentTab();
        if (tab && tab.url) {
            const domain = await this.utility.getDomain(tab.url);
            return domain;
        }

        return '';
    }

    /**
     * Gets the full hostname of the currently opened tab, sub-domain included.
     */
    async getCurrentHostname() {
        const tab = await this.utility.getCurrentTab();
        if (tab && tab.url) {
            return this.toHostname(tab.url);
        }

        return '';
    }

    /**
     * Hides a DOM element
     * @param {*} element a DOM element
     */
    hideElement(element) {
        if (element) {
            element.classList.add('hide');
        }
    }

    /**
     * Shows a DOM element
     * @param {*} element a DOM element
     */
    showElement(element) {
        if (element) {
            element.classList.remove('hide');
        }
    }

    /**
     * A change handler for the API token profile select. Every profile sees its
     * own set of zones, so the zone list is rebuilt for the new token.
     * @param {*} e event handler object
     */
    async changeProfile(e) {
        const select = e.target;
        this.settings.token = select.value;
        await this.loadZones();
    }

    /**
     * Shows the outcome of an action in the status area. Every purge ends here,
     * whatever happened, so the popup never stays silent.
     * @param {*} kind 'info', 'success' or 'error'
     * @param {*} title the short headline
     * @param {*} detail the explanation shown under the headline
     */
    report(kind, title, detail) {
        clearTimeout(this.reportTimer);
        const { status, statusDetail } = this.elements;
        this.elements.purgeButton.className = '';
        status.classList.remove('error', 'success', 'info');
        statusDetail.classList.remove('error', 'success', 'info');
        status.classList.add(kind);
        statusDetail.classList.add(kind);
        status.textContent = title;
        statusDetail.textContent = detail || '';
        if (kind === 'success') {
            this.reportTimer = setTimeout(() => {
                status.textContent = '';
                statusDetail.textContent = '';
            }, 8000);
        }
    }

    /**
     * Runs a purge and always reports how it ended: a confirmation on success, the
     * reason on failure. Errors are kept on screen until the next action.
     * @param {*} label what is being purged, for the messages
     * @param {*} perform an async function returning { zoneId, rayId, what }
     */
    async runPurge(label, perform) {
        this.report('info', 'PURGING...', `Purging ${label}`);
        try {
            this.requireCredentials();
            const { rayId, what } = await perform();
            if (!rayId) {
                throw new Error('CloudFlare answered without a confirmation, so the purge cannot be confirmed.');
            }

            await this.onPurgeSuccess(what || label, rayId);
        } catch (error) {
            this.onPurgeFailure(error, label);
        }
    }

    /**
     * Refuses to start a purge when no API credentials are configured.
     */
    requireCredentials() {
        const { token, email, key } = this.settings || {};
        if (!token && !(email && key)) {
            throw new Error('No CloudFlare API token is configured. Open the extension options and enter one.');
        }
    }

    /**
     * Reports a failed purge with the reason of the failure.
     * @param {*} error the failure
     * @param {*} label what was being purged
     */
    onPurgeFailure(error, label) {
        console.log(error);
        const reason = error && error.message ? error.message : String(error || 'Unknown error');
        this.report('error', 'PURGE FAILED', `Nothing was purged for ${label}.\n${reason}`);
    }

    /**
     * A success event handler for the purge operation.
     * @param {*} what what was purged
     * @param {*} rayId the confirmation id returned by CloudFlare
     */
    async onPurgeSuccess(what, rayId) {
        this.report('success', 'SUCCESS', `Purged ${what}\nCloudFlare confirmation: ${rayId}`);
        if (this.elements.refresh.checked) {
            try {
                const result = await this.refreshCountdown(this.elements.subStatus, 'Refreshing in: ', parseInt(this.settings.refresh, 10));
                if (result) {
                    chrome.tabs.reload(this.currentTabId, { bypassCache: true });
                }
            } catch (error) {
                console.log(error);
            }
        }
    }

    /**
     * A countdown timer that counts to a certain timeout and refreshes the current page.
     * @param {*} element - the element that holds the counter.
     * @param {*} message - A message that displays next to the countdown.
     * @param {*} refreshTimeout - a timeout in seconds.
     */
    refreshCountdown(element, message, refreshTimeout) {
        const countDownElement = element;
        let countdown = refreshTimeout;
        return new Promise((resolve) => {
            const interval = setInterval(() => {
                if (countdown === 0) {
                    clearInterval(interval);
                    countDownElement.innerText = '';
                    resolve(true);
                } else {
                    countdown -= 1;
                    countDownElement.innerText = `${message} ${countdown}`;
                }
            }, 1000);
        });
    }

    /**
     * Shows a lightbox with a yes and no buttons
     * @param {*} domain a domain string
     * @param {*} yesAction an event handler for the yes button
     * @param {*} noAction an event handler for the no button
     * @param {*} message a prompt message
     */
    showPrompt(domain, yesAction, noAction, message) {
        if (message) {
            this.elements.prompText.innerText = message;
        } else {
            this.elements.prompText.innerText = this.defaultPromptText;
        }

        this.elements.promptElement.classList.add('active');
        const onYesAction = (e) => {
            e.preventDefault();
            this.elements.promptElement.classList.remove('active');
            if (typeof yesAction === 'function') {
                yesAction(domain);
            }
            this.elements.promptYes.removeEventListener('click', onYesAction);
        };

        const onNoAction = (e) => {
            e.preventDefault();
            if (typeof noAction === 'function') {
                noAction();
            }
            this.elements.promptElement.classList.remove('active');
            this.elements.promptNo.removeEventListener('click', onNoAction);
        };

        this.elements.promptYes.addEventListener('click', onYesAction);
        this.elements.promptNo.addEventListener('click', onNoAction);
    }

    /**
     * Shows a lightbox with a text input, a purge and a cancel button.
     * A native window.prompt cannot be used here because a modal dialog steals the
     * focus from the popup, which closes it and kills the script before it answers.
     * @param {*} options the message, hint, placeholder and initial value of the prompt
     * @param {*} okAction an event handler receiving the entered value
     */
    showInputPrompt(options, okAction) {
        const input = this.elements.inputPromptValue;
        this.elements.inputPromptText.innerText = options.message;
        this.elements.inputPromptHint.innerText = options.hint || '';
        input.placeholder = options.placeholder || '';
        input.value = options.value || '';
        this.elements.inputPrompt.classList.add('active');
        input.focus();
        input.select();

        // The controller detaches every listener below in a single call.
        const controller = new AbortController();
        const { signal } = controller;
        const close = () => {
            this.elements.inputPrompt.classList.remove('active');
            controller.abort();
        };

        const onOkAction = (e) => {
            e.preventDefault();
            const { value } = input;
            close();
            if (typeof okAction === 'function') {
                okAction(value);
            }
        };

        const onCancelAction = (e) => {
            e.preventDefault();
            close();
        };

        const onKeyDown = (e) => {
            if (e.key === 'Enter') {
                onOkAction(e);
            } else if (e.key === 'Escape') {
                onCancelAction(e);
            }
        };

        this.elements.inputPromptYes.addEventListener('click', onOkAction, { signal });
        this.elements.inputPromptNo.addEventListener('click', onCancelAction, { signal });
        input.addEventListener('keydown', onKeyDown, { signal });
    }

    /**
     * An event handler for toggling the developer mode setting in CloudFlare.
     * @param {*} developmentModeState a boolean value
     * true = developer mode enabled
     * fals = developer mode disabled
     */
    async toggleDeveloperMode() {
        const developmentModeState = this.elements.devMode.checked;
        const domain = await this.getCurrentDomain();
        try {
            if (domain) {
                const zoneId = await this.getZoneId(domain);
                this.showPrompt(domain, () => {
                    this.setZoneDevelopmentMode(zoneId, developmentModeState);
                }, async () => {
                    const zoneDevelopmentMode = await this.getZoneDevelopmentMode(zoneId);
                    this.elements.devMode.checked = zoneDevelopmentMode;
                }, 'Are you sure?');
            }
        } catch (error) {
            console.log(error);
        }
    }

    setZoneDevelopmentMode(zoneId, developmentModeState) {
        return new Promise((resolve, reject) => {
            try {
                chrome.runtime.sendMessage({
                    rSettings: this.settings,
                    type: 'setZoneDevelopmentMode',
                    rZoneId: zoneId,
                    rDevModeState: developmentModeState,
                }, () => resolve());
            } catch (error) {
                reject(new Error(error));
            }
        });
    }

    getZoneDevelopmentMode(zoneId) {
        return new Promise((resolve, reject) => {
            try {
                chrome.runtime.sendMessage({
                    rSettings: this.settings,
                    type: 'getZoneDevelopmentMode',
                    rZoneId: zoneId,
                }, response => {
                    if (response.error) {
                        return reject(response.error);
                    }

                    return resolve(response.result);
                });
            } catch (error) {
                reject(new Error(error));
            }
        });
    }

    getZones() {
        return new Promise((resolve, reject) => {
            try {
                chrome.runtime.sendMessage({
                    rSettings: this.settings,
                    type: 'getZones',
                }, response => {
                    if (response.error) {
                        return reject(new Error(response.error));
                    }

                    return resolve(response.result);
                });
            } catch (error) {
                reject(new Error(error));
            }
        });
    }

    /**
     * Sends a request to the background script and always settles: with the result,
     * or with an Error saying why nothing came back (background asleep or crashed,
     * no answer within 20 seconds, failure reported by the API).
     * @param {*} message the request, without the settings
     */
    sendToBackground(message) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error('The extension background did not answer within 20 seconds. Reload the extension and try again.'));
            }, 20000);

            try {
                chrome.runtime.sendMessage({ rSettings: this.settings, ...message }, (response) => {
                    clearTimeout(timer);
                    const lastError = chrome.runtime.lastError;
                    if (lastError) {
                        reject(new Error(`The extension background is unreachable: ${lastError.message}`));
                        return;
                    }

                    if (!response) {
                        reject(new Error('The extension background returned no answer. Reload the extension and try again.'));
                        return;
                    }

                    if (response.error) {
                        reject(new Error(typeof response.error === 'string' ? response.error : 'The CloudFlare request failed.'));
                        return;
                    }

                    resolve(response.result);
                });
            } catch (error) {
                clearTimeout(timer);
                reject(error instanceof Error ? error : new Error(String(error)));
            }
        });
    }

    async getZoneId(domain) {
        try {
            return await this.sendToBackground({ type: 'getZoneId', rDomain: domain });
        } catch (error) {
            // A sub-domain is retried with its parent domain, as the zone is usually the parent.
            if ((domain.match(/\./g) || []).length > 1) {
                return this.getZoneId(this.utility.fixDomain(domain));
            }

            throw error;
        }
    }

    purgeCache(purgeSettings, zoneId) {
        return this.sendToBackground({ type: 'purgeCache', rPurgeSettings: purgeSettings, rZoneId: zoneId });
    }
}

PopUp.build();
