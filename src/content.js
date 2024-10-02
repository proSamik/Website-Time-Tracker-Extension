// src/content.js

class PromptManager {
	constructor(colorMapping) {
	  this.promptId = 'time-tracker-prompt';
	  this.colorMapping = colorMapping; // Use the same color mapping
	}
  
	showPrompt(url) {
	  // Check if the prompt is already displayed
	  if (document.getElementById(this.promptId)) {
		console.log('PromptManager: Prompt already displayed.');
		return;
	  }
  
	  // Extract the domain name from the URL
	  const domainName = this.getDomainFromUrl(url);
  
	  // Create the prompt container
	  const promptContainer = document.createElement('div');
	  promptContainer.id = this.promptId;
	  Object.assign(promptContainer.style, {
		position: 'fixed',
		bottom: '20px',
		right: '20px',
		backgroundColor: '#fff',
		border: '1px solid #ccc',
		padding: '15px',
		zIndex: '9999',
		fontSize: '14px',
		boxShadow: '0 0 10px rgba(0,0,0,0.2)',
		borderRadius: '8px',
		maxWidth: '300px',
		fontFamily: 'Arial, sans-serif',
		cursor: 'default'
	  });
  
	  // Close button
	  const closeButton = document.createElement('span');
	  closeButton.textContent = '✖';
	  Object.assign(closeButton.style, {
		position: 'absolute',
		top: '5px',
		right: '10px',
		cursor: 'pointer',
		fontSize: '16px',
		color: '#888'
	  });
	  closeButton.addEventListener('click', () => {
		document.body.removeChild(promptContainer);
		console.log('PromptManager: Prompt closed by user.');
	  });
	  promptContainer.appendChild(closeButton);
  
	  // Prompt message with domain name and full URL as tooltip
	  const message = document.createElement('p');
	  message.textContent = `Categorize URL: ${domainName}`;
	  message.title = url; // Full URL shown on hover
	  Object.assign(message.style, {
		margin: '0 0 10px 0',
		fontWeight: 'bold'
	  });
	  promptContainer.appendChild(message);
  
	  // Scope selection
	  const scopeLabel = document.createElement('p');
	  scopeLabel.textContent = 'Apply to:';
	  scopeLabel.style.marginTop = '10px';
	  promptContainer.appendChild(scopeLabel);
  
	  const scopeSelect = document.createElement('select');
	  Object.assign(scopeSelect.style, {
		width: '100%',
		marginBottom: '10px'
	  });
  
	  const options = [
		{ value: 'url', text: 'Only this URL (this page)' },
		{ value: 'exact', text: `Only ${new URL(url).hostname}` },
		{ value: 'subdomains', text: `All subdomains of ${this.getRootDomain(url)}` },
		{ value: 'domain', text: `Entire domain ${this.getRootDomain(url)}` }
	  ];
  
	  options.forEach(opt => {
		const option = document.createElement('option');
		option.value = opt.value;
		option.textContent = opt.text;
		scopeSelect.appendChild(option);
	  });
  
	  scopeSelect.value = 'url'; // Default selection
	  promptContainer.appendChild(scopeSelect);
  
	  // Category buttons container
	  const buttonsContainer = document.createElement('div');
	  Object.assign(buttonsContainer.style, {
		display: 'flex',
		justifyContent: 'space-between',
		flexWrap: 'wrap'
	  });
	  promptContainer.appendChild(buttonsContainer);
  
	  // Category buttons
	  ['Productive', 'Neutral', 'Entertainment'].forEach(category => {
		const button = document.createElement('button');
		button.textContent = category;
		Object.assign(button.style, {
		  margin: '5px 0',
		  flex: '1 1 30%',
		  padding: '8px',
		  backgroundColor: this.categoryButtonColor(category),
		  color: 'white',
		  border: 'none',
		  borderRadius: '4px',
		  cursor: 'pointer',
		  fontSize: '14px'
		});
		button.addEventListener('click', () => {
		  const selectedScope = scopeSelect.value;
		  // Send the selection back to background.js
		  chrome.runtime.sendMessage({
			action: 'saveCategorization',
			url: url,
			category: category.toLowerCase(),
			scope: selectedScope
		  }, () => {
			if (chrome.runtime.lastError) {
			  console.error('PromptManager: Error sending saveCategorization message:', chrome.runtime.lastError.message);
			} else {
			  console.log(`PromptManager: Categorization saved for ${url}: ${category} (${selectedScope})`);
			}
		  });
		  // Remove the prompt
		  document.body.removeChild(promptContainer);
		});
		buttonsContainer.appendChild(button);
	  });
  
	  // Append the prompt to the body
	  document.body.appendChild(promptContainer);
	}
  
	categoryButtonColor(category) {
	  switch (category.toLowerCase()) {
		case 'productive':
		  return '#4CAF50'; // Green
		case 'neutral':
		  return '#FFC107'; // Amber
		case 'entertainment':
		  return '#F44336'; // Red
		default:
		  return '#00BCD4'; // Cyan for Uncategorized
	  }
	}
  
	getDomainFromUrl(url) {
	  try {
		const urlObj = new URL(url);
		return urlObj.hostname;
	  } catch (e) {
		console.error('PromptManager: Invalid URL:', url);
		return '';
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
		console.error('PromptManager: Invalid URL for getRootDomain:', url);
		return '';
	  }
	}
  }
  
  // Centralized color mapping (same as ChartManager)
  const colorMapping = {
	productive: 'rgba(75, 192, 192, 0.6)',      // Green
	neutral: 'rgba(255, 206, 86, 0.6)',        // Yellow
	entertainment: 'rgba(255, 99, 132, 0.6)',  // Red
	uncategorized: 'rgba(0, 255, 255, 0.6)'    // Cyan
  };
  
  const promptManager = new PromptManager(colorMapping);
  
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.action === "promptCategorization") {
	  console.log(`Content: Received promptCategorization for URL: ${request.url}`);
	  promptManager.showPrompt(request.url);
	  sendResponse({ status: 'prompt_shown' }); // Send a response back
	  // No need to return true since the response is sent synchronously
	}
  });
  