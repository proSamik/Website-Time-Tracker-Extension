// src/popup/DataFormatter.js

class DataFormatter {
	constructor() {
	  this.timeData = {}; // To be populated by UIManager
	  this.currentDate = new Date(); // To be updated by UIManager
	}
  
	parseStoredDate(dateString) {
	  const [year, month, day] = dateString.split('-').map(Number);
	  return new Date(year, month - 1, day);
	}
  
	formatDateForDisplay(dateObj) {
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
  
	formatDateForStorage(dateObj) {
	  const year = dateObj.getFullYear();
	  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
	  const day = String(dateObj.getDate()).padStart(2, '0');
	  return `${year}-${month}-${day}`;
	}
  
	formatTime(ms) {
	  let totalSeconds = Math.floor(ms / 1000);
	  const hours = Math.floor(totalSeconds / 3600);
	  totalSeconds %= 3600;
	  const minutes = Math.floor((totalSeconds % 3600) / 60);
	  const seconds = totalSeconds % 60;
  
	  if (hours > 0) {
		return `${this.padZero(hours)}h ${this.padZero(minutes)}m ${this.padZero(seconds)}s`;
	  } else if (minutes > 0) {
		return `${this.padZero(minutes)}m ${this.padZero(seconds)}s`;
	  } else {
		return `${this.padZero(seconds)}s`;
	  }
	}
  
	padZero(num) {
	  return num.toString().padStart(2, "0");
	}
  
	capitalize(str) {
	  if (typeof str !== 'string') return '';
	  return str.charAt(0).toUpperCase() + str.slice(1);
	}
  
	getDomainFromUrl(url) {
	  try {
		const urlObj = new URL(url);
		return urlObj.hostname;
	  } catch (e) {
		console.error('DataFormatter: Invalid URL:', url);
		return url;
	  }
	}
  
	getRootDomain(url) {
	  try {
		const urlObj = new URL(url);
		const hostname = urlObj.hostname;
		const parts = hostname.split('.');
		if (parts.length > 2) {
		  return parts.slice(-2).join('.');
		}
		return hostname;
	  } catch (e) {
		console.error('DataFormatter: Invalid URL for getRootDomain:', url);
		return '';
	  }
	}
  }
  
  // Export the DataFormatter class
  window.DataFormatter = new DataFormatter();
  