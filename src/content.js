class PromptManager {
	constructor() {
		this.promptId = 'time-tracker-prompt';
		this.colorMapping = {};
		this.fetchCategories(); // Fetch categories when initialized
	}
  
	fetchCategories() {
		// Fetch categories from local storage
		chrome.storage.local.get(["categories"], (data) => {
			const categories = data.categories || [];
			this.colorMapping = categories.reduce((map, category) => {
				map[category.name.toLowerCase()] = category.color;
				return map;
			}, {});

			console.log("PromptManager: Fetched categories and colors", this.colorMapping);
		});
	}
  
	showPrompt(url) {
		// Prevent displaying multiple prompts
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
			backgroundColor: '#ffffff', // Changed to white for better contrast
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
			fontWeight: 'bold',
			color: '#00215E' // Navy Blue for text
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
			marginBottom: '10px',
			padding: '5px',
			borderRadius: '4px',
			border: '1px solid #ccc'
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
  
		// Fetch categories from local storage and dynamically add buttons
		chrome.storage.local.get(['categories'], (data) => {
			const categories = data.categories || [];
  
			// Dynamically add buttons for all categories except "Uncategorized"
			categories.forEach((category) => {
				if (category.name.toLowerCase() !== "uncategorized") { // Skip Uncategorized
					const button = document.createElement('button');
					button.textContent = category.name;
					Object.assign(button.style, {
						margin: '5px 0',
						flex: '1 1 30%',
						padding: '8px',
						backgroundColor: category.color,
						color: 'white',
						border: 'none',
						borderRadius: '4px',
						cursor: 'pointer',
						fontSize: '14px',
						transition: 'background-color 0.3s'
					});
					button.addEventListener('click', () => {
						const selectedScope = scopeSelect.value;
						// Send the selection back to background.js
						chrome.runtime.sendMessage({
							action: 'saveCategorization',
							url: url,
							category: category.name.toLowerCase(),
							scope: selectedScope
						}, () => {
							if (chrome.runtime.lastError) {
								console.error('PromptManager: Error sending saveCategorization message:', chrome.runtime.lastError.message);
							} else {
								console.log(`PromptManager: Categorization saved for ${url}: ${category.name} (${selectedScope})`);
							}
						});
						// Remove the prompt
						document.body.removeChild(promptContainer);
					});
					buttonsContainer.appendChild(button);
				}
			});
		});
  
		// Append the prompt to the body
		document.body.appendChild(promptContainer);
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

// Initialize the PromptManager
const promptManager = new PromptManager();

// Listen for messages from background scripts to display the prompt
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.action === "promptCategorization") {
		console.log(`Content: Received promptCategorization for URL: ${request.url}`);
		promptManager.showPrompt(request.url);
		sendResponse({ status: 'prompt_shown' });
	}
});