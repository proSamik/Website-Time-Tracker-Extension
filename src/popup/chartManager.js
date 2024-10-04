// src/popup/chartManager.js

class ChartManager {
	constructor(formatTimeFunction) {
	  this.timeChart = null;
	  this.formatTime = formatTimeFunction;
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
	}
  
	// Chart.js plugin for adding dynamic center text to the doughnut chart
	static centerTextPlugin = {
		id: 'centerText',
		beforeDraw: function (chart) {
		  const centerText = chart.options.plugins.centerText && chart.options.plugins.centerText.text;
		  if (centerText) {
			const ctx = chart.ctx;
			const centerX = (chart.chartArea.left + chart.chartArea.right) / 2;
			const centerY = (chart.chartArea.top + chart.chartArea.bottom) / 2;
	  
			ctx.save();
			ctx.font = 'bold 14px Arial';
			ctx.fillStyle = '#000';
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
	  
			// Split the centerText by newline to handle multiple lines
			const lines = centerText.split('\n');
			const lineHeight = 18; // Adjust as needed
			lines.forEach((line, index) => {
			  ctx.fillText(line, centerX, centerY - (lines.length / 2 - index) * lineHeight);
			});
	  
			ctx.restore();
		  }
		}
	  };
  
	/**
	 * Creates a doughnut chart for category totals with dynamic center text.
	 * @param {Object} categoryTotals - Object containing category names and their total times.
	 */
	createTimeChart(categoryTotals) {
	  const ctx = document.getElementById("timeChart").getContext("2d");
  
	  // Fetch categories from local storage
	  chrome.storage.local.get(['categories', 'oldCategories'], (data) => {
		const categories = data.categories || [];
		const oldCategories = data.oldCategories || [];
		const allCategories = [...categories, ...oldCategories];
  
		// Create a mapping from category names to colors
		const categoryColorMapping = {};
		allCategories.forEach(category => {
		  categoryColorMapping[category.name.toLowerCase()] = category.color;
		});
  
		this.timeChart = new Chart(ctx, {
		  type: "doughnut",
		  data: {
			labels: Object.keys(categoryTotals).map(category => this.capitalize(category)),
			datasets: [{
			  label: 'Time Spent by Category',
			  data: Object.values(categoryTotals).map(time => Math.floor(time / 1000)),
			  backgroundColor: Object.keys(categoryTotals).map(category => categoryColorMapping[category.toLowerCase()] || 'rgba(0, 255, 255, 0.6)'),
			  borderColor: Object.keys(categoryTotals).map(category => {
				const color = categoryColorMapping[category.toLowerCase()] || 'rgba(0, 255, 255, 1)';
				return color.replace(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*[\d.]*\)/, 'rgba($1, $2, $3, 1)');
			  }),
			  borderWidth: 1
			}]
		  },
		  options: {
			responsive: true,
			maintainAspectRatio: false, // Allow CSS to control size
			cutout: '70%', // Creates the hollow center for doughnut chart
			plugins: {
				centerText: {
					text: '' // Initialize with empty text
				  },
			  tooltip: {
				callbacks: {
				  label: (context) => {
					const label = context.label || '';
					const timeInSeconds = context.parsed;
					return `${label}: ${this.formatTime(timeInSeconds * 1000)}`;
				  }
				}
			  },
			  legend: {
				position: 'bottom',
				labels: {
				  boxWidth: 20,
				  padding: 15
				}
			  }
			},
			onClick: (evt, elements) => {
				if (elements.length > 0) {
				  const chartElement = elements[0];
				  const datasetIndex = chartElement.datasetIndex;
				  const index = chartElement.index;
				  const label = this.timeChart.data.labels[index];
				  const value = this.timeChart.data.datasets[datasetIndex].data[index];
		  
				  // Calculate percentage
				  const total = this.timeChart.data.datasets[datasetIndex].data.reduce((a, b) => a + b, 0);
				  const percentage = ((value / total) * 100).toFixed(2);
		  
				  // Update the center text under the correct property
				  this.timeChart.options.plugins.centerText.text = `${label}\n${this.formatTime(value * 1000)}\n${percentage}%`;
				  this.timeChart.update();
				}
			  }
			},
			plugins: [ChartManager.centerTextPlugin]
		});
	  });
	}
  }
  
  // Register the centerText plugin globally
  Chart.register(ChartManager.centerTextPlugin);
  
  // Make ChartManager globally accessible
  window.ChartManager = ChartManager;