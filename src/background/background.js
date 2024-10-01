// background.js

let categoryPreferences = {
	urls: {},           // Stores categorizations for specific URLs
	exactDomains: {},   // Stores categorizations for exact domains
	subdomains: {},     // Stores categorizations for subdomains
	rootDomains: {}     // Stores categorizations for root domains
  };
  let timeData = {};
  
  // Load category preferences and time data from storage
  chrome.storage.local.get(["categoryPreferences", "timeData"], (data) => {
	categoryPreferences = data.categoryPreferences || {};
	// Ensure all properties are defined and hostnames are lowercased
	categoryPreferences.urls = categoryPreferences.urls || {};
	categoryPreferences.exactDomains = categoryPreferences.exactDomains || {};
	categoryPreferences.subdomains = categoryPreferences.subdomains || {};
	categoryPreferences.rootDomains = categoryPreferences.rootDomains || {};
	// Normalize all keys to lowercase
	for (let url in categoryPreferences.urls) {
	  const lowerUrl = url.toLowerCase();
	  if (lowerUrl !== url) {
		categoryPreferences.urls[lowerUrl] = categoryPreferences.urls[url];
		delete categoryPreferences.urls[url];
	  }
	}
	for (let domain in categoryPreferences.exactDomains) {
	  const lowerDomain = domain.toLowerCase();
	  if (lowerDomain !== domain) {
		categoryPreferences.exactDomains[lowerDomain] = categoryPreferences.exactDomains[domain];
		delete categoryPreferences.exactDomains[domain];
	  }
	}
	for (let domain in categoryPreferences.subdomains) {
	  const lowerDomain = domain.toLowerCase();
	  if (lowerDomain !== domain) {
		categoryPreferences.subdomains[lowerDomain] = categoryPreferences.subdomains[domain];
		delete categoryPreferences.subdomains[domain];
	  }
	}
	for (let domain in categoryPreferences.rootDomains) {
	  const lowerDomain = domain.toLowerCase();
	  if (lowerDomain !== domain) {
		categoryPreferences.rootDomains[lowerDomain] = categoryPreferences.rootDomains[domain];
		delete categoryPreferences.rootDomains[domain];
	  }
	}
  
	timeData = data.timeData || {};
  });
  
  // Listen for changes in storage to update variables dynamically
  chrome.storage.onChanged.addListener((changes, area) => {
	if (area === "local") {
	  if (changes.categoryPreferences) {
		categoryPreferences = changes.categoryPreferences.newValue || {};
		// Ensure all properties are defined and hostnames are lowercased
		categoryPreferences.urls = categoryPreferences.urls || {};
		categoryPreferences.exactDomains = categoryPreferences.exactDomains || {};
		categoryPreferences.subdomains = categoryPreferences.subdomains || {};
		categoryPreferences.rootDomains = categoryPreferences.rootDomains || {};
		// Normalize all keys to lowercase
		for (let url in categoryPreferences.urls) {
		  const lowerUrl = url.toLowerCase();
		  if (lowerUrl !== url) {
			categoryPreferences.urls[lowerUrl] = categoryPreferences.urls[url];
			delete categoryPreferences.urls[url];
		  }
		}
		for (let domain in categoryPreferences.exactDomains) {
		  const lowerDomain = domain.toLowerCase();
		  if (lowerDomain !== domain) {
			categoryPreferences.exactDomains[lowerDomain] = categoryPreferences.exactDomains[domain];
			delete categoryPreferences.exactDomains[domain];
		  }
		}
		for (let domain in categoryPreferences.subdomains) {
		  const lowerDomain = domain.toLowerCase();
		  if (lowerDomain !== domain) {
			categoryPreferences.subdomains[lowerDomain] = categoryPreferences.subdomains[domain];
			delete categoryPreferences.subdomains[domain];
		  }
		}
		for (let domain in categoryPreferences.rootDomains) {
		  const lowerDomain = domain.toLowerCase();
		  if (lowerDomain !== domain) {
			categoryPreferences.rootDomains[lowerDomain] = categoryPreferences.rootDomains[domain];
			delete categoryPreferences.rootDomains[domain];
		  }
		}
	  }
	  if (changes.timeData) {
		timeData = changes.timeData.newValue || {};
	  }
	}
  });
  
  // Variables to store time tracking data
  let active = false;
  let startTime = 0;
  let currentUrl = '';
  
  // Keep track of the current date
  let currentDate = getCurrentDate();
  
  // Function to get current date as 'YYYY-MM-DD'
  function getCurrentDate() {
	const today = new Date();
	return today.toISOString().split('T')[0];
  }
  
  // Check if the date has changed
  function checkDateChange() {
	const newDate = getCurrentDate();
	if (newDate !== currentDate) {
	  // Date has changed
	  handleTabInactive(); // Save any active time
	  currentDate = newDate;
	  active = false; // Reset active status
	  console.log(`Date changed to ${currentDate}`);
	}
  }
  
  // Event listeners
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
	checkDateChange();
	if (changeInfo.status === "complete" && tab.active) {
	  handleTabChange(tab);
	}
  });
  
  chrome.tabs.onActivated.addListener((activeInfo) => {
	checkDateChange();
	chrome.tabs.get(activeInfo.tabId, (tab) => {
	  handleTabChange(tab);
	});
  });
  
  chrome.windows.onFocusChanged.addListener((windowId) => {
	checkDateChange();
	if (windowId === chrome.windows.WINDOW_ID_NONE) {
	  handleTabInactive();
	} else {
	  chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
		if (tabs.length > 0) {
		  handleTabChange(tabs[0]);
		}
	  });
	}
  });
  
  chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
	checkDateChange();
	if (details.frameId === 0) {
	  chrome.tabs.get(details.tabId, (tab) => {
		handleTabChange(tab);
	  });
	}
  });
  
  chrome.idle.onStateChanged.addListener((newState) => {
	checkDateChange();
	if (newState === "idle" || newState === "locked") {
	  handleTabInactive();
	} else if (newState === "active") {
	  chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
		if (tabs.length > 0) {
		  handleTabChange(tabs[0]);
		}
	  });
	}
  });
  
  // Listen for messages from content scripts
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.action === "saveCategorization") {
	  const { url, category, scope } = request;
	  handleSaveCategorization(url, category, scope);
  
	  // Reallocate time from 'uncategorized' to the selected category
	  reallocateTime(url, category, scope);
	}
  });
  
  // Function to handle saving categorization
  function handleSaveCategorization(url, category, scope) {
	const normalizedUrl = url.toLowerCase();
	const urlObj = new URL(normalizedUrl);
	const hostname = urlObj.hostname.toLowerCase();
  
	if (scope === "url") {
	  categoryPreferences.urls[normalizedUrl] = category;
	  console.log(`Saved category under 'urls': ${normalizedUrl} -> ${category}`);
	} else if (scope === "exact") {
	  categoryPreferences.exactDomains[hostname] = category;
	  console.log(`Saved category under 'exactDomains': ${hostname} -> ${category}`);
	} else if (scope === "subdomains") {
	  categoryPreferences.subdomains[hostname] = category;
	  console.log(`Saved category under 'subdomains': ${hostname} -> ${category}`);
	} else if (scope === "domain") {
	  const rootDomain = getRootDomain(hostname);
	  categoryPreferences.rootDomains[rootDomain] = category;
	  console.log(`Saved category under 'rootDomains': ${rootDomain} -> ${category}`);
	}
  
	// Save to storage
	chrome.storage.local.set({ categoryPreferences }, () => {
	  console.log(`Categorization saved for ${normalizedUrl}: ${category} (${scope})`);
	});
  }
  
  // Function to check if a URL is categorized
  function isUrlCategorized(url) {
	const normalizedUrl = url.toLowerCase();
	console.log(`Checking if URL is categorized: ${normalizedUrl}`);
  
	if (categoryPreferences.urls && categoryPreferences.urls[normalizedUrl]) {
	  console.log(`URL is categorized under 'urls': ${categoryPreferences.urls[normalizedUrl]}`);
	  return true;
	}
  
	const urlObj = new URL(normalizedUrl);
	const hostname = urlObj.hostname.toLowerCase();
  
	if (categoryPreferences.exactDomains && categoryPreferences.exactDomains[hostname]) {
	  console.log(`Hostname is categorized under 'exactDomains': ${categoryPreferences.exactDomains[hostname]}`);
	  return true;
	}
  
	if (categoryPreferences.subdomains) {
	  for (const domain in categoryPreferences.subdomains) {
		if (hostname === domain || hostname.endsWith(`.${domain}`)) {
		  console.log(`Hostname is categorized under 'subdomains': ${categoryPreferences.subdomains[domain]}`);
		  return true;
		}
	  }
	}
  
	const rootDomain = getRootDomain(hostname);
	if (categoryPreferences.rootDomains && categoryPreferences.rootDomains[rootDomain]) {
	  console.log(`Hostname is categorized under 'rootDomains': ${categoryPreferences.rootDomains[rootDomain]}`);
	  return true;
	}
  
	console.log("URL is not categorized.");
	return false;
  }
  
  // Handle when the tab becomes inactive
  function handleTabInactive() {
	if (active) {
	  const timeSpent = Date.now() - startTime;
	  const date = getCurrentDate();
  
	  // Get category
	  let category = getCategoryForUrl(currentUrl);
  
	  // If category is 'neutral' and URL is not categorized, store under 'uncategorized'
	  if (category === 'neutral' && !isUrlCategorized(currentUrl)) {
		category = 'uncategorized';
	  }
  
	  // Initialize data structures if undefined
	  if (!timeData[date]) {
		timeData[date] = {};
	  }
	  if (!timeData[date][category]) {
		timeData[date][category] = {};
	  }
	  if (!timeData[date][category][currentUrl]) {
		timeData[date][category][currentUrl] = 0;
	  }
  
	  timeData[date][category][currentUrl] += timeSpent;
  
	  chrome.storage.local.set({ timeData }, () => {
		console.log(`Time tracked for ${currentUrl}: ${formatTime(timeSpent)} under category ${category}`);
	  });
  
	  active = false;
	}
  }
  
  // Function to validate URLs before injecting content scripts
  function isValidUrl(url) {
	try {
	  const urlObj = new URL(url);
	  // Disallow chrome://, about:, file://, data:, etc.
	  const prohibitedProtocols = ['chrome:', 'about:', 'file:', 'data:', 'javascript:', 'extensions:'];
	  if (prohibitedProtocols.includes(urlObj.protocol)) {
		return false;
	  }
	  // Disallow specific domains where content scripts are not allowed
	  const prohibitedDomains = ['chrome.google.com'];
	  if (prohibitedDomains.includes(urlObj.hostname.toLowerCase())) {
		return false;
	  }
	  return true;
	} catch (e) {
	  console.error(`isValidUrl: Invalid URL - ${url}`);
	  return false;
	}
  }
  
  // Handle tab changes
  function handleTabChange(tab) {
	const url = tab.url;
	if (!url) {
	  console.log("handleTabChange: No URL found for the active tab.");
	  return;
	}
  
	console.log(`handleTabChange: Active tab changed to ${url}`);
  
	// Check if URL is allowed for content scripts
	if (!isValidUrl(url)) {
	  console.log(`handleTabChange: URL ${url} is not valid for content scripts.`);
	  return;
	}
  
	// Check if the URL or domain is categorized
	const urlCategorized = isUrlCategorized(url);
	console.log(`handleTabChange: URL categorized? ${urlCategorized}`);
  
	const shouldPrompt = !urlCategorized;
  
	if (shouldPrompt) {
	  console.log(`handleTabChange: Sending promptCategorization message to content script for ${url}`);
	  // Send a message to the content script to prompt categorization
	  chrome.tabs.sendMessage(tab.id, {
		action: "promptCategorization",
		url: url,
		isDomain: false
	  }, (response) => {
		if (chrome.runtime.lastError) {
		  console.error('handleTabChange: Error sending message:', chrome.runtime.lastError.message);
		  // Content script might not be loaded, try injecting it
		  chrome.scripting.executeScript({
			target: { tabId: tab.id },
			files: ['content.js']
		  }, (injectionResults) => {
			if (chrome.runtime.lastError) {
			  console.error('handleTabChange: Failed to inject content script:', chrome.runtime.lastError.message);
			} else if (injectionResults && injectionResults.length > 0) {
			  console.log('handleTabChange: Content script injected, retrying message sending.');
			  // Retry sending the message after injecting
			  chrome.tabs.sendMessage(tab.id, {
				action: "promptCategorization",
				url: url,
				isDomain: false
			  });
			} else {
			  console.error('handleTabChange: Failed to inject content script for unknown reasons.');
			}
		  });
		} else {
		  console.log('handleTabChange: promptCategorization message sent successfully.');
		}
	  });
	}
  
	// Start tracking time
	if (active) {
	  handleTabInactive();
	}
	active = true;
	startTime = Date.now();
	currentUrl = url; // Store the current URL for categorization
	console.log(`handleTabChange: Started tracking time for ${url}`);
  }
  
  function getCategoryForUrl(url) {
	const normalizedUrl = url.toLowerCase();
	if (categoryPreferences.urls && categoryPreferences.urls[normalizedUrl]) {
	  return categoryPreferences.urls[normalizedUrl];
	}
  
	const urlObj = new URL(normalizedUrl);
	const hostname = urlObj.hostname.toLowerCase();
  
	// Check exact domain
	if (categoryPreferences.exactDomains && categoryPreferences.exactDomains[hostname]) {
	  return categoryPreferences.exactDomains[hostname];
	}
  
	if (categoryPreferences.subdomains) {
	  for (const domain in categoryPreferences.subdomains) {
		if (hostname === domain || hostname.endsWith(`.${domain}`)) {
		  return categoryPreferences.subdomains[domain];
		}
	  }
	}
  
	const rootDomain = getRootDomain(hostname);
	if (categoryPreferences.rootDomains && categoryPreferences.rootDomains[rootDomain]) {
	  return categoryPreferences.rootDomains[rootDomain];
	}
  
	// Default to 'neutral' if not categorized
	return 'neutral';
  }
  
  function getRootDomain(hostname) {
	const parts = hostname.split('.').reverse();
	if (parts.length >= 3) {
	  // Handle common second-level domains (e.g., co.uk)
	  const secondLevelDomains = ['co', 'com', 'net', 'org', 'gov', 'ac'];
	  if (secondLevelDomains.includes(parts[1]) && parts.length >= 4) {
		return `${parts[3]}.${parts[2]}.${parts[1]}`;
	  }
	  return `${parts[2]}.${parts[1]}`;
	} else if (parts.length === 2) {
	  return `${parts[1]}.${parts[0]}`;
	}
	return hostname;
  }
  
  // Function to reallocate time from 'uncategorized' to the selected category
  function reallocateTime(url, newCategory, scope) {
	const normalizedUrl = url.toLowerCase();
	const urlObj = new URL(normalizedUrl);
	const hostname = urlObj.hostname.toLowerCase();
	const rootDomain = getRootDomain(hostname);
  
	console.log(`Reallocating time for ${normalizedUrl} to category ${newCategory} with scope ${scope}`);
  
	// For each date in timeData
	for (const date in timeData) {
	  // If 'uncategorized' category exists
	  if (timeData[date]['uncategorized']) {
		const uncategorizedSites = timeData[date]['uncategorized'];
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
			const siteRootDomain = getRootDomain(siteHostname);
			if (siteRootDomain === rootDomain) {
			  matches = true;
			}
		  }
  
		  if (matches) {
			sitesToReallocate[site] = uncategorizedSites[site];
		  }
		}
  
		// Move time from 'uncategorized' to newCategory
		for (const site in sitesToReallocate) {
		  const timeSpent = sitesToReallocate[site];
  
		  // Initialize new category if not exist
		  if (!timeData[date][newCategory]) {
			timeData[date][newCategory] = {};
		  }
		  if (!timeData[date][newCategory][site]) {
			timeData[date][newCategory][site] = 0;
		  }
  
		  timeData[date][newCategory][site] += timeSpent;
  
		  // Remove from 'uncategorized'
		  delete timeData[date]['uncategorized'][site];
  
		  console.log(`Reallocated ${formatTime(timeSpent)} from 'uncategorized' to '${newCategory}' for ${site}`);
		}
  
		// If 'uncategorized' is empty, delete it
		if (Object.keys(timeData[date]['uncategorized']).length === 0) {
		  delete timeData[date]['uncategorized'];
		  console.log(`'uncategorized' category deleted for date ${date}`);
		}
	  }
	}
  
	// Save updated timeData
	chrome.storage.local.set({ timeData }, () => {
	  console.log(`Time data reallocated for ${normalizedUrl} to category ${newCategory}`);
	});
  }
  
  chrome.runtime.onSuspend.addListener(() => {
	handleTabInactive();
  });
  
  // Function to format time (assuming it's defined elsewhere)
  function formatTime(ms) {
	let totalSeconds = Math.floor(ms / 1000);
	const hours = Math.floor(totalSeconds / 3600);
	totalSeconds %= 3600;
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
  
	if (hours > 0) {
	  return `${padZero(hours)}h ${padZero(minutes)}m ${padZero(seconds)}s`;
	} else if (minutes > 0) {
	  return `${padZero(minutes)}m ${padZero(seconds)}s`;
	} else {
	  return `${padZero(seconds)}s`;
	}
  }
  
  function padZero(num) {
	return num.toString().padStart(2, "0");
  }