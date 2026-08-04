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

class PopUp {
    constructor() {
        this.utility = new Utility();
        this.purgeInfo = new PurgeInfo();
        this.currentUrl = null;
        this.currentTabId = null;
        this.settings = null;
        this.settingsSet = false;
        this.defaultPromptText = 'Purge entire cache?';
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
            refresh: document.querySelector('#refresh'),
            refreshCheckbox: document.querySelector('.refresh-checkbox'),
            subStatus: document.querySelector('#sub-status'),
            promptElement: document.querySelector('#lightbox'),
            promptYes: document.querySelector('#promptYes'),
            promptNo: document.querySelector('#promptNo'),
            infoBtn: document.querySelector('#infoBtn'),
            selectProfiles: document.querySelector('#select-profiles'),
            profilesParent: document.querySelector('.profiles-parent'),
            inputPrompt: document.querySelector('#input-lightbox'),
            inputPromptText: document.querySelector('#input-prompt-text'),
            inputPromptHint: document.querySelector('#input-prompt-hint'),
            inputPromptValue: document.querySelector('#input-prompt-value'),
            inputPromptYes: document.querySelector('#inputPromptYes'),
            inputPromptNo: document.querySelector('#inputPromptNo'),
        };

        this.hideElement(this.elements.purgeButton);
        this.hideElement(this.elements.purgeAllButton);
        this.hideElement(this.elements.purgeDomainButton);
        this.hideElement(this.elements.purgeTagButton);
        this.hideElement(this.elements.devModeWrapper);
        this.hideElement(this.elements.refreshCheckbox);
        this.hideElement(this.elements.infoBtn);
        this.hideElement(this.elements.profilesParent);
        this.showElement(this.elements.optionsButton);
        this.elements.prompText.innerText = this.defaultPromptText;
        this.elements.purgeAllButton.addEventListener('click', this.purgeAllClick.bind(this));
        this.elements.purgeButton.addEventListener('click', this.purgeButtonClick.bind(this));
        this.elements.purgeDomainButton.addEventListener('click', this.purgeDomainClick.bind(this));
        this.elements.purgeTagButton.addEventListener('click', this.purgeTagClick.bind(this));
        this.elements.optionsButton.addEventListener('click', this.optionsButtonClick.bind(this));
        this.elements.devMode.addEventListener('change', this.toggleDeveloperMode.bind(this));
        this.elements.selectProfiles.addEventListener('change', this.changeProfile.bind(this));
        this.loadSettings();
    }

    static build() {
        return new PopUp();
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
        }
    }

    /**
     * A click handler for the purge button.
     * @param {*} e event handler object
     */
    async purgeButtonClick(e) {
        e.preventDefault();
        const tab = await this.utility.getCurrentTab();
        if (tab && tab.url) {
            const domain = await this.getCurrentDomain();
            if (!this.allowPurge([await this.getCurrentHostname()], 'host')) {
                return;
            }

            try {
                const zoneId = await this.getZoneId(domain);
                try {
                    const rayId = await this.purgeCache({ files: [tab.url] }, zoneId);
                    if (rayId) {
                        await this.onPurgeSuccess();
                    }
                } catch (purgeError) {
                    this.elements.purgeButton.className = '';
                    this.elements.status.classList.add('error');
                    this.utility.setStatusMessage(this.elements.status, 'PURGE FAILED', 5000, purgeError);
                }
            } catch (error) {
                this.elements.purgeButton.className = '';
                this.elements.status.classList.add('error');
                this.utility.setStatusMessage(this.elements.status, 'PURGE FAILED', 5000, error);
            }
        }
    }

    /**
     * A click handler for the purge all button.
     * @param {*} e event handler object
     */
    async purgeAllClick(e) {
        e.preventDefault();
        const currentDomain = await this.getCurrentDomain();
        if (currentDomain) {
            this.showPrompt(currentDomain, async (domain) => {
                if (!this.allowPurge([domain, await this.getCurrentHostname()], 'host')) {
                    return;
                }

                try {
                    const zoneId = await this.getZoneId(domain);
                    if (zoneId) {
                        try {
                            const rayId = this.purgeCache({ purge_everything: true }, zoneId);
                            if (rayId) {
                                await this.onPurgeSuccess();
                            }
                        } catch (error) {
                            this.elements.purgeButton.className = '';
                            this.elements.status.classList.add('error');
                            this.utility.setStatusMessage(this.elements.status, 'PURGE FAILED', 5000, error);
                        }
                    }
                } catch (zoneError) {
                    this.elements.purgeButton.className = '';
                    this.elements.status.classList.add('error');
                    this.utility.setStatusMessage(this.elements.status, 'PURGE FAILED', 5000, zoneError);
                }
            });
        }
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
            hint: 'Up to 100 hostnames, separated by commas.',
            placeholder: 'example.com, www.example.com',
            value: currentHostname,
        }, async (value) => {
            const hosts = this.parseHosts(value);
            if (hosts.length === 0) {
                this.elements.status.classList.add('error');
                this.utility.setStatusMessage(this.elements.status, 'INVALID HOSTNAME', 5000);
                return;
            }

            if (hosts.length > 100) {
                this.elements.status.classList.add('error');
                this.utility.setStatusMessage(this.elements.status, 'MAX 100 HOSTNAMES', 5000);
                return;
            }

            if (!this.allowPurge(hosts, 'host')) {
                return;
            }

            try {
                const zoneId = await this.getZoneId(hosts[0]);
                const rayId = await this.purgeCache({ hosts }, zoneId);
                if (rayId) {
                    await this.onPurgeSuccess();
                }
            } catch (error) {
                this.elements.purgeButton.className = '';
                this.elements.status.classList.add('error');
                this.utility.setStatusMessage(this.elements.status, 'PURGE FAILED', 5000, error);
            }
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
            this.elements.status.classList.add('error');
            this.utility.setStatusMessage(this.elements.status, 'OPEN A SITE FIRST', 5000);
            return;
        }

        this.showInputPrompt({
            message: `Cache tag(s) to purge on ${domain}:`,
            hint: 'Up to 30 tags, separated by commas. Tags are case sensitive.',
            placeholder: 'product-listing, homepage',
            value: '',
        }, async (value) => {
            const tags = this.parseTags(value);
            if (tags.length === 0) {
                this.elements.status.classList.add('error');
                this.utility.setStatusMessage(this.elements.status, 'INVALID TAG', 5000);
                return;
            }

            if (tags.length > 30) {
                this.elements.status.classList.add('error');
                this.utility.setStatusMessage(this.elements.status, 'MAX 30 TAGS', 5000);
                return;
            }

            if (!this.allowPurge(tags, 'tag')) {
                return;
            }

            try {
                const zoneId = await this.getZoneId(domain);
                const rayId = await this.purgeCache({ tags }, zoneId);
                if (rayId) {
                    await this.onPurgeSuccess();
                }
            } catch (error) {
                this.elements.purgeButton.className = '';
                this.elements.status.classList.add('error');
                this.utility.setStatusMessage(this.elements.status, 'PURGE FAILED', 5000, error);
            }
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
     * Refuses a purge when one of its targets is on the blacklist configured in the
     * extension options, before anything is sent to CloudFlare.
     * @param {*} targets the hostnames or the cache tags about to be purged
     * @param {*} kind 'host' or 'tag'
     */
    allowPurge(targets, kind) {
        const blocked = this.utility.blockedByBlacklist(targets, this.settings.blacklist, kind);
        if (blocked.length === 0) {
            return true;
        }

        this.elements.purgeButton.className = '';
        this.elements.status.classList.remove('success');
        this.elements.status.classList.add('error');
        this.utility.setStatusMessage(this.elements.status, 'BLOCKED BY BLACKLIST', 5000, `Blacklisted: ${blocked.join(', ')}`);
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

    changeProfile(e) {
        const select = e.target;
        this.settings.token = select.value;
    }

    /**
     * A success event handler for the purge operation.
     */
    async onPurgeSuccess() {
        this.elements.purgeButton.className = '';
        this.elements.status.classList.remove('error');
        this.elements.status.classList.add('success');
        this.utility.setStatusMessage(this.elements.status, 'SUCCESS', 3000);
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

    getZoneId(domain) {
        return new Promise((resolve, reject) => {
            try {
                chrome.runtime.sendMessage({
                    rSettings: this.settings,
                    type: 'getZoneId',
                    rDomain: domain,
                },
                response => {
                    if (response.error) {
                        const count = (domain.match(/\./g) || []).length;
                        if (count > 1) {
                            const fixedDomain = this.utility.fixDomain(domain);
                            return resolve(this.getZoneId(fixedDomain));
                        }

                        return reject(new Error(response.error));
                    }
                    return resolve(response.result);
                });
            } catch (error) {                
                return reject(new Error(error));
            }
        });
    }

    purgeCache(purgeSettings, zoneId) {
        return new Promise((resolve, reject) => {
            try {
                chrome.runtime.sendMessage({
                    rSettings: this.settings,
                    type: 'purgeCache',
                    rPurgeSettings: purgeSettings,
                    rZoneId: zoneId,
                }, response => {
                    if (response.error) {
                        return reject(response.error);
                    }

                    return resolve(response.result)
                });
            } catch (error) {
                reject(new Error(error));
            }
        });
    }
}

PopUp.build();
