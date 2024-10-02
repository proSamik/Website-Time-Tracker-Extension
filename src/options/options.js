// src/options/options.js

document.addEventListener('DOMContentLoaded', () => {
    const loadLogsButton = document.getElementById('load-logs');
    const logDateInput = document.getElementById('log-date');
    const logsContainer = document.getElementById('logs-container');

    // Initialize date input to today's date
    const today = new Date().toISOString().split('T')[0];
    logDateInput.value = today;

    loadLogsButton.addEventListener('click', () => {
        const selectedDate = logDateInput.value;
        if (!selectedDate) {
            alert('Please select a date.');
            return;
        }
        loadLogs(selectedDate);
    });

    // Load logs on initial load
    loadLogs(today);
});

/**
 * Loads logs for the specified date and displays them.
 * @param {string} date - Date in YYYY-MM-DD format.
 */
function loadLogs(date) {
    const logsContainer = document.getElementById('logs-container');
    logsContainer.innerHTML = ''; // Clear previous logs

    chrome.storage.local.get(['timeData', 'categoryPreferences'], (data) => {
        const timeData = data.timeData || {};
        const categoryPreferences = data.categoryPreferences || {};

        if (!timeData[date]) {
            logsContainer.innerHTML = `<div class="no-logs">No logs available for ${formatDateDisplay(date)}.</div>`;
            return;
        }

        const dateData = timeData[date];
        const allLogs = [];

        // Aggregate all logs into a single array
        for (const [category, urls] of Object.entries(dateData)) {
            for (const [url, time] of Object.entries(urls)) {
                allLogs.push({
                    url,
                    time,
                    category
                });
            }
        }

        // Sort logs by last accessed (assuming 'time' is a timestamp)
        allLogs.sort((a, b) => b.time - a.time); // Most recent first

        if (allLogs.length === 0) {
            logsContainer.innerHTML = `<div class="no-logs">No logs available for ${formatDateDisplay(date)}.</div>`;
            return;
        }

        // Display each log item
        allLogs.forEach(log => {
            const logItem = document.createElement('div');
            logItem.classList.add('log-item');

            // URL
            const urlLink = document.createElement('a');
            urlLink.href = log.url;
            urlLink.target = '_blank';
            urlLink.textContent = log.url;
            urlLink.classList.add('log-url');

            // Category Select
            const categorySelect = document.createElement('select');
            categorySelect.classList.add('category-select');

            // Define available categories
            const categories = ['Productive', 'Neutral', 'Entertainment', 'Uncategorized'];

            categories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.toLowerCase();
                option.textContent = cat;
                if (cat.toLowerCase() === log.category.toLowerCase()) {
                    option.selected = true;
                }
                categorySelect.appendChild(option);
            });

            // Update Button
            const updateButton = document.createElement('button');
            updateButton.textContent = 'Update';
            updateButton.classList.add('update-button');

            updateButton.addEventListener('click', () => {
                const newCategory = categorySelect.value;
                if (newCategory === log.category.toLowerCase()) {
                    alert('No changes detected.');
                    return;
                }
                if (confirm(`Are you sure you want to move this URL to ${capitalizeFirstLetter(newCategory)}?`)) {
                    updateLogCategory(log.url, log.category, newCategory, () => {
                        // Update UI
                        log.category = newCategory;
                        alert(`Category updated to ${capitalizeFirstLetter(newCategory)}.`);
                        // Reload logs to reflect changes
                        loadLogs(date);
                    });
                }
            });

            logItem.appendChild(urlLink);
            logItem.appendChild(categorySelect);
            logItem.appendChild(updateButton);

            logsContainer.appendChild(logItem);
        });
    });
}

/**
 * Updates the category of a specific URL in storage.
 * @param {string} url - The URL to update.
 * @param {string} oldCategory - The current category of the URL.
 * @param {string} newCategory - The new category to assign.
 * @param {function} callback - Function to call after update.
 */
function updateLogCategory(url, oldCategory, newCategory, callback) {
    chrome.storage.local.get(['timeData'], (data) => {
        const timeData = data.timeData || {};

        if (!timeData[date]) {
            alert('Error: No data found for the selected date.');
            return;
        }

        // Remove URL from old category
        delete timeData[date][oldCategory][url];
        if (Object.keys(timeData[date][oldCategory]).length === 0) {
            delete timeData[date][oldCategory];
        }

        // Add URL to new category
        if (!timeData[date][newCategory]) {
            timeData[date][newCategory] = {};
        }
        timeData[date][newCategory][url] = Date.now(); // Assuming 'time' is a timestamp

        // Save updated timeData
        chrome.storage.local.set({ timeData }, () => {
            console.log(`Updated category for ${url} from ${oldCategory} to ${newCategory}.`);
            if (callback) callback();
        });
    });
}

/**
 * Formats a date string from YYYY-MM-DD to a more readable format.
 * @param {string} dateStr - Date in YYYY-MM-DD format.
 * @returns {string} Formatted date string.
 */
function formatDateDisplay(dateStr) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const dateObj = new Date(dateStr);
    return dateObj.toLocaleDateString(undefined, options);
}

/**
 * Capitalizes the first letter of a string.
 * @param {string} string - The string to capitalize.
 * @returns {string} Capitalized string.
 */
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
