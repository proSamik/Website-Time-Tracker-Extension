// src/logs/preferences.js

document.addEventListener('DOMContentLoaded', () => {
    const goToLogsButton = document.getElementById('go-to-logs');
    const deleteSelectedButton = document.getElementById('delete-selected');
    const addPreferenceForm = document.getElementById('add-preference-form');

    goToLogsButton.addEventListener('click', () => {
        window.location.href = 'logs.html';
    });

    deleteSelectedButton.addEventListener('click', () => {
        deleteSelectedPreferences();
    });

    addPreferenceForm.addEventListener('submit', (e) => {
        e.preventDefault();
        addNewPreferences();
    });

    // Fetch categories and initialize assigned-category select
    chrome.storage.local.get(['categories', 'oldCategories'], (data) => {
        const categories = data.categories || [];
        const oldCategories = data.oldCategories || [];
        const allCategories = [...categories, ...oldCategories];

        initializeAssignedCategorySelect(allCategories);

        // Load preferences after initializing assigned-category select
        loadPreferences(allCategories);
    });
});

/**
 * Initializes the assigned-category select options.
 * @param {Array} categories - Array of category objects.
 */
function initializeAssignedCategorySelect(categories) {
    const assignedCategorySelect = document.getElementById('assigned-category');
    assignedCategorySelect.innerHTML = ''; // Clear existing options

    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.disabled = true;
    defaultOption.selected = true;
    defaultOption.textContent = 'Select Assigned Category';
    assignedCategorySelect.appendChild(defaultOption);

    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.name.toLowerCase();
        option.textContent = capitalizeFirstLetter(category.name);
        assignedCategorySelect.appendChild(option);
    });

    // Ensure 'uncategorized' option exists
    if (!categories.some(category => category.name.toLowerCase() === 'uncategorized')) {
        const option = document.createElement('option');
        option.value = 'uncategorized';
        option.textContent = 'Uncategorized';
        assignedCategorySelect.appendChild(option);
    }
}

/**
 * Loads category preferences and displays them in their respective lists.
 * @param {Array} categories - Array of category objects.
 */
function loadPreferences(categories) {
    chrome.storage.local.get(['categoryPreferences'], (data) => {
        const categoryPreferences = data.categoryPreferences || {
            urls: {},
            exactDomains: {},
            subdomains: {},
            rootDomains: {}
        };

        console.log('Loaded categoryPreferences:', categoryPreferences);

        populatePreferenceList('urls', categoryPreferences.urls, categories);
        populatePreferenceList('exactDomains', categoryPreferences.exactDomains, categories);
        populatePreferenceList('subdomains', categoryPreferences.subdomains, categories);
        populatePreferenceList('rootDomains', categoryPreferences.rootDomains, categories);
    });
}

/**
 * Populates a specific category list with preferences.
 * @param {string} categoryType - The category type (urls, exactDomains, subdomains, rootDomains).
 * @param {Object} preferences - The preferences object containing URLs.
 * @param {Array} categories - Array of category objects.
 */
function populatePreferenceList(categoryType, preferences, categories) {
    const listElement = document.getElementById(`${categoryType}-list`);
    listElement.innerHTML = ''; // Clear existing entries

    const entries = Object.keys(preferences);

    if (entries.length === 0) {
        const emptyMsg = document.createElement('li');
        emptyMsg.textContent = 'No entries in this category.';
        emptyMsg.classList.add('no-preferences');
        listElement.appendChild(emptyMsg);
        return;
    }

    entries.forEach(url => {
        const listItem = document.createElement('li');
        listItem.classList.add('preference-item');

        // Checkbox
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.classList.add('preference-checkbox');
        checkbox.dataset.category = categoryType;
        checkbox.dataset.url = url;

        // URL Display
        const urlLink = document.createElement('a');
        urlLink.href = url;
        urlLink.target = '_blank';
        urlLink.textContent = url;
        urlLink.classList.add('preference-url');

        // Assigned Category Display
        const assignedCategory = preferences[url];
        const categoryDisplayName = capitalizeFirstLetter(assignedCategory);

        const categorySpan = document.createElement('span');
        categorySpan.textContent = ` (${categoryDisplayName})`;
        categorySpan.style.marginLeft = '10px';
        categorySpan.style.color = '#555';
        categorySpan.style.fontSize = '0.9em';

        listItem.appendChild(checkbox);
        listItem.appendChild(urlLink);
        listItem.appendChild(categorySpan); // Display assigned category

        listElement.appendChild(listItem);
    });
}

/**
 * Adds new preferences to the selected category with assigned categories.
 */
function addNewPreferences() {
    const newUrlsInput = document.getElementById('new-urls');
    const newCategorySelect = document.getElementById('new-category');
    const assignedCategorySelect = document.getElementById('assigned-category');

    const urlsInput = newUrlsInput.value.trim().toLowerCase();
    const selectedCategoryType = newCategorySelect.value;
    const assignedCategory = assignedCategorySelect.value;

    if (!urlsInput) {
        alert('Please enter at least one URL or Domain.');
        return;
    }

    if (!selectedCategoryType) {
        alert('Please select a category type.');
        return;
    }

    if (!assignedCategory) {
        alert('Please select an assigned category.');
        return;
    }

    // Split the input by commas and trim each URL/domain
    const urls = urlsInput.split(',').map(url => url.trim()).filter(url => url);

    if (urls.length === 0) {
        alert('Please enter valid URLs or Domains.');
        return;
    }

    // Validate each URL/domain
    const invalidEntries = urls.filter(url => !isValidUrl(url) && !isValidDomain(url));

    if (invalidEntries.length > 0) {
        alert(`The following entries are invalid:\n- ${invalidEntries.join('\n- ')}`);
        return;
    }

    chrome.storage.local.get(['categoryPreferences'], (data) => {
        let categoryPreferences = data.categoryPreferences || {
            urls: {},
            exactDomains: {},
            subdomains: {},
            rootDomains: {}
        };

        let addedCount = 0;
        let alreadyExists = [];

        urls.forEach(url => {
            // Check if the URL/domain already exists in any category
            if (isUrlAlreadyCategorized(categoryPreferences, url)) {
                alreadyExists.push(url);
                return;
            }

            // Add to the selected category type with the assigned category
            if (!categoryPreferences[selectedCategoryType]) {
                categoryPreferences[selectedCategoryType] = {};
            }
            categoryPreferences[selectedCategoryType][url] = assignedCategory;

            addedCount++;
        });

        // Save updated categoryPreferences back to storage
        chrome.storage.local.set({ categoryPreferences }, () => {
            console.log(`Added ${addedCount} new preference(s) to ${selectedCategoryType}.`);
            let message = `Added ${addedCount} new preference(s) to ${capitalizeFirstLetter(selectedCategoryType)}.`;
            if (alreadyExists.length > 0) {
                message += `\n\nThe following entries already exist and were skipped:\n- ${alreadyExists.join('\n- ')}`;
            }
            alert(message);

            // Fetch categories again to refresh the lists
            chrome.storage.local.get(['categories', 'oldCategories'], (data) => {
                const categories = data.categories || [];
                const oldCategories = data.oldCategories || [];
                const allCategories = [...categories, ...oldCategories];

                loadPreferences(allCategories); // Refresh the lists

                // Clear the form inputs
                newUrlsInput.value = '';
                newCategorySelect.value = '';
                assignedCategorySelect.value = '';
            });
        });
    });
}

/**
 * Checks if a URL/domain is already categorized in any category.
 * @param {Object} categoryPreferences - The category preferences object.
 * @param {string} url - The URL or domain to check.
 * @returns {boolean} - True if already categorized, false otherwise.
 */
function isUrlAlreadyCategorized(categoryPreferences, url) {
    return (
        categoryPreferences.urls && categoryPreferences.urls.hasOwnProperty(url) ||
        categoryPreferences.exactDomains && categoryPreferences.exactDomains.hasOwnProperty(url) ||
        categoryPreferences.subdomains && categoryPreferences.subdomains.hasOwnProperty(url) ||
        categoryPreferences.rootDomains && categoryPreferences.rootDomains.hasOwnProperty(url)
    );
}

/**
 * Validates if the input string is a valid URL.
 * @param {string} str - The URL string to validate.
 * @returns {boolean} - True if valid, false otherwise.
 */
function isValidUrl(str) {
    try {
        new URL(str);
        return true;
    } catch (_) {
        return false;
    }
}

/**
 * Validates if the input string is a valid Domain.
 * @param {string} str - The domain string to validate.
 * @returns {boolean} - True if valid, false otherwise.
 */
function isValidDomain(str) {
    const domainRegex = /^(?!:\/\/)([a-zA-Z0-9-_]+\.)+[a-zA-Z]{2,11}?$/;
    return domainRegex.test(str);
}

/**
 * Capitalizes the first letter of a string.
 * @param {string} string - The string to capitalize.
 * @returns {string} Capitalized string.
 */
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}