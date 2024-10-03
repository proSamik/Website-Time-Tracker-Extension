document.addEventListener('DOMContentLoaded', () => {
    const addCategoryForm = document.getElementById('add-category-form');
    const categoryNameInput = document.getElementById('category-name');
    const categoryColorInput = document.getElementById('category-color');
    const categoriesList = document.getElementById('categories-list');
    const oldCategoriesList = document.getElementById('old-categories-list');
    const addUpdateButton = document.getElementById('add-update-button');
    const cancelEditButton = document.getElementById('cancel-edit');
    const addMoreButton = document.getElementById('add-more-button');
    const categoryLimitWarning = document.getElementById('category-limit-warning');

    let isEditing = false;
    let editIndex = -1;

    // Load categories from storage
    function loadCategories() {
        chrome.storage.local.get(['categories', 'oldCategories'], (data) => {
            const categories = data.categories || [];
            const oldCategories = data.oldCategories || [];

            categoriesList.innerHTML = ''; // Clear current list
            oldCategoriesList.innerHTML = ''; // Clear old categories list

            categories.forEach((category, index) => {
                const listItem = document.createElement('li');
                listItem.textContent = `${category.name} - ${category.color}`;

                // Edit and Delete buttons (except uncategorized)
                if (category.name !== 'uncategorized') {
                    const editButton = document.createElement('button');
                    editButton.textContent = 'Edit';
                    editButton.addEventListener('click', () => editCategory(index, category));
                    listItem.appendChild(editButton);

                    const deleteButton = document.createElement('button');
                    deleteButton.textContent = 'Delete';
                    deleteButton.addEventListener('click', () => deleteCategory(index));
                    listItem.appendChild(deleteButton);
                }

                categoriesList.appendChild(listItem);
            });

            // Display old categories
            oldCategories.forEach((category) => {
                const listItem = document.createElement('li');
                listItem.textContent = `${category.name} - ${category.color}`;
                oldCategoriesList.appendChild(listItem);
            });

            updateButtons(categories.length);
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
            color: categoryColorInput.value
        };

        if (!newCategory.name || newCategory.name === 'uncategorized') {
            alert("Category name cannot be empty or 'uncategorized'");
            return;
        }

        chrome.storage.local.get(['categories'], (data) => {
            const categories = data.categories || [...defaultCategories];

            if (isEditing) {
                categories[editIndex] = newCategory;
                isEditing = false;
                editIndex = -1;
                addUpdateButton.textContent = 'Add Category';
                cancelEditButton.style.display = 'none';
            } else {
                if (categories.length >= 5) {
                    alert("You cannot add more than 4 custom categories.");
                    return;
                }
                categories.push(newCategory);
            }

            saveCategories(categories);
            categoryNameInput.value = ''; // Clear input fields
            categoryColorInput.value = '#4CAF50'; // Reset color to default
        });
    });

    // Edit category
    function editCategory(index, category) {
        isEditing = true;
        editIndex = index;
        categoryNameInput.value = category.name;
        categoryColorInput.value = category.color;
        addUpdateButton.textContent = 'Update Category';
        cancelEditButton.style.display = 'inline-block';
    }

    // Cancel editing
    cancelEditButton.addEventListener('click', () => {
        isEditing = false;
        editIndex = -1;
        categoryNameInput.value = '';
        categoryColorInput.value = '#4CAF50';
        addUpdateButton.textContent = 'Add Category';
        cancelEditButton.style.display = 'none';
    });

    // Delete category
    function deleteCategory(index) {
        chrome.storage.local.get(['categories', 'oldCategories'], (data) => {
            const categories = data.categories || [...defaultCategories];
            const oldCategories = data.oldCategories || [];

            if (categories.length <= 2) {
                alert("You must have at least 2 categories.");
                return;
            }

            // Move deleted category to old categories for future reference
            oldCategories.push(categories[index]);

            // Remove category
            categories.splice(index, 1);
            saveCategories(categories);
            chrome.storage.local.set({ oldCategories }, () => {
                console.log('Old category saved for future reference.');
            });
        });
    }

    // Update buttons based on categories length
    function updateButtons(categoryCount) {
        addMoreButton.disabled = categoryCount >= 5;
        addUpdateButton.disabled = categoryCount < 2;
        categoryLimitWarning.style.display = (categoryCount < 2 || categoryCount > 4) ? 'block' : 'none';
    }

    // Load categories on page load
    loadCategories();
});