// src/background/utils.js

export function getCurrentDate() {
	const today = new Date();
	return today.toISOString().split('T')[0];
  }
  
  export function formatTime(ms) {
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
  
  export function padZero(num) {
	return num.toString().padStart(2, "0");
  }
  
  export function getRootDomain(hostname) {
	const parts = hostname.split('.').reverse();
	if (parts.length >= 3) {
	  const secondLevelDomains = ['co', 'com', 'net', 'org', 'gov', 'ac'];
	  if (secondLevelDomains.includes(parts[1]) && parts.length >= 4) {
		return `${parts[3]}.${parts[2]}.${parts[1]}`;
	  }
	  return `${parts[2]}.${parts[1]}`;
	} else if (parts.length === 2) {
	  return `${parts[1]}.${parts[0]}`;
	}
	return hostname;
  }
