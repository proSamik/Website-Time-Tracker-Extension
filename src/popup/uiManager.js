// src/popup/UIManager.js

class UIManager {
	constructor(dataFormatter, storageHandler, chartManager) {
	  this.dataFormatter = dataFormatter;
	  this.storageHandler = storageHandler;
	  this.chartManager = chartManager;
  
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
  
		  // Display time per category and sites
		  for (const [category, timeSpent] of Object.entries(categoryTotals)) {
			if (timeSpent > 0) {
			  const percentage = totalTime > 0 ? ((timeSpent / totalTime) * 100).toFixed(2) : 0;
  
			  const categoryHeader = document.createElement("h4");
			  categoryHeader.textContent = `${this.dataFormatter.capitalize(category)}: ${percentage}% (${this.dataFormatter.formatTime(timeSpent)})`;
			  this.timeList.appendChild(categoryHeader);
  
			  const sitesList = document.createElement("ul");
			  sitesList.style.listStyleType = "none";
			  sitesList.style.paddingLeft = "10px";
  
			  // List sites under this category
			  const sites = dateData[category];
			  for (const [site, siteTime] of Object.entries(sites)) {
				const sitePercentage = timeSpent > 0 ? ((siteTime / timeSpent) * 100).toFixed(2) : 0;
  
				const siteItem = document.createElement("li");
				const siteLink = document.createElement("a");
				siteLink.href = "#";
				siteLink.style.textDecoration = "none";
				siteLink.style.color = "inherit";
  
				// Display only the domain name
				const domainName = this.dataFormatter.getDomainFromUrl(site);
				siteLink.textContent = `${domainName}: ${sitePercentage}% (${this.dataFormatter.formatTime(siteTime)})`;
  
				// Set the full URL as the title attribute for hover tooltip
				siteLink.title = site;
  
				// Click to toggle between domain and full URL
				let showingFullUrl = false;
				siteLink.addEventListener("click", (e) => {
				  e.preventDefault();
				  showingFullUrl = !showingFullUrl;
				  if (showingFullUrl) {
					siteLink.textContent = `${site}: ${sitePercentage}% (${this.dataFormatter.formatTime(siteTime)})`;
				  } else {
					siteLink.textContent = `${domainName}: ${sitePercentage}% (${this.dataFormatter.formatTime(siteTime)})`;
				  }
				});
  
				siteItem.appendChild(siteLink);
				sitesList.appendChild(siteItem);
			  }
			  this.timeList.appendChild(sitesList);
			}
		  }
  
		  // Create the category chart
		  this.chartManager.createTimeChart(categoryTotals);
  
		  // Prepare data for site chart
		  const siteLabels = [];
		  const siteDataPoints = [];
		  const siteBackgroundColors = [];
		  const siteBorderColors = [];
		  const categoryColors = {
			productive: 'rgba(75, 192, 192, 0.6)',
			neutral: 'rgba(255, 206, 86, 0.6)',
			entertainment: 'rgba(255, 99, 132, 0.6)',
			uncategorized: 'rgba(201, 203, 207, 0.6)',
		  };
		  const categoryBorderColors = {
			productive: 'rgba(75, 192, 192, 1)',
			neutral: 'rgba(255, 206, 86, 1)',
			entertainment: 'rgba(255, 99, 132, 1)',
			uncategorized: 'rgba(201, 203, 207, 1)',
		  };
  
		  for (const [category, sites] of Object.entries(dateData)) {
			for (const [site, timeSpent] of Object.entries(sites)) {
			  const domainName = this.dataFormatter.getDomainFromUrl(site);
			  siteLabels.push(domainName); // Use domain name for labels
			  siteDataPoints.push(Math.floor(timeSpent / 1000));
			  siteBackgroundColors.push(categoryColors[category] || 'rgba(201, 203, 207, 0.6)');
			  siteBorderColors.push(categoryBorderColors[category] || 'rgba(201, 203, 207, 1)');
			}
		  }
  
		  // Create the site chart
		  this.chartManager.createTimeChartPerSite(siteLabels, siteDataPoints, siteBackgroundColors, siteBorderColors);
  
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
  
  // Attach UIManager to the window object
  window.UIManager = UIManager;
  