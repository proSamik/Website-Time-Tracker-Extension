import { getCurrentDate, formatTime, getRootDomain } from './utils.js';
import CategorizationManager from './categorizationManager.js';

export class TimeTracker {
    constructor(storageManager, categorizationManager) {
        this.storageManager = storageManager;
        this.categorizationManager = categorizationManager;

        this.active = false;
        this.startTime = 0;
        this.currentUrl = '';
        this.currentDate = getCurrentDate();

        this.setupEventListeners();
    }

    setupEventListeners() {
        chrome.tabs.onUpdated.addListener(this.handleTabUpdated.bind(this));
        chrome.tabs.onActivated.addListener(this.handleTabActivated.bind(this));
        chrome.windows.onFocusChanged.addListener(this.handleWindowFocusChanged.bind(this));
        chrome.webNavigation.onHistoryStateUpdated.addListener(this.handleHistoryStateUpdated.bind(this));
        chrome.idle.onStateChanged.addListener(this.handleIdleStateChanged.bind(this));
        chrome.runtime.onSuspend.addListener(this.handleSuspend.bind(this));

        chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
    }

    handleTabUpdated(tabId, changeInfo, tab) {
        this.checkDateChange();
        if (changeInfo.status === "complete" && tab.active) {
            this.handleTabChange(tab);
        }
    }

    handleTabActivated(activeInfo) {
        this.checkDateChange();
        chrome.tabs.get(activeInfo.tabId, (tab) => {
            this.handleTabChange(tab);
        });
    }

    handleWindowFocusChanged(windowId) {
        this.checkDateChange();
        if (windowId === chrome.windows.WINDOW_ID_NONE) {
            this.handleTabInactive();
        } else {
            chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
                if (tabs.length > 0) {
                    this.handleTabChange(tabs[0]);
                }
            });
        }
    }

    handleHistoryStateUpdated(details) {
        this.checkDateChange();
        if (details.frameId === 0) {
            chrome.tabs.get(details.tabId, (tab) => {
                this.handleTabChange(tab);
            });
        }
    }

    handleIdleStateChanged(newState) {
        this.checkDateChange();
        if (newState === "idle" || newState === "locked") {
            this.handleTabInactive();
        } else if (newState === "active") {
            chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
                if (tabs.length > 0) {
                    this.handleTabChange(tabs[0]);
                }
            });
        }
    }

    handleSuspend() {
        this.handleTabInactive();
    }

    handleMessage(request, sender, sendResponse) {
        if (request.action === "saveCategorization") {
            const { url, category, scope } = request;
            this.categorizationManager.saveCategorization(url, category, scope);
            this.reallocateTime(url, category, scope);
        }
    }

    handleTabChange(tab) {
        const url = tab.url;
        if (!url) {
            console.log("TimeTracker: No URL found for the active tab.");
            return;
        }

        console.log(`TimeTracker: Active tab changed to ${url}`);

        if (!this.isValidUrl(url)) {
            console.log(`TimeTracker: URL ${url} is not valid for content scripts.`);
            return;
        }

        const urlCategorized = this.categorizationManager.isUrlCategorized(url);
        console.log(`TimeTracker: URL categorized? ${urlCategorized}`);

        const shouldPrompt = !urlCategorized;

        if (shouldPrompt) {
            console.log(`TimeTracker: Sending promptCategorization message to content script for ${url}`);
            chrome.tabs.sendMessage(tab.id, {
                action: "promptCategorization",
                url: url,
                isDomain: false
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('TimeTracker: Error sending message:', chrome.runtime.lastError.message);
                } else {
                    console.log('TimeTracker: promptCategorization message sent successfully.');
                }
            });
        }

        if (this.active) {
            this.handleTabInactive();
        }
        this.active = true;
        this.startTime = Date.now();
        this.currentUrl = url;
        console.log(`TimeTracker: Started tracking time for ${url}`);
    }

    handleTabInactive() {
        if (this.active) {
            const timeSpent = Date.now() - this.startTime;
            const date = getCurrentDate();

            let category = this.categorizationManager.getCategoryForUrl(this.currentUrl);

            if (!category) {
                category = 'uncategorized';
            }

            console.log(`TimeTracker: Saving time for date ${date} and URL ${this.currentUrl} under category ${category}`);

            if (!this.storageManager.timeData[date]) {
                this.storageManager.timeData[date] = {};
            }
            if (!this.storageManager.timeData[date][category]) {
                this.storageManager.timeData[date][category] = {};
            }
            if (!this.storageManager.timeData[date][category][this.currentUrl]) {
                this.storageManager.timeData[date][category][this.currentUrl] = 0;
            }

            this.storageManager.timeData[date][category][this.currentUrl] += timeSpent;

            this.storageManager.saveTimeData();

            console.log(`TimeTracker: Time tracked for ${this.currentUrl}: ${formatTime(timeSpent)} under category ${category}`);

            this.active = false;
        }
    }

    checkDateChange() {
        const newDate = getCurrentDate();

        if (newDate !== this.currentDate) {
            console.log(`TimeTracker: Date has changed from ${this.currentDate} to ${newDate}`);

            this.handleTabInactive();
            this.currentDate = newDate;
            this.active = false;
            this.storageManager.saveTimeData();
        }
    }

    isValidUrl(url) {
        try {
            const urlObj = new URL(url);
            const prohibitedProtocols = ['chrome:', 'about:', 'file:', 'data:', 'javascript:', 'extensions:'];
            if (prohibitedProtocols.includes(urlObj.protocol)) {
                return false;
            }
            const prohibitedDomains = ['chrome.google.com'];
            if (prohibitedDomains.includes(urlObj.hostname.toLowerCase())) {
                return false;
            }
            return true;
        } catch (e) {
            console.error(`TimeTracker: Invalid URL - ${url}`);
            return false;
        }
    }

    reallocateTime(url, newCategory, scope) {
        const normalizedUrl = url.toLowerCase();
        const urlObj = new URL(normalizedUrl);
        const hostname = urlObj.hostname.toLowerCase();
        const rootDomain = this.getRootDomain(hostname);

        console.log(`TimeTracker: Reallocating time for ${normalizedUrl} to category ${newCategory} with scope ${scope}`);

        for (const date in this.storageManager.timeData) {
            if (this.storageManager.timeData[date]['uncategorized']) {
                const uncategorizedSites = this.storageManager.timeData[date]['uncategorized'];
                const sitesToReallocate = {};

                for (const site in uncategorizedSites) {
                    const siteUrl = site.toLowerCase();
                    const siteObj = new URL(siteUrl);
                    const siteHostname = siteObj.hostname.toLowerCase();

                    let matches = false;
                    if (scope === 'url') {
                        if (siteUrl === normalizedUrl) {
                            matches = true;
                        }
                    } else if (scope === 'exact') {
                        if (siteHostname === hostname) {
                            matches = true;
                        }
                    } else if (scope === 'subdomains') {
                        if (siteHostname === hostname || siteHostname.endsWith(`.${hostname}`)) {
                            matches = true;
                        }
                    } else if (scope === 'domain') {
                        const siteRootDomain = this.getRootDomain(siteHostname);
                        if (siteRootDomain === rootDomain) {
                            matches = true;
                        }
                    }

                    if (matches) {
                        sitesToReallocate[site] = uncategorizedSites[site];
                    }
                }

                for (const site in sitesToReallocate) {
                    const timeSpent = sitesToReallocate[site];

                    if (!this.storageManager.timeData[date][newCategory]) {
                        this.storageManager.timeData[date][newCategory] = {};
                    }
                    if (!this.storageManager.timeData[date][newCategory][site]) {
                        this.storageManager.timeData[date][newCategory][site] = 0;
                    }

                    this.storageManager.timeData[date][newCategory][site] += timeSpent;
                    delete this.storageManager.timeData[date]['uncategorized'][site];

                    console.log(`TimeTracker: Reallocated ${formatTime(timeSpent)} from 'uncategorized' to '${newCategory}' for ${site}`);
                }

                if (Object.keys(this.storageManager.timeData[date]['uncategorized']).length === 0) {
                    delete this.storageManager.timeData[date]['uncategorized'];
                    console.log(`TimeTracker: 'uncategorized' category deleted for date ${date}`);
                }
            }
        }

        this.storageManager.saveTimeData();
        console.log(`TimeTracker: Time data reallocated for ${normalizedUrl} to category ${newCategory}`);
    }
}

export default TimeTracker;