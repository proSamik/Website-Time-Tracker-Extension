document.addEventListener('DOMContentLoaded', () => {
    const addCategoryForm = document.getElementById('add-category-form');
    const categoryNameInput = document.getElementById('category-name');
    const categoryColorInput = document.getElementById('category-color');
    const categoryColorHexInput = document.getElementById('category-color-hex');
    const categoriesList = document.getElementById('categories-list');
    const uncategorizedList = document.getElementById('uncategorized-list');
    const oldCategoriesList = document.getElementById('old-categories-list');
    const addUpdateButton = document.getElementById('add-update-button');
    const cancelEditButton = document.getElementById('cancel-edit');
    const categoryLimitWarning = document.getElementById('category-limit-warning');
    const goToPreferencesButton = document.getElementById('go-to-preferences');
    const goToLogsButton = document.getElementById('go-to-logs');

    let isEditing = false;
    let editCategoryName = null; // Use category name instead of index

    // Navigation buttons
    goToPreferencesButton.addEventListener('click', () => {
        window.location.href = 'preferences.html';
    });

    goToLogsButton.addEventListener('click', () => {
        window.location.href = 'logs.html';
    });

    // Sync color picker and hex code input
    categoryColorInput.addEventListener('input', () => {
        categoryColorHexInput.value = categoryColorInput.value.toUpperCase();
    });

    categoryColorHexInput.addEventListener('input', () => {
        if (/^#([A-Fa-f0-9]{6})$/.test(categoryColorHexInput.value)) {
            categoryColorHexInput.value = categoryColorHexInput.value.toUpperCase();
            categoryColorInput.value = categoryColorHexInput.value;
        }
    });

    // Load categories from storage
    function loadCategories() {
        chrome.storage.local.get(['categories', 'oldCategories'], (data) => {
            let categories = data.categories || [];
            let oldCategories = data.oldCategories || [];

            // Remove duplicates from oldCategories
            const updatedOldCategories = oldCategories.filter(oldCat => {
                return !categories.some(cat => cat.name === oldCat.name);
            });

            if (updatedOldCategories.length !== oldCategories.length) {
                // Update storage if oldCategories changed
                chrome.storage.local.set({ oldCategories: updatedOldCategories });
                oldCategories = updatedOldCategories;
            }

            displayUncategorized(categories);
            displayCategories(categories);
            displayOldCategories(oldCategories);
        });
    }

    // Display 'Uncategorized' category
    function displayUncategorized(categories) {
        uncategorizedList.innerHTML = ''; // Clear the list

        const uncategorizedCategory = categories.find(cat => cat.name === 'uncategorized');

        if (uncategorizedCategory) {
            const row = document.createElement('tr');

            // Color cell with color swatch
            const colorCell = document.createElement('td');
            colorCell.classList.add('color-cell');
            const colorBox = document.createElement('div');
            colorBox.className = 'category-color-box';
            colorBox.style.backgroundColor = uncategorizedCategory.color;
            colorCell.appendChild(colorBox);
            row.appendChild(colorCell);

            // Color Code cell
            const colorCodeCell = document.createElement('td');
            colorCodeCell.classList.add('color-code-cell');
            colorCodeCell.textContent = uncategorizedCategory.color.toUpperCase();
            row.appendChild(colorCodeCell);

            // Category Name cell
            const nameCell = document.createElement('td');
            nameCell.classList.add('name-cell');
            nameCell.textContent = capitalizeFirstLetter(uncategorizedCategory.name);
            row.appendChild(nameCell);

            uncategorizedList.appendChild(row);
        }
    }

    // Display current categories (excluding 'Uncategorized') in table format
    function displayCategories(categories) {
        categoriesList.innerHTML = ''; // Clear current list

        // Exclude 'uncategorized' from the list
        const customCategories = categories.filter(cat => cat.name !== 'uncategorized');
        const customCategoryCount = customCategories.length;

        customCategories.forEach((category) => {
            const row = document.createElement('tr');

            // Color cell with color swatch
            const colorCell = document.createElement('td');
            colorCell.classList.add('color-cell');
            const colorBox = document.createElement('div');
            colorBox.className = 'category-color-box';
            colorBox.style.backgroundColor = category.color;
            colorCell.appendChild(colorBox);
            row.appendChild(colorCell);

            // Color Code cell
            const colorCodeCell = document.createElement('td');
            colorCodeCell.classList.add('color-code-cell');
            colorCodeCell.textContent = category.color.toUpperCase();
            row.appendChild(colorCodeCell);

            // Category Name cell
            const nameCell = document.createElement('td');
            nameCell.classList.add('name-cell');
            nameCell.textContent = capitalizeFirstLetter(category.name);
            row.appendChild(nameCell);

            // Actions cell
            const actionsCell = document.createElement('td');
            actionsCell.classList.add('actions-cell');
            actionsCell.classList.add('action-buttons');

            const editButton = document.createElement('button');
            editButton.textContent = 'Edit';
            editButton.addEventListener('click', () => editCategory(category.name));
            actionsCell.appendChild(editButton);

            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.disabled = customCategoryCount <= 2; // Disable if only 2 custom categories
            deleteButton.addEventListener('click', () => deleteCategory(category.name));
            actionsCell.appendChild(deleteButton);

            row.appendChild(actionsCell);
            categoriesList.appendChild(row);
        });

        updateButtons(customCategories.length);
    }

    // Display old categories in table format
    function displayOldCategories(oldCategories) {
        oldCategoriesList.innerHTML = ''; // Clear old categories list

        oldCategories.forEach((category) => {
            const row = document.createElement('tr');

            // Color cell with color swatch
            const colorCell = document.createElement('td');
            colorCell.classList.add('color-cell');
            const colorBox = document.createElement('div');
            colorBox.className = 'category-color-box';
            colorBox.style.backgroundColor = category.color;
            colorCell.appendChild(colorBox);
            row.appendChild(colorCell);

            // Color Code cell
            const colorCodeCell = document.createElement('td');
            colorCodeCell.classList.add('color-code-cell');
            colorCodeCell.textContent = category.color.toUpperCase();
            row.appendChild(colorCodeCell);

            // Category Name cell
            const nameCell = document.createElement('td');
            nameCell.classList.add('name-cell');
            nameCell.textContent = capitalizeFirstLetter(category.name);
            row.appendChild(nameCell);

            oldCategoriesList.appendChild(row);
        });
    }

    // Save categories to storage
    function saveCategories(categories) {
        chrome.storage.local.set({ categories }, () => {
            console.log('Categories saved:', categories);
            loadCategories();
        });
    }

    // Add or update category
    addCategoryForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const newCategory = {
            name: categoryNameInput.value.trim().toLowerCase(),
            color: categoryColorHexInput.value.toUpperCase()
        };

        if (!newCategory.name || newCategory.name === 'uncategorized') {
            alert("Category name cannot be empty or 'uncategorized'");
            return;
        }

        chrome.storage.local.get(['categories', 'oldCategories'], (data) => {
            let categories = data.categories || [];
            let oldCategories = data.oldCategories || [];

            // Remove from oldCategories if it exists
            oldCategories = oldCategories.filter(cat => cat.name !== newCategory.name);
            chrome.storage.local.set({ oldCategories });

            if (isEditing) {
                const categoryIndex = categories.findIndex(cat => cat.name === editCategoryName);
                if (categoryIndex === -1) {
                    alert("Error: Original category not found.");
                    return;
                }

                // Check if new category name already exists in other categories
                const duplicateIndex = categories.findIndex(cat => cat.name === newCategory.name);
                if (duplicateIndex !== -1 && duplicateIndex !== categoryIndex) {
                    alert("A category with this name already exists.");
                    return;
                }

                categories[categoryIndex] = newCategory;
                isEditing = false;
                editCategoryName = null;
                addUpdateButton.textContent = 'Add Category';
                cancelEditButton.style.display = 'none';
            } else {
                if (categories.some(cat => cat.name === newCategory.name)) {
                    alert("A category with this name already exists.");
                    return;
                }
                if (categories.length >= 5) {
                    alert("You cannot add more than 4 custom categories.");
                    return;
                }
                categories.push(newCategory);
            }

            saveCategories(categories);
            categoryNameInput.value = ''; // Clear input fields
            categoryColorInput.value = '#4CAF50'; // Reset color to default
            categoryColorHexInput.value = '#4CAF50';
        });
    });

    // Edit category
    function editCategory(categoryName) {
        chrome.storage.local.get(['categories'], (data) => {
            let categories = data.categories || [];
            const category = categories.find(cat => cat.name === categoryName);
            if (!category) {
                alert("Category not found.");
                return;
            }
            isEditing = true;
            editCategoryName = categoryName; // Store the category name being edited
            categoryNameInput.value = category.name;
            categoryColorInput.value = category.color.toUpperCase();
            categoryColorHexInput.value = category.color.toUpperCase();
            addUpdateButton.textContent = 'Update Category';
            cancelEditButton.style.display = 'inline-block';
        });
    }

    // Cancel editing
    cancelEditButton.addEventListener('click', () => {
        isEditing = false;
        editCategoryName = null;
        categoryNameInput.value = '';
        categoryColorInput.value = '#4CAF50';
        categoryColorHexInput.value = '#4CAF50';
        addUpdateButton.textContent = 'Add Category';
        cancelEditButton.style.display = 'none';
    });

    // Delete category
    function deleteCategory(categoryName) {
        chrome.storage.local.get(['categories', 'oldCategories'], (data) => {
            let categories = data.categories || [];
            let oldCategories = data.oldCategories || [];

            const customCategories = categories.filter(cat => cat.name !== 'uncategorized');

            if (customCategories.length <= 2) {
                alert("You must have at least 2 custom categories.");
                return;
            }

            // Find the category to delete
            const categoryToDelete = categories.find(cat => cat.name === categoryName);
            if (!categoryToDelete) {
                alert("Error: Category not found.");
                return;
            }

            // Move deleted category to old categories for future reference
            oldCategories.push(categoryToDelete);

            // Remove category from categories
            categories = categories.filter(cat => cat.name !== categoryName);

            // Save both categories and oldCategories together
            chrome.storage.local.set({ categories, oldCategories }, function() {
                if (chrome.runtime.lastError) {
                    console.error('Error saving categories:', chrome.runtime.lastError);
                    alert('An error occurred while saving categories.');
                } else {
                    console.log('Categories and oldCategories updated.');
                    loadCategories(); // Reload categories after both are saved
                }
            });
        });
    }

    // Update buttons based on categories length
    function updateButtons(customCategoryCount) {
        categoryLimitWarning.style.display = (customCategoryCount < 2 || customCategoryCount >= 4) ? 'block' : 'none';

        if (customCategoryCount < 2) {
            categoryLimitWarning.textContent = 'Minimum 2 categories are required.';
        } else if (customCategoryCount >= 4) {
            categoryLimitWarning.textContent = 'You can only add up to 4 custom categories.';
        } else {
            categoryLimitWarning.style.display = 'none';
        }
    }

    // Capitalize first letter
    function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    // Load categories on page load
    loadCategories();
});