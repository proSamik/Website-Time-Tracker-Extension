// src/background/storageManager.js

export class StorageManager {
	constructor() {
		this.categoryPreferences = {
		urls: {},
		exactDomains: {},
		subdomains: {},
		rootDomains: {}
		};
		this.timeData = {};

		this.loadInitialData();
		this.setupStorageListener();
	}

	loadInitialData() {
		chrome.storage.local.get(["categoryPreferences", "timeData"], (data) => {
		this.categoryPreferences = data.categoryPreferences || this.categoryPreferences;
		this.timeData = data.timeData || {};

		// Normalize all keys to lowercase
		this.normalizeCategoryPreferences();
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
		if (lowerKey !== key) {
			normalized[lowerKey] = obj[key];
		} else {
			normalized[key] = obj[key];
		}
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
			if (changes.timeData) {
			this.timeData = changes.timeData.newValue || this.timeData;
			console.log("StorageManager: timeData updated:", this.timeData);
			}
		}
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
}

export default StorageManager;