// content.js

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.action === "promptCategorization") {
	  showCategorizationPrompt(request.url);
	}
  });
  
  function showCategorizationPrompt(url) {
	// Check if the prompt is already displayed
	if (document.getElementById("time-tracker-prompt")) {
	  return;
	}
  
	// Extract the domain name from the URL
	const domainName = getDomainFromUrl(url);
  
	// Create the prompt container
	const promptContainer = document.createElement("div");
	promptContainer.id = "time-tracker-prompt";
	promptContainer.style.position = "fixed";
	promptContainer.style.bottom = "20px";
	promptContainer.style.right = "20px";
	promptContainer.style.backgroundColor = "#fff";
	promptContainer.style.border = "1px solid #ccc";
	promptContainer.style.padding = "15px";
	promptContainer.style.zIndex = "9999";
	promptContainer.style.fontSize = "14px";
	promptContainer.style.boxShadow = "0 0 10px rgba(0,0,0,0.2)";
	promptContainer.style.borderRadius = "8px";
	promptContainer.style.maxWidth = "300px";
	promptContainer.style.fontFamily = "Arial, sans-serif";
  
	// Prompt message with domain name and full URL as tooltip
	const message = document.createElement("p");
	message.textContent = `Categorize URL: ${domainName}`;
	message.title = url; // Full URL shown on hover
	message.style.margin = "0 0 10px 0";
	message.style.fontWeight = "bold";
	promptContainer.appendChild(message);
  
	// Scope selection
	const scopeLabel = document.createElement("p");
	scopeLabel.textContent = "Apply to:";
	scopeLabel.style.marginTop = "10px";
	promptContainer.appendChild(scopeLabel);
  
	const scopeSelect = document.createElement("select");
	scopeSelect.style.width = "100%";
	scopeSelect.style.marginBottom = "10px";
  
	const options = [
	  { value: "url", text: "Only this URL (this page)" }, // Default option
	  { value: "exact", text: `Only ${new URL(url).hostname}` },
	  { value: "subdomains", text: `All subdomains of ${getRootDomain(url)}` },
	  { value: "domain", text: `Entire domain ${getRootDomain(url)}` }
	];
  
	options.forEach((opt) => {
	  const option = document.createElement("option");
	  option.value = opt.value;
	  option.textContent = opt.text;
	  scopeSelect.appendChild(option);
	});
  
	// Set default selected option to "Only this URL"
	scopeSelect.value = "url";
  
	promptContainer.appendChild(scopeSelect);
  
	// Category buttons container
	const buttonsContainer = document.createElement("div");
	buttonsContainer.style.display = "flex";
	buttonsContainer.style.justifyContent = "space-between";
	buttonsContainer.style.flexWrap = "wrap";
	promptContainer.appendChild(buttonsContainer);
  
	// Category buttons
	["Productive", "Neutral", "Entertainment"].forEach((category) => {
	  const button = document.createElement("button");
	  button.textContent = category;
	  button.style.margin = "5px 0";
	  button.style.flex = "1 1 30%";
	  button.style.padding = "8px";
	  button.style.backgroundColor = categoryButtonColor(category);
	  button.style.color = "white";
	  button.style.border = "none";
	  button.style.borderRadius = "4px";
	  button.style.cursor = "pointer";
	  button.style.fontSize = "14px";
	  button.addEventListener("click", () => {
		const selectedScope = scopeSelect.value;
		// Send the selection back to background.js
		chrome.runtime.sendMessage({
		  action: "saveCategorization",
		  url: url,
		  category: category.toLowerCase(),
		  scope: selectedScope
		}, () => {
		  if (chrome.runtime.lastError) {
			console.error('Error sending saveCategorization message:', chrome.runtime.lastError.message);
		  } else {
			console.log(`Categorization saved for ${url}: ${category} (${selectedScope})`);
		  }
		});
		// Remove the prompt
		document.body.removeChild(promptContainer);
	  });
	  buttonsContainer.appendChild(button);
	});
  
	// Close button
	const closeButton = document.createElement("span");
	closeButton.textContent = "✖"; // Cross mark
	closeButton.style.position = "absolute";
	closeButton.style.top = "5px";
	closeButton.style.right = "10px";
	closeButton.style.cursor = "pointer";
	closeButton.style.fontSize = "16px";
	closeButton.style.color = "#888";
	closeButton.addEventListener("click", () => {
	  document.body.removeChild(promptContainer);
	  console.log("Categorization prompt closed by user.");
	});
	promptContainer.appendChild(closeButton);
  
	// Append the prompt to the body
	document.body.appendChild(promptContainer);
  }
  
  function categoryButtonColor(category) {
	switch (category.toLowerCase()) {
	  case 'productive':
		return '#4CAF50'; // Green
	  case 'neutral':
		return '#FFC107'; // Amber
	  case 'entertainment':
		return '#F44336'; // Red
	  default:
		return '#607D8B'; // Blue Grey
	}
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
  
  function getRootDomain(url) {
	const hostname = new URL(url).hostname;
	const parts = hostname.split('.');
	if (parts.length > 2) {
	  return parts.slice(-2).join('.');
	}
	return hostname;
  }