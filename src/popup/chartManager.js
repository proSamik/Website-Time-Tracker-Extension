// src/popup/ChartManager.js

class ChartManager {
	constructor() {
	  this.timeChart = null;
	  this.timeChartPerSite = null;
	}
  
	// Helper function to capitalize the first letter of a string
	capitalize(str) {
	  if (typeof str !== 'string') return '';
	  return str.charAt(0).toUpperCase() + str.slice(1);
	}
  
	destroyCharts() {
	  if (this.timeChart && typeof this.timeChart.destroy === 'function') {
		this.timeChart.destroy();
		this.timeChart = null;
	  }
	  if (this.timeChartPerSite && typeof this.timeChartPerSite.destroy === 'function') {
		this.timeChartPerSite.destroy();
		this.timeChartPerSite = null;
	  }
	}
  
	createTimeChart(categoryTotals) {
	  const ctx = document.getElementById("timeChart").getContext("2d");
	  this.timeChart = new Chart(ctx, {
		type: "pie",
		data: {
		  labels: Object.keys(categoryTotals).map(category => this.capitalize(category)),
		  datasets: [{
			label: 'Time Spent by Category',
			data: Object.values(categoryTotals).map(time => Math.floor(time / 1000)),
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
	}
  
	createTimeChartPerSite(siteLabels, siteDataPoints, siteBackgroundColors, siteBorderColors) {
	  const ctxSite = document.getElementById("timeChartPerSite").getContext("2d");
	  this.timeChartPerSite = new Chart(ctxSite, {
		type: "pie",
		data: {
		  labels: siteLabels,
		  datasets: [{
			label: 'Time Spent by Site',
			data: siteDataPoints,
			backgroundColor: siteBackgroundColors,
			borderColor: siteBorderColors,
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
	}
  }
  
  // Make ChartManager globally accessible
  window.ChartManager = new ChartManager();
  