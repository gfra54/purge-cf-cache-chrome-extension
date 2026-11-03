# CloudFlare Purge Plugin
Welcome to the CloudFlare Purge Plugin repository.
CF-Purge is a chrome extension that purges the cache for the current URL on CloudFlare enabled websites.
You can find the Chrome extension [here](https://chrome.google.com/webstore/detail/cloudflare-purge-plugin/nbpecchpcfacahhekolpaofpmogkmmok).

Please visit the "Cloudflare Purge Plugin" website at [www.cf-purge.com](http://www.cf-purge.com) to find more information.

The CloudFlare purge plugin uses the CloudFlare API to purge any page of a website that serves its contents through the CloudFlare CDN. After you set your CF e-mail and API key in the options, you can purge the cache of any page of your CF enabled website. After version 1.3, you can purge the entire cache for the domain of your current tab.

### Changeset
v1.10.2: Same as 1.10.1, republished on the public addons.mozilla.org listing, which was still serving 1.9.0.

v1.10.1: The "Never purge" blacklist now only guards the purges that wipe the cache of a whole domain, so "Purge Everything" and "Purge domain" are still refused for a listed domain while purging a single URL or a cache tag is allowed there. The popup warns as soon as it opens on a blacklisted domain, and the blacklist matches domains only, cache tag entries are no longer part of it.

v1.10.0: Added a zone selector to the popup. It lists every zone the selected API token can read, preselects the zone that serves the current tab and, once a zone is picked, shows shortcuts that open its DNS records, cache rules and security rules pages in the Cloudflare dashboard. The zone list is paginated, so accounts with more than 50 domains are listed in full.

v1.9.0: Added a "Purge domain" button that asks for one or more hostnames and purges every cached asset served from them, and a "Purge tag" button that purges by Cache-Tag in the zone of the current tab. Both are available on all Cloudflare plans, Free included. Added a "Never purge a whole domain" blacklist to the options page: purging the entire cache or a whole hostname is refused for a listed domain before it reaches Cloudflare, while purging a single URL or a cache tag stays allowed there and the popup warns when the current domain is listed. Brought the Firefox build up to date: Manifest V3 with a background page, since Firefox has no service worker support. Removed every innerHTML assignment: response headers of the visited site, zone names from the Cloudflare API and user typed profile names are now built as DOM text nodes, so they cannot inject markup into the extension pages.

### Running the extension locally
`testMode.ps1` assembles an unpacked extension in `build\<browser>` out of the shared `src` files and the browser specific ones in `src\<browser>`:

```powershell
.\testMode.ps1 -browser firefox
.\testMode.ps1 -browser chrome
```

Firefox: `about:debugging#/runtime/this-firefox` > "Load Temporary Add-on" > pick `build\firefox\manifest.json`. The add-on is removed when Firefox restarts.
Chrome: `chrome://extensions` > enable developer mode > "Load unpacked" > pick the `build\chrome` folder.

### Installing in Firefox without the store
A release build of Firefox only installs signed add-ons, but Mozilla signs unlisted
packages that are never published on addons.mozilla.org. `sign.ps1` builds the add-on
and has it signed, using [web-ext](https://github.com/mozilla/web-ext) (`npm install --global web-ext`)
and an [AMO API key](https://addons.mozilla.org/developers/addon/api/key/):

```powershell
.\sign.ps1 -apiKey "user:12345678:123" -apiSecret "your-secret"
```

The signed `.xpi` lands in `build\artifacts`. Install it from `about:addons` > the gear
icon > "Install Add-on From File". Every signed upload needs a version that was never
uploaded before, so bump `version` in `src\firefox\manifest.json` before signing again.

### Publishing on addons.mozilla.org
The add-on has a public listing at
[addons.mozilla.org/firefox/addon/cloudflare-advanced-purge](https://addons.mozilla.org/firefox/addon/cloudflare-advanced-purge/).
Publishing a new version there is the same script on the other channel:

```powershell
.\sign.ps1 -channel listed
```

The version is uploaded, then reviewed by Mozilla, and only signed and served to the
public once the review passes, so the script returns as soon as the upload went through
instead of waiting. Version numbers are shared by both channels: a version already
signed as unlisted cannot be submitted as listed, it needs a new number. The review
queue and the release notes of each version live in the
[Developer Hub](https://addons.mozilla.org/developers/addons).

v1.8.0: Migrated the extension to use Chrome Manifest V3 for improved security and better compatibility with Google Chrome. Added a list of all user owned cloudflare zones for the current API key on the options page.

v1.7.0: Added the ability to have multiple Cloudflare tokens and select between different profiles. Fixed a bug with the domain parsing logic. Special thanks to the active members of the community for their great feedback.

v1.6.2: Refactored the way the extension makes asynchronous requests to the Cloudflare API to follow the Chrome safety requirements and use a background page.

v1.6.1: Added support for Cloudflare API Tokens. Please check [https://www.cf-purge.com/token-setup.html](https://www.cf-purge.com/token-setup.html) to find out more.

v1.6.0: Code refactoring for the whole project. Better readability cleanly written and using the latest trends in JavaScript development.

v1.5.1: Added a new feature for managing CloudFlare DEV mode for your domains

v1.5.0: Added support for Mozilla Firefox

v1.4.3: Masked the API key input. Fixed issues with the parsing of second level domains in the URL.

v1.4.2: Added an option to show/hide the "Purge Entire Cache" button

v1.4.1: Fixed a critical issue when purging domains without a leading sub-domain

v1.4.0: Changed the design to reflect the new CloudFlare design guidelines. Refactored the extension code and optimized the API calls.

v1.3.6: Added the ability to purge multiple URLs from the options page

v1.3.5: Added a way to check the error message that gets returned from CloudFlare by clicking on the "Purge failed" red text

v1.3.4: Fixed an issue when trying to clear an apex domain.

v1.3.3: Changed the logic for the "Info" button to show the info even when some parts of it are missing

v1.3.2: Added a new "Info" button that shows the CloudFlare node, Ray ID and the current Cache-Control header values.

v1.3.1: Pushed a fix for a bug related to anchor links with spaces in the URL. Thanks to "solarroger".

v1.3: Added a new option to purge the whole cache for the domain of the current tab

v1.2.2: A small bug fix for the refresh functionality caused by auto updates.

v1.2.1: Added a new refresh timeout option that delays the page refresh.

v1.1: Includes a refresh function that refreshes the page on a successful purge

v1.0: The extension includes all the basic functionality that you need to purge the URL in your active tab.

### Project suggestions
If you have ideas and suggestions about this project you can post them on the CF-Purge extension [page](https://chrome.google.com/webstore/detail/cloudflare-purge-plugin/nbpecchpcfacahhekolpaofpmogkmmok). You can also make a pull request and introduce code fixes and feature implementations. 
All pull requests will be reviewed and put in the following releases.

### Licensing information
Copyright 2021 Tosho Toshev

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

[http://www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0)

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
