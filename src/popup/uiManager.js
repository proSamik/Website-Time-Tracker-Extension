// src/popup/UIManager.js

class UIManager {
	constructor(dataFormatter, storageHandler, chartManager, listManager) {
	  this.dataFormatter = dataFormatter;
	  this.storageHandler = storageHandler;
	  this.chartManager = chartManager;
	  this.listManager = listManager;
  
	  this.timeList = document.getElementById("time-list");
	  this.totalTimeElem = document.getElementById("total-time");
	  this.currentDateElem = document.getElementById("current-date");
	  this.prevDayButton = document.getElementById("prev-day");
	  this.nextDayButton = document.getElementById("next-day");
  
	  this.currentDate = new Date();
	  this.availableDates = [];
  
	  this.initialize();
	}
  
	initialize() {
	  // Load time data and set up UI
	  this.storageHandler.loadTimeData((timeData) => {
		this.dataFormatter.timeData = timeData; // Store timeData in dataFormatter for access in ListManager
		this.dataFormatter.currentDate = this.currentDate; // Store currentDate in dataFormatter
  
		this.availableDates = Object.keys(timeData).sort();
  
		if (this.availableDates.length > 0) {
		  // Format currentDate for storage comparison
		  const currentDateString = this.dataFormatter.formatDateForStorage(this.currentDate);
  
		  // If currentDate is not in availableDates, set it to the latest available date
		  if (!this.availableDates.includes(currentDateString)) {
			const latestDateString = this.availableDates[this.availableDates.length - 1];
			this.currentDate = this.dataFormatter.parseStoredDate(latestDateString);
		  }
  
		  // Update display for current date
		  this.updateDisplay();
		} else {
		  // No data available
		  this.totalTimeElem.textContent = 'Total time: 0h 0m 0s';
		  this.timeList.innerHTML = "<li>No data to display.</li>";
		  this.currentDateElem.textContent = 'Date: N/A';
		  this.prevDayButton.disabled = true;
		  this.nextDayButton.disabled = true;
		  return;
		}
	  });
  
	  // Event listeners for navigation buttons
	  	  // Event listeners for navigation buttons
		this.prevDayButton.addEventListener("click", () => {
				this.currentDate = this.findNearestAvailableDate(this.dataFormatter.formatDateForStorage(this.currentDate), -1);
				this.updateDisplay();
		});
  
		this.nextDayButton.addEventListener("click", () => {
				this.currentDate = this.findNearestAvailableDate(this.dataFormatter.formatDateForStorage(this.currentDate), 1);
				this.updateDisplay();
		});
  
	  // Event listeners for action buttons
	  document.getElementById("clearData").addEventListener("click", () => {
		if (confirm("Are you sure you want to clear all time data?")) {
		  this.storageHandler.clearTimeData(() => {
			console.log("All time data cleared.");
			location.reload();
		  });
		}
	  });
  
	  document.getElementById("resetSettings").addEventListener("click", () => {
		if (confirm("Are you sure you want to reset all settings? This will erase all data.")) {
		  chrome.runtime.sendMessage({ action: "resetData" }, (response) => {
			console.log("All settings and data reset.");
			location.reload();
		  });
		}
	  });
  
	  document.getElementById("exportData").addEventListener("click", () => {
		this.exportDataAsCSV();
	  });

	  // Event listener for "Manage Daily Logs" link
	  const openLogsLink = document.getElementById('open-logs');
	  openLogsLink.addEventListener('click', (e) => {
		  e.preventDefault();
		  chrome.tabs.create({ url: chrome.runtime.getURL("src/logs/logs.html") });
	  });

	// Event listener for "Manage Category Preferences" link
	const openCategoryPreferencesLink = document.getElementById('open-category-preferences');
	openCategoryPreferencesLink.addEventListener('click', (e) => {
		e.preventDefault();
		chrome.tabs.create({ url: chrome.runtime.getURL("src/logs/preferences.html") });  // Assuming options.html manages category preferences
	});

	// New Event listener for "Manage Categories" link
	const openManageCategoriesLink = document.getElementById('open-manage-categories');
	openManageCategoriesLink.addEventListener('click', (e) => {
		e.preventDefault();
		chrome.tabs.create({ url: chrome.runtime.getURL("src/logs/categories.html") }); // New categories management page
	});

	}
  
	updateDisplay() {
		if (isNaN(this.currentDate.getTime())) {
		  console.error('Invalid currentDate:', this.currentDate);
		  this.displayNoData();
		  return;
		}
	
		// Clear previous data
		this.timeList.innerHTML = '';
		this.totalTimeElem.textContent = '';
	
		// Destroy previous charts if they exist
		this.chartManager.destroyCharts();
	
		const dateString = this.dataFormatter.formatDateForStorage(this.currentDate);
		const displayDateString = this.dataFormatter.formatDateForDisplay(this.currentDate);
		this.currentDateElem.textContent = `Date: ${displayDateString}`;
	
		// Check and disable navigation buttons
		this.checkNavigationButtons();
	
		// Load time data and categories
		chrome.storage.local.get(["timeData", "categories", "oldCategories"], (data) => {
		  const timeData = data.timeData || {};
		  const categories = data.categories || [];
		  const oldCategories = data.oldCategories || [];
	
		  // Create a mapping from category names to colors
		  const categoryColors = {};
		  const allCategories = categories.concat(oldCategories);
		  allCategories.forEach(category => {
			categoryColors[category.name.toLowerCase()] = category.color;
		  });
	
		  if (timeData[dateString]) {
			const dateData = timeData[dateString];
			const categoryTotals = {};
			let totalTime = 0;
	
			for (const [category, sites] of Object.entries(dateData)) {
			  categoryTotals[category] = 0;
			  for (const time of Object.values(sites)) {
				categoryTotals[category] += time;
				totalTime += time;
			  }
			}
	
			this.totalTimeElem.textContent = `Total time: ${this.dataFormatter.formatTime(totalTime)}`;
	
			this.listManager.renderList(this.timeList, dateData); // No need to pass categoryColors if not used
			this.chartManager.createTimeChart(categoryTotals, categoryColors);
		  } else {
			this.displayNoData();
		  }
		});
	}
	
	  findNearestAvailableDate(currentDateString, direction) {
		const currentIndex = this.availableDates.indexOf(currentDateString);
		let newIndex = currentIndex + direction;
	
		// Move to the next available date if it exists
		while (newIndex >= 0 && newIndex < this.availableDates.length) {
		  if (this.availableDates[newIndex]) {
			const nearestDate = this.dataFormatter.parseStoredDate(this.availableDates[newIndex]);
			return nearestDate;
		  }
		  newIndex += direction;
		}
		return this.currentDate; // Fallback to current date if no available date found
	  }
	
	  checkNavigationButtons() {
		const earliestDate = this.dataFormatter.parseStoredDate(this.availableDates[0]);
		const latestDate = this.dataFormatter.parseStoredDate(this.availableDates[this.availableDates.length - 1]);
	
		this.prevDayButton.disabled = this.currentDate <= earliestDate;
		this.nextDayButton.disabled = this.currentDate >= latestDate;
	  }
	
	  displayNoData() {
		this.totalTimeElem.textContent = 'Total time: 0h 0m 0s';
		this.timeList.innerHTML = "<li>No data to display.</li>";
		this.currentDateElem.textContent = 'Date: N/A';
		this.prevDayButton.disabled = true;
		this.nextDayButton.disabled = true;
	  }
  
	  exportDataAsCSV() {
		const exportRange = document.getElementById("exportRange").value; // Get selected range
		const startDate = new Date(this.currentDate); // Start from current date for the export
		const endDate = new Date(this.currentDate);
	  
		// Adjust dates based on the selected export range
		if (exportRange === "day") {
		  // No change needed; export only the current day
		} else if (exportRange === "week") {
		  startDate.setDate(startDate.getDate() - startDate.getDay()); // Start of the week
		} else if (exportRange === "month") {
		  startDate.setDate(1); // Start of the month
		} else if (exportRange === "year") {
		  startDate.setMonth(0); // Start of the year
		  startDate.setDate(1);
		}
	  
		// Retrieve time data
		chrome.storage.local.get("timeData", (data) => {
		  const timeData = data.timeData || {};
		  let csvContent = "Year,Month,Date,Category,Time Spent (ms),URL\n";
	  
		  for (const [date, categories] of Object.entries(timeData)) {
			const dateObj = new Date(date);
			// Filter based on selected range
			if (this.isDateInRange(dateObj, startDate, endDate, exportRange)) {
			  for (const [category, sites] of Object.entries(categories)) {
				for (const [url, timeSpent] of Object.entries(sites)) {
				  // Escape quotes and commas in URLs
				  const escapedUrl = `"${url.replace(/"/g, '""')}"`;
				  const row = `${dateObj.getFullYear()},${dateObj.getMonth() + 1},${dateObj.getDate()},${this.dataFormatter.capitalize(category)},${timeSpent},${escapedUrl}`;
				  csvContent += row + "\n";
				}
			  }
			}
		  }
	  
		  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		  const localTimestamp = new Date().toLocaleTimeString().replace(/:/g, '-'); // Replace colons for filename compatibility
		  const filename = `time_data_${this.dataFormatter.formatDateForStorage(this.currentDate)}_${localTimestamp}.csv`;
	  
		  if (navigator.msSaveBlob) { // IE 10+
			navigator.msSaveBlob(blob, filename);
		  } else {
			const link = document.createElement("a");
			if (link.download !== undefined) { // feature detection
			  const url = URL.createObjectURL(blob);
			  link.setAttribute("href", url);
			  link.setAttribute("download", filename);
			  link.style.visibility = 'hidden';
			  document.body.appendChild(link);
			  link.click();
			  document.body.removeChild(link);
			  console.log("Data exported as CSV.");
			}
		  }
		});
	  }
	  
	  // Function to check if a date falls within a specific range
	  isDateInRange(date, startDate, endDate, range) {
		if (range === "day") {
		  return date.toDateString() === startDate.toDateString();
		} else if (range === "week") {
		  return date >= startDate && date < new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
		} else if (range === "month") {
		  return date.getFullYear() === startDate.getFullYear() && date.getMonth() === startDate.getMonth();
		} else if (range === "year") {
		  return date.getFullYear() === startDate.getFullYear();
		}
		return false;
	  }
  }
  
  // Export the UIManager class
  window.UIManager = UIManager;
  