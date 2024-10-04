// src/popup/listManager.js

class ListManager {
	constructor(dataFormatter) {
	  this.dataFormatter = dataFormatter;
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
  
	  // Calculate overall total time once and pass it to functions that need it
	  const overallTotal = this.calculateOverallTotal(dateData);
  
	  // Fetch categories from local storage
	  chrome.storage.local.get(['categories', 'oldCategories'], (data) => {
		const categories = data.categories || [];
		const oldCategories = data.oldCategories || [];
		const allCategories = [...categories, ...oldCategories];
  
		// Create a mapping from category names to colors (if needed in the future)
		const categoryColorMapping = {};
		allCategories.forEach(category => {
		  categoryColorMapping[category.name.toLowerCase()] = category.color;
		});
  
		for (const [category, categoryData] of Object.entries(dateData)) {
		  // Aggregate domains
		  const aggregatedDomains = this.aggregateDomains(categoryData);
  
		  // Sort domains by total time descending
		  const sortedDomains = Object.entries(aggregatedDomains).sort((a, b) => b[1].totalTime - a[1].totalTime);
  
		  // Select top N domains (N = this.displayLimit)
		  const topDomains = sortedDomains.slice(0, this.displayLimit);
		  const remainingDomains = sortedDomains.slice(this.displayLimit);
  
		  // Create category section table
		  const categoryTable = document.createElement('table');
		  categoryTable.classList.add('category-table');
  
		  // Create category header row (Row 1)
		  const categoryHeader = document.createElement('tr');
		  const categoryHeading = document.createElement('th');
		  categoryHeading.setAttribute('colspan', '3'); // Span across all columns
  
		  // Calculate category total time and percentage
		  const categoryTotalTime = this.calculateTotalTime(categoryData);
		  const categoryPercentage = overallTotal > 0 ? ((categoryTotalTime / overallTotal) * 100).toFixed(2) : '0.00';
  
		  // Update category heading to include the percentage
		  categoryHeading.textContent = `${this.dataFormatter.capitalize(category)}: ${categoryPercentage}%`;
		  categoryHeader.appendChild(categoryHeading);
		  categoryTable.appendChild(categoryHeader);
  
		  // Create column headers (Row 2)
		  const columnHeaders = document.createElement('tr');
		  ['URL', 'Percentage', 'Time Spent'].forEach(text => {
			const th = document.createElement('th');
			th.textContent = text;
			columnHeaders.appendChild(th);
		  });
		  categoryTable.appendChild(columnHeaders);
  
		  // Function to render domain rows
		  const renderDomainRows = (domains, insertBeforeElement) => {
			domains.forEach(([rootDomain, data]) => {
			  const domainRow = document.createElement('tr');
  
			  // Column 1: URL
			  const domainCell = document.createElement('td');
			  domainCell.textContent = rootDomain;
			  domainCell.classList.add('url-cell'); // Add class to style URL column
			  domainRow.appendChild(domainCell);
  
			  // Column 2: Percentage
			  const percentageCell = document.createElement('td');
			  const domainPercentage = this.calculatePercentage(data.totalTime, overallTotal);
			  percentageCell.textContent = `${domainPercentage}%`;
			  domainRow.appendChild(percentageCell);
  
			  // Column 3: Time Spent
			  const timeCell = document.createElement('td');
			  timeCell.textContent = this.dataFormatter.formatTime(data.totalTime);
			  domainRow.appendChild(timeCell);
  
			  // Add click event listener to open the transparent card
			  domainRow.addEventListener('click', () => {
				this.openDomainDetails(rootDomain, data.subdomains);
			  });
  
			  // Append domain row to table before the specified element
			  categoryTable.insertBefore(domainRow, insertBeforeElement);
			});
		  };
  
		  // Add top N domains
		  renderDomainRows(topDomains, null); // Insert at the end before buttons
  
		  // Create Show More/Show Less button row
		  if (remainingDomains.length > 0) {
			const buttonRow = document.createElement('tr');
			const buttonCell = document.createElement('td');
			buttonCell.setAttribute('colspan', '3');
			buttonCell.style.textAlign = 'center'; // Center align the buttons
  
			// Create Show More button
			const showMoreButton = document.createElement('button');
			showMoreButton.textContent = 'Show More';
			showMoreButton.classList.add('show-more-button');
  
			// Create Show Less button (hidden initially)
			const showLessButton = document.createElement('button');
			showLessButton.textContent = 'Show Less';
			showLessButton.classList.add('show-less-button');
			showLessButton.style.display = 'none'; // Hidden initially
  
			// Append buttons to the cell
			buttonCell.appendChild(showMoreButton);
			buttonCell.appendChild(showLessButton);
			buttonRow.appendChild(buttonCell);
			categoryTable.appendChild(buttonRow);
  
			// Add event listeners for buttons
			showMoreButton.addEventListener('click', () => {
			  // Render remaining domains before the button row
			  renderDomainRows(remainingDomains, buttonRow);
			  showMoreButton.style.display = 'none';
			  showLessButton.style.display = 'inline-block';
			});
  
			showLessButton.addEventListener('click', () => {
			  // Remove the remaining domains
			  remainingDomains.forEach(([rootDomain, _]) => {
				// Find all rows with the rootDomain and remove them
				const rows = categoryTable.querySelectorAll('tr');
				rows.forEach(row => {
				  const cell = row.querySelector('td.url-cell');
				  if (cell && cell.textContent === rootDomain) {
					categoryTable.removeChild(row);
				  }
				});
			  });
			  showMoreButton.style.display = 'inline-block';
			  showLessButton.style.display = 'none';
			});
  
			// Apply styles to the buttons to match table header
			showMoreButton.style.backgroundColor = '#f4f4f4'; // Same as table header
			showMoreButton.style.color = '#00215E'; // Navy Blue
			showMoreButton.style.border = '1px solid #00215E';
			showMoreButton.style.borderRadius = '4px';
			showMoreButton.style.marginRight = '5px';
  
			showLessButton.style.backgroundColor = '#f4f4f4'; // Same as table header
			showLessButton.style.color = '#00215E'; // Navy Blue
			showLessButton.style.border = '1px solid #00215E';
			showLessButton.style.borderRadius = '4px';
		  }
  
		  // Add total row for the category (Row n)
		  const totalRow = document.createElement('tr');
		  const totalLabel = document.createElement('td');
		  totalLabel.textContent = 'Total';
		  totalLabel.setAttribute('colspan', '2'); // Span two columns
		  totalRow.appendChild(totalLabel);
  
		  const totalTimeCell = document.createElement('td');
		  totalTimeCell.textContent = this.dataFormatter.formatTime(categoryTotalTime);
		  totalRow.appendChild(totalTimeCell);
  
		  // Append total row to the table
		  categoryTable.appendChild(totalRow);
  
		  // Append category table to the container
		  container.appendChild(categoryTable);
		}
	  });
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
	  const title = document.createElement('h4');
	  title.textContent = `Details for ${this.getDomainTitle(rootDomain)}`; // Domain Title
	  title.style.color = '#00215E'; // Navy Blue
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
	 * Calculates the overall total time across all categories.
	 * @param {Object} dateData - The time data for the selected date.
	 * @returns {number} Overall total time in milliseconds.
	 */
	calculateOverallTotal(dateData) {
	  let overallTotal = 0;
	  for (const categoryData of Object.values(dateData)) {
		for (const time of Object.values(categoryData)) {
		  overallTotal += time;
		}
	  }
	  return overallTotal;
	}

	/**
	 * Calculates the percentage of time for a domain.
	 * @param {number} domainTime - Time spent on the domain.
	 * @param {number} overallTotal - Overall total time spent.
	 * @returns {string} Percentage string.
	 */
	calculatePercentage(domainTime, overallTotal) {
	  const percentage = overallTotal > 0 ? ((domainTime / overallTotal) * 100).toFixed(2) : '0.00';
	  return `${percentage}`;
	}
}

// Export the ListManager class
window.ListManager = ListManager;
