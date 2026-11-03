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
/* eslint-disable no-param-reassign */

import Utility from './utility.js';
import Api from './api.js';

class Options {
    constructor() {
        this.utility = new Utility();
        this.elements = {
            saveButton: document.querySelector('#save'),
            hidePurgeAllCheckbox: document.querySelector('#hide-purge-all'),
            customPurgeButton: document.querySelector('#custom-purge'),
            showDevModeCheckbox: document.querySelector('#show-dev-mode'),
            keyBox: document.querySelector('#key'),
            emailBox: document.querySelector('#email'),
            tokenBox: document.querySelector('#token'),
            refreshBox: document.querySelector('#refresh'),
            customPurgeGroup: document.querySelector('#custom-purge-group'),
            statusField: document.querySelector('#status'),
            errorField: document.querySelector('#error-status'),
            customUrl: document.querySelector('#custom-url'),
            purgeStatus: document.querySelector('#purge-status'),
            profilesTableWrapper: document.querySelector('#profiles-table-wrapper'),
            addProfileButton: document.querySelector('#add-profile-btn'),
            addProfileName: document.querySelector('#add-profile-name'),
            addProfileToken: document.querySelector('#add-profile-token'),
            propertiesListGroup: document.querySelector('#cf-properties-list'),
            propertiesList: document.querySelector('#cf-properties-list .group-body'),
            blacklistBox: document.querySelector('#blacklist'),
        };
        this.settings = {
            tag: 'options',
            key: null,
            email: null,
            token: null,
            refresh: null,
            hidePurgeAll: false,
            showDevMode: false,
            profiles: null,
            blacklist: null
        };

        this.profilesModel = null;
        this.blacklist = [];
        this.elements.saveButton.addEventListener('click', this.saveClick.bind(this));
        this.elements.customPurgeButton.addEventListener('click', this.customPurge.bind(this));
        this.elements.addProfileButton.addEventListener('click', this.addProfile.bind(this));
        this.elements.hidePurgeAllCheckbox.addEventListener('change', this.saveClick.bind(this));
        this.elements.showDevModeCheckbox.addEventListener('change', this.saveClick.bind(this));
        this.restoreOptions();
    }

    static build() {
        return new Options();
    }

    /**
     * Syncs the options from the chrome sync storage.
     */
    restoreOptions() {
        chrome.storage.sync.get(this.settings, (items) => {
            this.elements.keyBox.value = items.key;
            this.elements.tokenBox.value = items.token;
            this.elements.emailBox.value = items.email;
            this.elements.hidePurgeAllCheckbox.checked = items.hidePurgeAll;
            this.elements.showDevModeCheckbox.checked = items.showDevMode;
            this.blacklist = this.utility.parseBlacklist(items.blacklist);
            this.elements.blacklistBox.value = this.blacklist.join('\n');

            this.api = new Api(items.email, items.key, items.token);

            if (items.refresh != null && items.refresh !== undefined) {
                this.elements.refreshBox.value = items.refresh;
            } else {
                this.elements.refreshBox.value = 10;
            }

            if ((items.key != null && items.key !== '' && items.email != null && items.email !== '') || (items.token != null && items.token !== '')) {
                this.elements.customPurgeGroup.classList.remove('hide');
                this.elements.propertiesListGroup.classList.remove('hide');
            } else {
                this.elements.customPurgeGroup.classList.add('hide');
                this.elements.propertiesListGroup.classList.add('hide');
            }

            this.profilesModel = items.profiles;
            this.renderProfiles(this.profilesModel);
            this.listOwnedProperties();
        });
    }

    /**
     * Builds a table row. Every cell is either a string, which becomes text, or a
     * ready made element. Text never goes through innerHTML, so profile names,
     * zone names and anything else the extension did not author cannot inject
     * markup into the options page.
     * @param {*} cells the cell contents
     * @param {*} tagName 'td' for a body row, 'th' for the header row
     */
    createRow(cells, tagName) {
        const row = document.createElement('tr');
        cells.forEach((content) => {
            const cell = document.createElement(tagName || 'td');
            cell.append(content);
            row.append(cell);
        });

        return row;
    }

    renderProfiles(profiles) {
        const wrapper = this.elements.profilesTableWrapper;
        wrapper.replaceChildren();
        if (!profiles || Object.keys(profiles).length === 0) {
            return;
        }

        const table = document.createElement('table');
        table.append(this.createRow(['Profile', 'API Token', ''], 'th'));

        Object.keys(profiles).forEach((profileName) => {
            const removeLink = document.createElement('a');
            removeLink.href = '#';
            removeLink.className = 'profile-remove';
            removeLink.textContent = 'remove';
            removeLink.addEventListener('click', (e) => {
                e.preventDefault();
                delete this.profilesModel[profileName];
                this.renderProfiles(this.profilesModel);
            });

            table.append(this.createRow([
                profileName,
                this.obfuscateToken(profiles[profileName]),
                removeLink,
            ]));
        });

        wrapper.append(table);
    }

    obfuscateToken(token) {
        const obfCount = Math.floor(0.7 * token.length);
        return '*'.repeat(obfCount) + token.substr(obfCount - 1, token.length - obfCount);
    }

    addProfile() {
        const profileName = this.elements.addProfileName.value;
        const profileToken = this.elements.addProfileToken.value;

        if (profileName !== '' && profileToken !== '') {
            if (!this.profilesModel) {
                this.profilesModel = {};
            }

            this.profilesModel[profileName] = profileToken;
            this.renderProfiles(this.profilesModel);
        }
    }



    /**
     * Saves the current options
     */
    saveClick() {
        const key = this.elements.keyBox.value;
        const email = this.elements.emailBox.value;
        const token = this.elements.tokenBox.value;
        const refresh = this.elements.refreshBox.value;
        const hidePurgeAll = this.elements.hidePurgeAllCheckbox.checked;
        const showDevMode = this.elements.showDevModeCheckbox.checked;
        const blacklist = this.utility.parseBlacklist(this.elements.blacklistBox.value);

        this.elements.errorField.replaceChildren();

        if (((key === '' || email === '') && token === '') || refresh === '') {
            const missingFields = [];
            if (!key) { missingFields.push('Api Key'); }
            if (!email) { missingFields.push('E-mail'); }
            if (!token) { missingFields.push('OR a valid Api Token'); }
            if (!refresh) { missingFields.push('Refresh Timeout'); }

            this.elements.errorField.append('The following fields are required:');
            missingFields.forEach((field) => {
                const paragraph = document.createElement('p');
                paragraph.textContent = field;
                this.elements.errorField.append(paragraph);
            });
            return;
        }

        this.settings = {
            tag: 'options',
            key,
            email,
            token,
            refresh,
            hidePurgeAll,
            showDevMode,
            profiles: this.profilesModel,
            blacklist
        };

        chrome.storage.sync.set(this.settings, () => {
            this.elements.statusField.textContent = 'Options saved.';
            if ((this.elements.keyBox.value !== '' && this.elements.emailBox.value !== '') || this.elements.tokenBox.value !== '') {
                this.elements.customPurgeGroup.classList.remove('hide');
            } else {
                this.elements.customPurgeGroup.classList.add('hide');
            }
            this.restoreOptions();
            setTimeout(() => {
                this.elements.statusField.textContent = '';
            }, 1500);
        });
    }

    /**
     * Purges a set of URLs under the same domain
     */
    async customPurge() {
        let url = this.elements.customUrl.value;
        let domain = '';

        if (url === '') {
            return;
        }
        url = url.split('\n').join(',');
        const urls = url.indexOf(',') >= 0 ? url.split(',') : [url];

        for (let i = 0; i < urls.length; i += 1) {
            urls[i] = urls[i].trim();
            const regex = new RegExp(/^https?:\/\/.*/g);
            if (urls[i].match(regex) == null) {
                this.utility.setStatusMessage(this.elements.purgeStatus, `URL validation error - ${urls[i]}`, 3000);
                return;
            }

            const tmpDomain = this.utility.getDomain(urls[i]);
            if (tmpDomain === '') {
                this.utility.setStatusMessage(this.elements.purgeStatus, `Could not determine the domain for url: ${urls[i]}`, 3000);
                return;
            }

            if (domain === '') {
                domain = tmpDomain;
            } else if (domain !== tmpDomain) {
                this.utility.setStatusMessage(this.elements.purgeStatus, 'All urls should be under the same domain.', 3000);
                return;
            }
        }

        // Single URLs are purged even on a blacklisted domain: the blacklist only
        // guards the purges that wipe the cache of a whole domain.
        try {
            const zoneId = await this.api.getZoneId(domain);
            try {
                const purgeSuccessId = await this.api.purgeCache({ files: urls }, zoneId);
                this.utility.setStatusMessage(this.elements.purgeStatus, `PURGE SUCESSFUL - Purge vector: ${purgeSuccessId}`, 3000);
            } catch (error) {
                this.utility.setStatusMessage(this.elements.purgeStatus, error, 3000);
            }
        } catch (zoneError) {
            this.utility.setStatusMessage(this.elements.purgeStatus, zoneError, 3000);
        }
    }

    async listOwnedProperties() {
        const ownedProperties = await this.api.getZones();
        const table = document.createElement('table');
        table.append(this.createRow(['Zone ID', 'Created Date', 'Registrar', 'Domain'], 'th'));

        ownedProperties.forEach((zone) => {
            const link = document.createElement('a');
            // The scheme is fixed here, so a hostile zone name cannot smuggle in
            // a javascript: URL, and textContent keeps it out of the markup.
            link.href = `https://${zone.name}`;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.textContent = zone.name;

            table.append(this.createRow([
                zone.id,
                new Date(zone.created_on).toString(),
                zone.original_registrar ? zone.original_registrar : 'Cloudflare',
                link,
            ]));
        });

        this.elements.propertiesList.replaceChildren(table);
    }
}

Options.build();
