// src/popup/popup.js

document.addEventListener("DOMContentLoaded", () => {
	// Instantiate the helper classes
	const dataFormatter = new DataFormatter();
	const storageHandler = new StorageHandler();
	const chartManager = new ChartManager(window.colorMapping, dataFormatter.formatTime.bind(dataFormatter));
	const listManager = new ListManager(dataFormatter, window.colorMapping);
  
	// Instantiate the UIManager with dependencies
	const uiManager = new UIManager(dataFormatter, storageHandler, chartManager, listManager);
  });
  