// src/background/categorizationManager.js

import { getRootDomain } from './utils.js';

export class CategorizationManager {
  constructor(storageManager) {
    this.storageManager = storageManager;
  }

  saveCategorization(url, category, scope) {
    const normalizedUrl = url.toLowerCase();
    const urlObj = new URL(normalizedUrl);
    const hostname = urlObj.hostname.toLowerCase();

    switch (scope) {
      case "url":
        this.storageManager.categoryPreferences.urls[normalizedUrl] = category;
        break;
      case "exact":
        this.storageManager.categoryPreferences.exactDomains[hostname] = category;
        break;
      case "subdomains":
        this.storageManager.categoryPreferences.subdomains[hostname] = category;
        break;
      case "domain":
        const rootDomain = getRootDomain(hostname);
        this.storageManager.categoryPreferences.rootDomains[rootDomain] = category;
        break;
    }

    this.storageManager.saveCategoryPreferences();
  }

  isUrlCategorized(url) {
    const normalizedUrl = url.toLowerCase();
    const urlObj = new URL(normalizedUrl);
    const hostname = urlObj.hostname.toLowerCase();
    const rootDomain = getRootDomain(hostname);

    if (this.storageManager.categoryPreferences.urls[normalizedUrl]) {
      console.log("CategorizationManager: URL categorized under 'urls'");
      return true;
    }

    if (this.storageManager.categoryPreferences.exactDomains[hostname]) {
      console.log("CategorizationManager: URL categorized under 'exactDomains'");
      return true;
    }

    for (let domain in this.storageManager.categoryPreferences.subdomains) {
      if (hostname === domain || hostname.endsWith(`.${domain}`)) {
        console.log("CategorizationManager: URL categorized under 'subdomains'");
        return true;
      }
    }

    if (this.storageManager.categoryPreferences.rootDomains[rootDomain]) {
      console.log("CategorizationManager: URL categorized under 'rootDomains'");
      return true;
    }

    console.log("CategorizationManager: URL is NOT categorized");
    return false;
  }

  getCategoryForUrl(url) {
    const normalizedUrl = url.toLowerCase();
    const urlObj = new URL(normalizedUrl);
    const hostname = urlObj.hostname.toLowerCase();
    const rootDomain = getRootDomain(hostname);

    if (this.storageManager.categoryPreferences.urls[normalizedUrl]) {
      return this.storageManager.categoryPreferences.urls[normalizedUrl];
    }

    if (this.storageManager.categoryPreferences.exactDomains[hostname]) {
      return this.storageManager.categoryPreferences.exactDomains[hostname];
    }

    for (let domain in this.storageManager.categoryPreferences.subdomains) {
      if (hostname === domain || hostname.endsWith(`.${domain}`)) {
        return this.storageManager.categoryPreferences.subdomains[domain];
      }
    }

    if (this.storageManager.categoryPreferences.rootDomains[rootDomain]) {
      return this.storageManager.categoryPreferences.rootDomains[rootDomain];
    }

    return "neutral"; // Default category
  }
}

export default CategorizationManager;
