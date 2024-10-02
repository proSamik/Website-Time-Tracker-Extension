// src/popup/listManager.js

class ListManager {
	constructor(dataFormatter, colorMapping) {
	  this.dataFormatter = dataFormatter;
	  this.colorMapping = colorMapping;
	  this.displayLimit = 5; // Number of top groups to display initially
	  this.expandedCategories = {}; // Tracks which categories have been expanded
	  this.currentCard = null; 
	}
  
	/**
	 * Processes raw time data to aggregate domains under their root domains.
	 * @param {Object} categoryData - Time data for a specific category.
	 * @returns {Object} Aggregated data with root domains.
	 */
	aggregateDomains(categoryData) {
	  const aggregated = {};
  
	  for (const [site, time] of Object.entries(categoryData)) {
		const rootDomain = this.dataFormatter.getRootDomain(site);
		if (!aggregated[rootDomain]) {
		  aggregated[rootDomain] = {
			totalTime: 0,
			subdomains: {}
		  };
		}
		aggregated[rootDomain].totalTime += time;
  
		if (!aggregated[rootDomain].subdomains[site]) {
		  aggregated[rootDomain].subdomains[site] = 0;
		}
		aggregated[rootDomain].subdomains[site] += time;
	  }
  
	  return aggregated;
	}
  
	/**
	 * Renders the categorized list with aggregated domains.
	 * @param {HTMLElement} container - The DOM element to render the list into.
	 * @param {Object} dateData - The time data for the selected date.
	 */
	renderList(container, dateData) {
	  container.innerHTML = ''; // Clear existing content
  
	  for (const [category, categoryData] of Object.entries(dateData)) {
		// Aggregate domains
		const aggregatedDomains = this.aggregateDomains(categoryData);
  
		// Sort domains by total time descending
		const sortedDomains = Object.entries(aggregatedDomains).sort((a, b) => b[1].totalTime - a[1].totalTime);
  
		// Select top N domains
		const topDomains = sortedDomains.slice(0, this.displayLimit);
		const remainingDomains = sortedDomains.slice(this.displayLimit);
  
		// Create category section
		const categorySection = document.createElement('div');
		categorySection.classList.add('category-section');
  
		// Category Header
		const categoryHeader = document.createElement('h3');
		categoryHeader.textContent = `${this.dataFormatter.capitalize(category)}: ${this.formatPercentage(categoryData)} (${this.dataFormatter.formatTime(this.calculateTotalTime(categoryData))})`;
		categorySection.appendChild(categoryHeader);
  
		// Domains List
		const domainsList = document.createElement('ul');
		domainsList.classList.add('domains-list');
  
		topDomains.forEach(([rootDomain, data]) => {
		  const domainItem = this.createDomainItem(rootDomain, data);
		  domainsList.appendChild(domainItem);
		});
  
		categorySection.appendChild(domainsList);
  
		// Show More Button if there are remaining domains
		if (remainingDomains.length > 0) {
		  const showMoreButton = document.createElement('button');
		  showMoreButton.textContent = 'Show More';
		  showMoreButton.classList.add('show-more-button');
		  showMoreButton.addEventListener('click', () => {
			this.toggleShowMore(category, sortedDomains, domainsList, showMoreButton);
		  });
		  categorySection.appendChild(showMoreButton);
		}
  
		container.appendChild(categorySection);
	  }
	}
  
	/**
	 * Creates a list item for a root domain with its aggregated data.
	 * @param {string} rootDomain - The root domain name.
	 * @param {Object} data - Aggregated data for the root domain.
	 * @returns {HTMLElement} The list item element.
	 */
	createDomainItem(rootDomain, data) {
	  const domainItem = document.createElement('li');
	  domainItem.classList.add('domain-item');
  
	  // Domain Header
	  const domainHeader = document.createElement('div');
	  domainHeader.classList.add('domain-header');
	  domainHeader.textContent = `${rootDomain}: ${this.calculatePercentage(data.totalTime)} (${this.dataFormatter.formatTime(data.totalTime)})`;
	  domainHeader.style.color = '#000000'; // Black text
	  domainHeader.style.cursor = 'pointer';
	  domainHeader.style.fontWeight = 'bold';
	  domainHeader.addEventListener('click', () => {
		this.openDomainDetails(rootDomain, data.subdomains);
	  });
  
	  domainItem.appendChild(domainHeader);
  
	  return domainItem;
	}
  
	/**
	 * Opens a transparent card displaying a table of all subdomains.
	 * @param {string} rootDomain - The root domain name.
	 * @param {Object} subdomains - The subdomains data.
	 */
	openDomainDetails(rootDomain, subdomains) {

		// If a card already exists, remove it
		if (this.currentCard) {
			document.body.removeChild(this.currentCard);
			this.currentCard = null;
		}

	  // Create the transparent card
	  const card = document.createElement('div');
	  card.classList.add('transparent-card');
  
	  // Close button
	  const closeButton = document.createElement('span');
	  closeButton.innerHTML = '&times;';
	  closeButton.classList.add('close-button');
	  closeButton.addEventListener('click', () => {
		document.body.removeChild(card);
		this.currentCard = null;
	  });
	  card.appendChild(closeButton);
  
	  // Card Title
	  const title = document.createElement('h2');
	  title.textContent = `Details for ${this.getDomainTitle(rootDomain)}`; // Domain Title
	  title.style.color = '#000000'; // Black text
	  card.appendChild(title);
  
	  // Subdomains Table
	  const table = document.createElement('table');
  
	  // Table Header
	  const thead = document.createElement('thead');
	  const headerRow = document.createElement('tr');
	  const th1 = document.createElement('th');
	  th1.textContent = 'Subdomain';
	  const th2 = document.createElement('th');
	  th2.textContent = 'Time Spent';
	  headerRow.appendChild(th1);
	  headerRow.appendChild(th2);
	  thead.appendChild(headerRow);
	  table.appendChild(thead);
  
	  // Table Body
	  const tbody = document.createElement('tbody');
  
	  // Sort subdomains by time descending
	  const sortedSubdomains = Object.entries(subdomains).sort((a, b) => b[1] - a[1]);
  
	  sortedSubdomains.forEach(([subdomain, time]) => {
		const row = document.createElement('tr');
		const td1 = document.createElement('td');
		td1.textContent = subdomain;
		const td2 = document.createElement('td');
		td2.textContent = this.dataFormatter.formatTime(time);
		row.appendChild(td1);
		row.appendChild(td2);
		tbody.appendChild(row);
	  });
  
	  table.appendChild(tbody);
	  card.appendChild(table);
  
	  // Append the card to the body
	  document.body.appendChild(card);
	  this.currentCard = card;
	}
  
	/**
	 * Returns a human-readable domain title.
	 * For simplicity, this function capitalizes the first letter.
	 * You can enhance this function to fetch actual titles if needed.
	 * @param {string} domain - The domain name.
	 * @returns {string} Domain title.
	 */
	getDomainTitle(domain) {
	  return this.dataFormatter.capitalize(domain);
	}
  
	/**
	 * Toggles the display of more domains within a category.
	 * @param {string} category - The category name.
	 * @param {Array} sortedDomains - The sorted list of domains.
	 * @param {HTMLElement} domainsList - The DOM element of the domains list.
	 * @param {HTMLElement} showMoreButton - The "Show More" button element.
	 */
	toggleShowMore(category, sortedDomains, domainsList, showMoreButton) {
	  if (this.expandedCategories[category]) {
		// Collapse to show top domains only
		const topDomains = sortedDomains.slice(0, this.displayLimit);
		domainsList.innerHTML = '';
		topDomains.forEach(([rootDomain, data]) => {
		  const domainItem = this.createDomainItem(rootDomain, data);
		  domainsList.appendChild(domainItem);
		});
		showMoreButton.textContent = 'Show More';
		this.expandedCategories[category] = false;
	  } else {
		// Expand to show all domains
		domainsList.innerHTML = '';
		sortedDomains.forEach(([rootDomain, data]) => {
		  const domainItem = this.createDomainItem(rootDomain, data);
		  domainsList.appendChild(domainItem);
		});
		showMoreButton.textContent = 'Show Less';
		this.expandedCategories[category] = true;
	  }
	}
  
	/**
	 * Calculates the total time for a category.
	 * @param {Object} categoryData - Time data for a specific category.
	 * @returns {number} Total time in milliseconds.
	 */
	calculateTotalTime(categoryData) {
	  let total = 0;
	  for (const time of Object.values(categoryData)) {
		total += time;
	  }
	  return total;
	}
  
	/**
	 * Calculates the percentage of time for a category.
	 * @param {Object} categoryData - Time data for a specific category.
	 * @returns {string} Percentage string.
	 */
	formatPercentage(categoryData) {
	  const total = this.calculateTotalTime(categoryData);
	  const overallTotal = this.calculateOverallTotal();
	  const percentage = overallTotal > 0 ? ((total / overallTotal) * 100).toFixed(2) : '0.00';
	  return `${percentage}%`;
	}
  
	/**
	 * Calculates the overall total time across all categories.
	 * @returns {number} Overall total time in milliseconds.
	 */
	calculateOverallTotal() {
	  let overallTotal = 0;
	  const currentDateStr = this.dataFormatter.formatDateForStorage(this.dataFormatter.currentDate);
	  const dateData = this.dataFormatter.timeData[currentDateStr] || {};
  
	  for (const [category, categoryData] of Object.entries(dateData)) {
		for (const time of Object.values(categoryData)) {
		  overallTotal += time;
		}
	  }
	  return overallTotal;
	}
  
	/**
	 * Calculates the percentage of time for a domain.
	 * @param {number} domainTime - Time spent on the domain.
	 * @returns {string} Percentage string.
	 */
	calculatePercentage(domainTime) {
	  const overallTotal = this.calculateOverallTotal();
	  const percentage = overallTotal > 0 ? ((domainTime / overallTotal) * 100).toFixed(2) : '0.00';
	  return `${percentage}%`;
	}
  }
  
  // Export the ListManager class
  window.ListManager = ListManager;
  