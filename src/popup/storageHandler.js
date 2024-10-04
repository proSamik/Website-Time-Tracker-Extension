// src/popup/StorageHandler.js

class StorageHandler {
	constructor() {
	  this.timeData = {};
	  this.loadTimeData();
	}
  
	loadTimeData(callback) {
	  chrome.storage.local.get("timeData", (data) => {
		this.timeData = data.timeData || {};
		console.log("StorageHandler: timeData loaded:", this.timeData);
		if (callback) callback(this.timeData);
	  });
	}
  
	saveTimeData(timeData) {
	  chrome.storage.local.set({ timeData }, () => {
		console.log("StorageHandler: timeData saved:", timeData);
	  });
	}
  
	clearTimeData(callback) {
	  chrome.storage.local.set({ timeData: {} }, () => {
		console.log("StorageHandler: timeData cleared.");
		this.timeData = {};
		if (callback) callback();
	  });
	}
  
	resetSettings(callback) {
	  chrome.storage.local.clear(() => {
		console.log("StorageHandler: All settings and data reset.");
		this.timeData = {};
		// Send message to background script to reinitialize
		chrome.runtime.sendMessage({ action: 'initialize' }, (response) => {
		  if (callback) callback();
		});
	  });
	}
  }
  
  // Make StorageHandler globally accessible
  window.StorageHandler = new StorageHandler();