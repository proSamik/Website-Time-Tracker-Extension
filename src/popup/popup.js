// popup.js

// Helper functions

function parseStoredDate(dateString) {
	const [year, month, day] = dateString.split('-').map(Number);
	return new Date(year, month - 1, day);
  }
  
  function formatDateForDisplay(dateObj) {
	const locale = navigator.language; // Get user's locale
	const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
	const formatter = new Intl.DateTimeFormat(locale, options);
	const formatParts = formatter.formatToParts(dateObj);
	let dateParts = [];
	for (let part of formatParts) {
	  if (part.type === 'year' || part.type === 'month' || part.type === 'day') {
		dateParts.push(part.value);
	  }
	}
	return dateParts.join('-');
  }
  
  function formatDateForStorage(dateObj) {
	const year = dateObj.getFullYear();
	const month = String(dateObj.getMonth() + 1).padStart(2, '0');
	const day = String(dateObj.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
  }
  
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
  
  function capitalize(str) {
	return str.charAt(0).toUpperCase() + str.slice(1);
  }
  
  function getDomainFromUrl(url) {
	try {
	  const urlObj = new URL(url);
	  return urlObj.hostname;
	} catch (e) {
	  console.error('Invalid URL:', url);
	  return url;
	}
  }
  
  document.addEventListener("DOMContentLoaded", () => {
	// Initialize charts
	let timeChart = null;
	let timeChartPerSite = null;
  
	const timeList = document.getElementById("time-list");
	const totalTimeElem = document.getElementById("total-time");
	const currentDateElem = document.getElementById("current-date");
	const prevDayButton = document.getElementById("prev-day");
	const nextDayButton = document.getElementById("next-day");
  
	let currentDate = new Date();
	let availableDates = [];
  
	// Retrieve time data from storage
	chrome.storage.local.get("timeData", (data) => {
	  const timeData = data.timeData || {};
  
	  // Get array of available dates
	  availableDates = Object.keys(timeData).sort();
  
	  if (availableDates.length > 0) {
		// Format currentDate for storage comparison
		const currentDateString = formatDateForStorage(currentDate);
  
		// If currentDate is not in availableDates, set it to the latest available date
		if (!availableDates.includes(currentDateString)) {
		  const latestDateString = availableDates[availableDates.length - 1];
		  currentDate = parseStoredDate(latestDateString);
		}
  
		// Update display for current date
		updateDisplay();
	  } else {
		// No data available
		totalTimeElem.textContent = 'Total time: 0h 0m 0s';
		timeList.innerHTML = "<li>No data to display.</li>";
		currentDateElem.textContent = 'Date: N/A';
		prevDayButton.disabled = true;
		nextDayButton.disabled = true;
		return;
	  }
  
	  // Event listeners for navigation buttons
	  prevDayButton.addEventListener("click", () => {
		currentDate.setDate(currentDate.getDate() - 1);
		updateDisplay();
	  });
  
	  nextDayButton.addEventListener("click", () => {
		currentDate.setDate(currentDate.getDate() + 1);
		updateDisplay();
	  });
  
	  function updateDisplay() {
		// Ensure currentDate is valid
		if (isNaN(currentDate.getTime())) {
		  console.error('Invalid currentDate:', currentDate);
		  totalTimeElem.textContent = 'Total time: 0h 0m 0s';
		  timeList.innerHTML = "<li>No data for this date.</li>";
		  return;
		}
  
		// Clear previous data
		timeList.innerHTML = '';
		totalTimeElem.textContent = '';
  
		// Destroy previous charts if they exist
		if (timeChart && typeof timeChart.destroy === 'function') {
		  timeChart.destroy();
		}
		if (timeChartPerSite && typeof timeChartPerSite.destroy === 'function') {
		  timeChartPerSite.destroy();
		}
  
		// Format dates
		const dateString = formatDateForStorage(currentDate); // For data lookup
		const displayDateString = formatDateForDisplay(currentDate); // For display to user
		currentDateElem.textContent = `Date: ${displayDateString}`;
  
		// Disable/Enable navigation buttons
		const earliestDate = parseStoredDate(availableDates[0]);
		const latestDate = parseStoredDate(availableDates[availableDates.length - 1]);
  
		prevDayButton.disabled = currentDate <= earliestDate;
		nextDayButton.disabled = currentDate >= latestDate;
  
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
  
		  totalTimeElem.textContent = `Total time: ${formatTime(totalTime)}`;
  
		  // Display time per category and sites
		  for (const [category, timeSpent] of Object.entries(categoryTotals)) {
			if (timeSpent > 0) {
			  const percentage = totalTime > 0 ? ((timeSpent / totalTime) * 100).toFixed(2) : 0;
  
			  const categoryHeader = document.createElement("h4");
			  categoryHeader.textContent = `${capitalize(category)}: ${percentage}% (${formatTime(timeSpent)})`;
			  timeList.appendChild(categoryHeader);
  
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
				const domainName = getDomainFromUrl(site);
				siteLink.textContent = `${domainName}: ${sitePercentage}% (${formatTime(siteTime)})`;
  
				// Set the full URL as the title attribute for hover tooltip
				siteLink.title = site;
  
				// Click to toggle between domain and full URL
				let showingFullUrl = false;
				siteLink.addEventListener("click", (e) => {
				  e.preventDefault();
				  showingFullUrl = !showingFullUrl;
				  if (showingFullUrl) {
					siteLink.textContent = `${site}: ${sitePercentage}% (${formatTime(siteTime)})`;
				  } else {
					siteLink.textContent = `${domainName}: ${sitePercentage}% (${formatTime(siteTime)})`;
				  }
				});
  
				siteItem.appendChild(siteLink);
				sitesList.appendChild(siteItem);
			  }
			  timeList.appendChild(sitesList);
			}
		  }
  
		  // Create the category chart
		  const ctx = document.getElementById("timeChart").getContext("2d");
		  timeChart = new Chart(ctx, {
			type: "pie",
			data: {
			  labels: Object.keys(categoryTotals).map(capitalize),
			  datasets: [{
				label: 'Time Spent by Category',
				data: Object.values(categoryTotals).map((time) => Math.floor(time / 1000)),
				backgroundColor: [
				  'rgba(75, 192, 192, 0.6)',      // Productive - Green
				  'rgba(255, 206, 86, 0.6)',      // Neutral - Yellow
				  'rgba(255, 99, 132, 0.6)',      // Entertainment - Red
				  'rgba(201, 203, 207, 0.6)',     // Uncategorized - Gray
				],
				borderColor: [
				  'rgba(75, 192, 192, 1)',
				  'rgba(255, 206, 86, 1)',
				  'rgba(255, 99, 132, 1)',
				  'rgba(201, 203, 207, 1)',
				],
				borderWidth: 1
			  }]
			},
			options: {
			  responsive: true,
			  plugins: {
				tooltip: {
				  callbacks: {
					label: function (context) {
					  let timeInSeconds = context.parsed;
					  return formatTime(timeInSeconds * 1000);
					}
				  }
				}
			  }
			}
		  });
  
		  // Prepare data for site chart
		  const siteLabels = [];
		  const siteDataPoints = [];
		  const siteBackgroundColors = [];
		  const siteBorderColorsArray = [];
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
			  const domainName = getDomainFromUrl(site);
			  siteLabels.push(domainName); // Use domain name for labels
			  siteDataPoints.push(Math.floor(timeSpent / 1000));
			  siteBackgroundColors.push(categoryColors[category] || 'rgba(201, 203, 207, 0.6)');
			  siteBorderColorsArray.push(categoryBorderColors[category] || 'rgba(201, 203, 207, 1)');
			}
		  }
  
		  // Create the site chart
		  const ctxSite = document.getElementById("timeChartPerSite").getContext("2d");
		  timeChartPerSite = new Chart(ctxSite, {
			type: "pie",
			data: {
			  labels: siteLabels,
			  datasets: [{
				label: 'Time Spent by Site',
				data: siteDataPoints,
				backgroundColor: siteBackgroundColors,
				borderColor: siteBorderColorsArray,
				borderWidth: 1
			  }]
			},
			options: {
			  responsive: true,
			  plugins: {
				tooltip: {
				  callbacks: {
					label: function (context) {
					  let label = context.label || '';
					  let timeInSeconds = context.parsed;
					  return `${label}: ${formatTime(timeInSeconds * 1000)}`;
					}
				  }
				}
			  }
			}
		  });
  
		} else {
		  totalTimeElem.textContent = 'Total time: 0h 0m 0s';
		  const listItem = document.createElement("li");
		  listItem.textContent = "No data for this date.";
		  timeList.appendChild(listItem);
		}
	  }
	});
  
	// Event listener for the Clear Data button
	document.getElementById("clearData").addEventListener("click", () => {
	  if (confirm("Are you sure you want to clear all time data?")) {
		chrome.storage.local.set({ timeData: {} }, () => {
		  console.log("All time data cleared.");
		  location.reload();
		});
	  }
	});
  
	// Event listener for the Reset Settings button
	document.getElementById("resetSettings").addEventListener("click", () => {
	  if (confirm("Are you sure you want to reset all settings? This will erase all data.")) {
		chrome.storage.local.clear(() => {
		  console.log("All settings and data reset.");
		  location.reload();
		});
	  }
	});
  
	// Event listener for the Export Data button
	document.getElementById("exportData").addEventListener("click", () => {
	  exportDataAsCSV();
	});
  
	// Function to export data as CSV
	function exportDataAsCSV() {
	  chrome.storage.local.get("timeData", (data) => {
		const timeData = data.timeData || {};
		let csvContent = "Date,Category,URL,Time Spent (ms)\n";
  
		for (const [date, categories] of Object.entries(timeData)) {
		  for (const [category, sites] of Object.entries(categories)) {
			for (const [url, timeSpent] of Object.entries(sites)) {
			  // Escape quotes and commas in URLs
			  const escapedUrl = `"${url.replace(/"/g, '""')}"`;
			  const row = `${date},${capitalize(category)},${escapedUrl},${timeSpent}`;
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
  });