export class StorageManager {
    constructor() {
        this.categoryPreferences = {
            urls: {},
            exactDomains: {},
            subdomains: {},
            rootDomains: {}
        };
        this.categories = null; // Will be loaded from local storage
        this.timeData = {};

        this.loadInitialData();
        this.setupStorageListener();
    }

    loadInitialData() {
        console.log("StorageManager: Loading initial data from local storage...");
        chrome.storage.local.get(["categoryPreferences", "categories", "timeData"], (data) => {
            this.categoryPreferences = data.categoryPreferences || this.categoryPreferences;
            this.categories = data.categories || null; // Categories initialized during extension setup
            this.timeData = data.timeData || {};

            console.log("StorageManager: Loaded categories:", this.categories);
            console.log("StorageManager: Loaded categoryPreferences:", this.categoryPreferences);

            // Normalize category preferences
            this.normalizeCategoryPreferences();
        });
    }

    saveCategories(categories) {
        chrome.storage.local.set({ categories }, () => {
            console.log("StorageManager: Categories saved:", categories);
        });
    }

    saveCategoryPreferences() {
        chrome.storage.local.set({ categoryPreferences: this.categoryPreferences }, () => {
            console.log("StorageManager: categoryPreferences saved:", this.categoryPreferences);
        });
    }

    saveTimeData() {
        chrome.storage.local.set({ timeData: this.timeData }, () => {
            console.log("StorageManager: timeData saved:", this.timeData);
        });
    }

    normalizeCategoryPreferences() {
        const { urls, exactDomains, subdomains, rootDomains } = this.categoryPreferences;
        this.categoryPreferences.urls = this.normalizeKeys(urls);
        this.categoryPreferences.exactDomains = this.normalizeKeys(exactDomains);
        this.categoryPreferences.subdomains = this.normalizeKeys(subdomains);
        this.categoryPreferences.rootDomains = this.normalizeKeys(rootDomains);
    }

    normalizeKeys(obj) {
        const normalized = {};
        for (let key in obj) {
            const lowerKey = key.toLowerCase();
            normalized[lowerKey] = obj[key];
        }
        return normalized;
    }

    setupStorageListener() {
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === "local") {
                if (changes.categoryPreferences) {
                    this.categoryPreferences = changes.categoryPreferences.newValue || this.categoryPreferences;
                    this.normalizeCategoryPreferences();
                    console.log("StorageManager: categoryPreferences updated:", this.categoryPreferences);
                }
                if (changes.categories) {
                    this.categories = changes.categories.newValue || this.categories;
                    console.log("StorageManager: categories updated:", this.categories);
                }
                if (changes.timeData) {
                    this.timeData = changes.timeData.newValue || this.timeData;
                    console.log("StorageManager: timeData updated:", this.timeData);
                }
            }
        });
    }
}

export default StorageManager;