// src/logs/preferences.js

document.addEventListener('DOMContentLoaded', () => {
    const goToLogsButton = document.getElementById('go-to-logs');
    const deleteSelectedButton = document.getElementById('delete-selected');

    goToLogsButton.addEventListener('click', () => {
        window.location.href = 'logs.html';
    });

    deleteSelectedButton.addEventListener('click', () => {
        deleteSelectedPreferences();
    });

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

        listItem.appendChild(checkbox);
        listItem.appendChild(urlLink);

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
