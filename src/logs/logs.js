// src/logs/logs.js

document.addEventListener('DOMContentLoaded', () => {
    const loadLogsButton = document.getElementById('load-logs');
    const logDateInput = document.getElementById('log-date');
    const moveSelectedButton = document.getElementById('move-selected');
    const moveCategorySelect = document.getElementById('move-category');
    const goToPreferencesButton = document.getElementById('go-to-preferences'); 
    const goToCategoriesButton = document.getElementById('go-to-categories');

    // Initialize date input to today's date
    const today = new Date().toISOString().split('T')[0];
    logDateInput.value = today;

    // Fetch all categories for moveCategorySelect
    chrome.storage.local.get(['categories', 'oldCategories'], (data) => {
        const categories = data.categories || [];
        const oldCategories = data.oldCategories || [];
        const allCategories = [...categories, ...oldCategories];

        initializeMoveCategorySelect(allCategories);

        // Load logs on initial load
        loadLogs(today);

        loadLogsButton.addEventListener('click', () => {
            const selectedDate = logDateInput.value;
            if (!selectedDate) {
                alert('Please select a date.');
                return;
            }
            loadLogs(selectedDate);
        });

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

        goToCategoriesButton.addEventListener('click', () => {
            window.location.href = 'categories.html';
        });
    });
});

/**
 * Initializes the move category select options.
 * @param {Array} categories - Array of category objects.
 */
function initializeMoveCategorySelect(categories) {
    const moveCategorySelect = document.getElementById('move-category');
    moveCategorySelect.innerHTML = ''; // Clear existing options

    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.disabled = true;
    defaultOption.selected = true;
    defaultOption.textContent = 'Move selected to...';
    moveCategorySelect.appendChild(defaultOption);

    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.name.toLowerCase();
        option.textContent = capitalizeFirstLetter(category.name);
        moveCategorySelect.appendChild(option);
    });

    // Ensure 'uncategorized' option exists
    if (!categories.some(category => category.name.toLowerCase() === 'uncategorized')) {
        const option = document.createElement('option');
        option.value = 'uncategorized';
        option.textContent = 'Uncategorized';
        moveCategorySelect.appendChild(option);
    }
}

/**
 * Loads logs for the specified date and displays them.
 * @param {string} date - Date in YYYY-MM-DD format.
 */
function loadLogs(date) {
    chrome.storage.local.get(['timeData'], (data) => {
        const timeData = data.timeData || {};

        console.log(`Fetching logs for date: ${date}`);
        console.log('Retrieved timeData:', timeData);

        if (!timeData[date]) {
            const formattedDate = formatDateDisplay(date);
            const logsContainer = document.getElementById('logs-container');
            logsContainer.innerHTML = `<p>No logs available for ${formattedDate}.</p>`;
            return;
        }

        const dateData = timeData[date];

        // Get categories from dateData
        const categoriesForDate = Object.keys(dateData).map(categoryName => {
            return { name: categoryName };
        });

        // Initialize category columns based on categoriesForDate
        initializeCategoryColumns(categoriesForDate);

        // Get category lists dynamically
        const categoryLists = {};

        categoriesForDate.forEach(category => {
            const categoryName = category.name.toLowerCase();
            categoryLists[categoryName] = document.getElementById(`${categoryName}-list`);
            // Clear existing lists
            categoryLists[categoryName].innerHTML = '';
        });

        // Ensure 'uncategorized' list exists
        if (!categoryLists['uncategorized'] && dateData['uncategorized']) {
            const uncategorizedList = document.getElementById('uncategorized-list');
            if (uncategorizedList) {
                categoryLists['uncategorized'] = uncategorizedList;
                uncategorizedList.innerHTML = '';
            }
        }

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

        // Sort logs by time spent (descending)
        allLogs.sort((a, b) => b.time - a.time); // Longest time first

        console.log('All Logs after sorting:', allLogs);

        if (allLogs.length === 0) {
            const formattedDate = formatDateDisplay(date);
            Object.values(categoryLists).forEach(list => {
                list.innerHTML = `<li class="no-logs">No logs available for ${formattedDate}.</li>`;
            });
            return;
        }

        // Categorize logs dynamically
        const categorizedLogs = {};

        // Initialize categorizedLogs for each category
        categoriesForDate.forEach(category => {
            const categoryName = category.name.toLowerCase();
            categorizedLogs[categoryName] = [];
        });

        // Also handle 'uncategorized' if present
        if (dateData['uncategorized']) {
            categorizedLogs['uncategorized'] = [];
        }

        allLogs.forEach(log => {
            const category = log.category.toLowerCase();
            if (categorizedLogs.hasOwnProperty(category)) {
                categorizedLogs[category].push(log);
            } else {
                // Handle uncategorized logs
                if (!categorizedLogs['uncategorized']) {
                    categorizedLogs['uncategorized'] = [];
                }
                categorizedLogs['uncategorized'].push(log);
            }
        });

        console.log('Categorized Logs:', categorizedLogs);

        // Populate each category column
        Object.keys(categorizedLogs).forEach(categoryName => {
            populateCategoryList(categoryName, categorizedLogs[categoryName]);
        });

        console.log('Logs successfully loaded and displayed.');
    });
}

/**
 * Initializes the category columns in the logs container.
 * @param {Array} categories - Array of category objects.
 */
function initializeCategoryColumns(categories) {
    const logsContainer = document.getElementById('logs-container');
    logsContainer.innerHTML = ''; // Clear existing content

    categories.forEach(category => {
        const categoryName = category.name.toLowerCase();
        const displayName = capitalizeFirstLetter(category.name);

        const columnDiv = document.createElement('div');
        columnDiv.classList.add('category-column');
        columnDiv.id = `${categoryName}-column`;

        const heading = document.createElement('h2');
        heading.textContent = displayName;

        const ul = document.createElement('ul');
        ul.classList.add('log-list');
        ul.id = `${categoryName}-list`;

        columnDiv.appendChild(heading);
        columnDiv.appendChild(ul);

        logsContainer.appendChild(columnDiv);
    });

    // Ensure 'uncategorized' category exists if there's data
    if (!categories.some(category => category.name.toLowerCase() === 'uncategorized')) {
        chrome.storage.local.get(['timeData'], (data) => {
            const timeData = data.timeData || {};
            const currentDate = getCurrentDate();
            const dateData = timeData[currentDate] || {};

            if (dateData['uncategorized']) {
                const columnDiv = document.createElement('div');
                columnDiv.classList.add('category-column');
                columnDiv.id = `uncategorized-column`;

                const heading = document.createElement('h2');
                heading.textContent = 'Uncategorized';

                const ul = document.createElement('ul');
                ul.classList.add('log-list');
                ul.id = `uncategorized-list`;

                columnDiv.appendChild(heading);
                columnDiv.appendChild(ul);

                logsContainer.appendChild(columnDiv);
            }
        });
    }
}

/**
 * Populates a specific category list with logs.
 * @param {string} category - The category name.
 * @param {Array} logs - Array of log objects.
 */
function populateCategoryList(category, logs) {
    const listElement = document.getElementById(`${category}-list`);

    if (!listElement) {
        console.warn(`List element for category '${category}' not found.`);
        return;
    }

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
        urlLink.classList.add('log-url');

        // Truncate URL to 50 characters
        let displayUrl = log.url;
        if (log.url.length > 50) {
            displayUrl = log.url.substring(0, 47) + '...';
        }
        urlLink.textContent = displayUrl;

        // Set title attribute to show full URL on hover
        urlLink.title = log.url;

        // Time Spent Display
        const timeSpan = document.createElement('span');
        timeSpan.textContent = ` - ${formatTime(log.time)}`;
        timeSpan.style.marginLeft = '10px';
        timeSpan.style.color = '#555';
        timeSpan.style.fontSize = '0.9em';

        // Append checkbox, URL, and time to the list item
        logItem.appendChild(checkbox);
        logItem.appendChild(urlLink);
        logItem.appendChild(timeSpan);

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
 * Formats time in milliseconds to HH:MM:SS format.
 * @param {number} ms - Time in milliseconds.
 * @returns {string} Formatted time string.
 */
function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h}h ${m}m ${s}s`;
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