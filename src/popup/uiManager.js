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
	  this.prevDayButton.addEventListener("click", () => {
		this.currentDate.setDate(this.currentDate.getDate() - 1);
		this.updateDisplay();
	  });
  
	  this.nextDayButton.addEventListener("click", () => {
		this.currentDate.setDate(this.currentDate.getDate() + 1);
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
		  this.storageHandler.resetSettings(() => {
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
	}
  
	updateDisplay() {
	  // Ensure currentDate is valid
	  if (isNaN(this.currentDate.getTime())) {
		console.error('Invalid currentDate:', this.currentDate);
		this.totalTimeElem.textContent = 'Total time: 0h 0m 0s';
		this.timeList.innerHTML = "<li>No data for this date.</li>";
		return;
	  }
  
	  // Clear previous data
	  this.timeList.innerHTML = '';
	  this.totalTimeElem.textContent = '';
  
	  // Destroy previous charts if they exist
	  this.chartManager.destroyCharts();
  
	  // Format dates
	  const dateString = this.dataFormatter.formatDateForStorage(this.currentDate); // For data lookup
	  const displayDateString = this.dataFormatter.formatDateForDisplay(this.currentDate); // For display to user
	  this.currentDateElem.textContent = `Date: ${displayDateString}`;
  
	  // Disable/Enable navigation buttons
	  const earliestDate = this.dataFormatter.parseStoredDate(this.availableDates[0]);
	  const latestDate = this.dataFormatter.parseStoredDate(this.availableDates[this.availableDates.length - 1]);
  
	  this.prevDayButton.disabled = this.currentDate <= earliestDate;
	  this.nextDayButton.disabled = this.currentDate >= latestDate;
  
	  // Load time data
	  chrome.storage.local.get("timeData", (data) => {
		const timeData = data.timeData || {};
  
		if (timeData[dateString]) {
		  const dateData = timeData[dateString];
		  const categoryTotals = {};
		  let totalTime = 0;
  
		  // Calculate total time per category
		  for (const [category, sites] of Object.entries(dateData)) {
			categoryTotals[category] = 0;
			for (const time of Object.values(sites)) {
			  categoryTotals[category] += time;
			  totalTime += time;
			}
		  }
  
		  this.totalTimeElem.textContent = `Total time: ${this.dataFormatter.formatTime(totalTime)}`;
  
		  // Render the categorized list using ListManager
		  this.listManager.renderList(this.timeList, dateData);
  
		  // Create the category chart
		  this.chartManager.createTimeChart(categoryTotals);
  
		  // Removed site chart creation
  
		} else {
		  this.totalTimeElem.textContent = 'Total time: 0h 0m 0s';
		  const listItem = document.createElement("li");
		  listItem.textContent = "No data for this date.";
		  this.timeList.appendChild(listItem);
		}
	  });
	}
  
	exportDataAsCSV() {
	  chrome.storage.local.get("timeData", (data) => {
		const timeData = data.timeData || {};
		let csvContent = "Date,Category,URL,Time Spent (ms)\n";
  
		for (const [date, categories] of Object.entries(timeData)) {
		  for (const [category, sites] of Object.entries(categories)) {
			for (const [url, timeSpent] of Object.entries(sites)) {
			  // Escape quotes and commas in URLs
			  const escapedUrl = `"${url.replace(/"/g, '""')}"`;
			  const row = `${date},${this.dataFormatter.capitalize(category)},${escapedUrl},${timeSpent}`;
			  csvContent += row + "\n";
			}
		  }
		}
  
		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		const timestamp = new Date().toISOString().split('T')[0];
		const filename = `time_data_${timestamp}.csv`;
  
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
  }
  
  // Export the UIManager class
  window.UIManager = UIManager;
  