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

    // Update placeholder to show new lines (optional)
    document.getElementById("new-urls").placeholder = "URLs/Domains\n(multiple comma separated)\n";

    loadPreferences();
});

/**
 * Loads category preferences and displays them in their respective lists.
 */
function loadPreferences() {
    chrome.storage.local.get(['categoryPreferences'], (data) => {
        const categoryPreferences = data.categoryPreferences || {
            urls: {},
            exactDomains: {},
            subdomains: {},
            rootDomains: {}
        };

        console.log('Loaded categoryPreferences:', categoryPreferences);

        populatePreferenceList('urls', categoryPreferences.urls);
        populatePreferenceList('exactDomains', categoryPreferences.exactDomains);
        populatePreferenceList('subdomains', categoryPreferences.subdomains);
        populatePreferenceList('rootDomains', categoryPreferences.rootDomains);
    });
}

/**
 * Populates a specific category list with preferences.
 * @param {string} category - The category name (urls, exactDomains, subdomains, rootDomains).
 * @param {Object} preferences - The preferences object containing URLs.
 */
function populatePreferenceList(category, preferences) {
    const listElement = document.getElementById(`${category}-list`);
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
        checkbox.dataset.category = category;
        checkbox.dataset.url = url;

        // URL Display
        const urlLink = document.createElement('a');
        urlLink.href = url;
        urlLink.target = '_blank';
        urlLink.textContent = url;
        urlLink.classList.add('preference-url');

        // Assigned Category Display (Optional)
        const categorySpan = document.createElement('span');
        categorySpan.textContent = `(${preferences[url]})`;
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
 * Deletes selected preferences from their respective categories.
 */
function deleteSelectedPreferences() {
    const checkboxes = document.querySelectorAll('.preference-checkbox:checked');

    if (checkboxes.length === 0) {
        alert('Please select at least one URL to delete.');
        return;
    }

    const selectedPreferences = Array.from(checkboxes).map(cb => ({
        category: cb.dataset.category,
        url: cb.dataset.url
    }));

    console.log('Selected preferences to delete:', selectedPreferences);

    // Confirmation Prompt
    if (!confirm(`Are you sure you want to delete ${selectedPreferences.length} selected preference(s)? This will prompt categorization again when these URLs are visited.`)) {
        return;
    }

    chrome.storage.local.get(['categoryPreferences'], (data) => {
        let categoryPreferences = data.categoryPreferences || {
            urls: {},
            exactDomains: {},
            subdomains: {},
            rootDomains: {}
        };

        selectedPreferences.forEach(item => {
            const { category, url } = item;
            if (categoryPreferences[category] && categoryPreferences[category][url]) {
                delete categoryPreferences[category][url];
                console.log(`Deleted ${url} from ${category}`);
            }
        });

        // Save updated categoryPreferences back to storage
        chrome.storage.local.set({ categoryPreferences }, () => {
            console.log('Updated categoryPreferences:', categoryPreferences);
            alert(`Deleted ${selectedPreferences.length} preference(s).`);
            loadPreferences(); // Refresh the lists
        });
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
            switch (selectedCategoryType) {
                case 'urls':
                    categoryPreferences.urls[url] = assignedCategory;
                    break;
                case 'exactDomains':
                    categoryPreferences.exactDomains[url] = assignedCategory;
                    break;
                case 'subdomains':
                    categoryPreferences.subdomains[url] = assignedCategory;
                    break;
                case 'rootDomains':
                    categoryPreferences.rootDomains[url] = assignedCategory;
                    break;
                default:
                    console.warn(`Invalid category type selected: ${selectedCategoryType}`);
            }

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
            loadPreferences(); // Refresh the lists

            // Clear the form inputs
            newUrlsInput.value = '';
            newCategorySelect.value = '';
            assignedCategorySelect.value = '';
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
        categoryPreferences.urls.hasOwnProperty(url) ||
        categoryPreferences.exactDomains.hasOwnProperty(url) ||
        categoryPreferences.subdomains.hasOwnProperty(url) ||
        categoryPreferences.rootDomains.hasOwnProperty(url)
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
