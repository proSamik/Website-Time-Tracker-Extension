// options.js

document.addEventListener("DOMContentLoaded", () => {
  const trackedSitesInput = document.getElementById("trackedSites");
  const saveButton = document.getElementById("saveButton");
  const resetButton = document.getElementById("resetButton");

  // Load current tracked sites
  chrome.storage.local.get("trackedSites", (data) => {
    const trackedSites = data.trackedSites || [];
    trackedSitesInput.value = trackedSites.join('\n');
  });

  // Save button event listener
  saveButton.addEventListener("click", () => {
    const trackedSites = trackedSitesInput.value.split('\n').map(site => site.trim()).filter(site => site !== '');
    chrome.storage.local.set({ trackedSites }, () => {
      alert("Tracked sites updated.");
    });
  });

  // Reset button event listener
  resetButton.addEventListener("click", () => {
    if (confirm("Are you sure you want to reset all settings? This will erase all data.")) {
      chrome.storage.local.clear(() => {
        alert("All settings have been reset.");
        trackedSitesInput.value = '';
      });
    }
  });
});