// src/logs/logs.js

document.addEventListener('DOMContentLoaded', () => {
    const loadLogsButton = document.getElementById('load-logs');
    const logDateInput = document.getElementById('log-date');
    const moveSelectedButton = document.getElementById('move-selected');
    const moveCategorySelect = document.getElementById('move-category');
    const goToPreferencesButton = document.getElementById('go-to-preferences'); 


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

    // Event listener for moving selected URLs
    moveSelectedButton.addEventListener('click', () => {
        const selectedCategory = moveCategorySelect.value;
        if (!selectedCategory) {
            alert('Please select a target category to move the selected URLs.');
            return;
        }
        moveSelectedLogs(selectedCategory);
    });

     // Event listener for "Manage Preferences" button to navigate to preferences.html
     goToPreferencesButton.addEventListener('click', () => {
        window.location.href = 'preferences.html';  // Navigate to the preferences page
    });
});

/**
 * Loads logs for the specified date and displays them.
 * @param {string} date - Date in YYYY-MM-DD format.
 */
function loadLogs(date) {
    // Get the individual category lists
    const productiveList = document.getElementById('productive-list');
    const neutralList = document.getElementById('neutral-list');
    const entertainmentList = document.getElementById('entertainment-list');
    const uncategorizedList = document.getElementById('uncategorized-list');

    // Clear existing lists
    productiveList.innerHTML = '';
    neutralList.innerHTML = '';
    entertainmentList.innerHTML = '';
    uncategorizedList.innerHTML = '';

    chrome.storage.local.get(['timeData'], (data) => {
        const timeData = data.timeData || {};

        console.log(`Fetching logs for date: ${date}`);
        console.log('Retrieved timeData:', timeData);

        if (!timeData[date]) {
            const formattedDate = formatDateDisplay(date);
            productiveList.innerHTML = `<li class="no-logs">No logs available for ${formattedDate}.</li>`;
            neutralList.innerHTML = `<li class="no-logs">No logs available for ${formattedDate}.</li>`;
            entertainmentList.innerHTML = `<li class="no-logs">No logs available for ${formattedDate}.</li>`;
            uncategorizedList.innerHTML = `<li class="no-logs">No logs available for ${formattedDate}.</li>`;
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

        console.log('All Logs before sorting:', allLogs);

        // Sort logs by last accessed (descending)
        allLogs.sort((a, b) => b.time - a.time); // Most recent first

        console.log('All Logs after sorting:', allLogs);

        if (allLogs.length === 0) {
            const formattedDate = formatDateDisplay(date);
            productiveList.innerHTML = `<li class="no-logs">No logs available for ${formattedDate}.</li>`;
            neutralList.innerHTML = `<li class="no-logs">No logs available for ${formattedDate}.</li>`;
            entertainmentList.innerHTML = `<li class="no-logs">No logs available for ${formattedDate}.</li>`;
            uncategorizedList.innerHTML = `<li class="no-logs">No logs available for ${formattedDate}.</li>`;
            return;
        }

        // Categorize logs
        const categorizedLogs = {
            productive: [],
            neutral: [],
            entertainment: [],
            uncategorized: []
        };

        allLogs.forEach(log => {
            const category = log.category.toLowerCase();
            if (categorizedLogs.hasOwnProperty(category)) {
                categorizedLogs[category].push(log);
            } else {
                categorizedLogs['uncategorized'].push(log);
            }
        });

        console.log('Categorized Logs:', categorizedLogs);

        // Populate each category column
        populateCategoryList('productive', categorizedLogs['productive']);
        populateCategoryList('neutral', categorizedLogs['neutral']);
        populateCategoryList('entertainment', categorizedLogs['entertainment']);
        populateCategoryList('uncategorized', categorizedLogs['uncategorized']);

        console.log('Logs successfully loaded and displayed.');
    });
}

/**
 * Populates a specific category list with logs.
 * @param {string} category - The category name (productive, neutral, entertainment, uncategorized).
 * @param {Array} logs - Array of log objects.
 */
function populateCategoryList(category, logs) {
    const listElement = document.getElementById(`${category}-list`);

    if (logs.length === 0) {
        const emptyMsg = document.createElement('li');
        emptyMsg.textContent = 'No URLs in this category.';
        emptyMsg.classList.add('no-logs');
        listElement.appendChild(emptyMsg);
        return;
    }

    logs.forEach(log => {
        const logItem = document.createElement('li');
        logItem.classList.add('log-item');

        // Checkbox
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.classList.add('log-checkbox');
        checkbox.dataset.url = log.url;
        checkbox.dataset.category = category;

        // URL Link
        const urlLink = document.createElement('a');
        urlLink.href = log.url;
        urlLink.target = '_blank';
        urlLink.textContent = log.url;
        urlLink.classList.add('log-url');

        // Append checkbox and URL to the list item
        logItem.appendChild(checkbox);
        logItem.appendChild(urlLink);

        listElement.appendChild(logItem);
    });
}

/**
 * Moves selected logs to the specified category.
 * @param {string} targetCategory - The category to move selected URLs to.
 */
function moveSelectedLogs(targetCategory) {
    const checkboxes = document.querySelectorAll('.log-checkbox:checked');
    if (checkboxes.length === 0) {
        alert('Please select at least one URL to move.');
        return;
    }

    const selectedUrls = Array.from(checkboxes).map(cb => ({
        url: cb.dataset.url,
        oldCategory: cb.dataset.category
    }));

    console.log(`Selected URLs to move:`, selectedUrls);

    // Confirmation Prompt
    if (!confirm(`Are you sure you want to move ${selectedUrls.length} selected URL(s) to ${capitalizeFirstLetter(targetCategory)}?`)) {
        return;
    }

    const currentDate = getCurrentDate();
    console.log(`Moving selected URLs to category: ${targetCategory} for date: ${currentDate}`);

    chrome.storage.local.get(['timeData'], (data) => {
        const timeData = data.timeData || {};

        if (!timeData[currentDate]) {
            alert('No data found for the selected date.');
            return;
        }

        selectedUrls.forEach(item => {
            const { url, oldCategory } = item;
            const time = timeData[currentDate][oldCategory][url]; // Preserve original time

            // Remove URL from old category
            delete timeData[currentDate][oldCategory][url];
            if (Object.keys(timeData[currentDate][oldCategory]).length === 0) {
                delete timeData[currentDate][oldCategory];
            }

            // Add URL to target category with preserved time
            if (!timeData[currentDate][targetCategory]) {
                timeData[currentDate][targetCategory] = {};
            }
            timeData[currentDate][targetCategory][url] = time; // Preserve the original time

            console.log(`Moved URL: ${url} from ${oldCategory} to ${targetCategory} with time: ${time}`);
        });

        // Save updated timeData
        chrome.storage.local.set({ timeData }, () => {
            console.log(`Moved ${selectedUrls.length} URLs to ${capitalizeFirstLetter(targetCategory)}.`);
            alert(`Moved ${selectedUrls.length} URLs to ${capitalizeFirstLetter(targetCategory)}.`);
            // Reload logs to reflect changes
            loadLogs(currentDate);
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

/**
 * Retrieves the currently selected date from the date input.
 * @returns {string} Date in YYYY-MM-DD format.
 */
function getCurrentDate() {
    const logDateInput = document.getElementById('log-date');
    return logDateInput.value;
}
