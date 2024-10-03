document.addEventListener('DOMContentLoaded', () => {
    const addCategoryForm = document.getElementById('add-category-form');
    const categoryNameInput = document.getElementById('category-name');
    const categoryColorInput = document.getElementById('category-color');
    const categoriesList = document.getElementById('categories-list');

    // Load categories from local storage
    function loadCategories() {
        chrome.storage.local.get(['categories'], (data) => {
            const categories = data.categories || [];
            categoriesList.innerHTML = ''; // Clear current list

            categories.forEach((category, index) => {
                const listItem = document.createElement('li');
                listItem.textContent = `${category.name} - ${category.color}`;
                
                const deleteButton = document.createElement('button');
                deleteButton.textContent = 'Delete';
                deleteButton.addEventListener('click', () => deleteCategory(index));

                listItem.appendChild(deleteButton);
                categoriesList.appendChild(listItem);
            });
        });
    }

    // Save categories to local storage
    function saveCategories(categories) {
        chrome.storage.local.set({ categories }, () => {
            console.log('Categories saved:', categories);
            loadCategories();
        });
    }

    // Add new category
    addCategoryForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const newCategory = {
            name: categoryNameInput.value,
            color: categoryColorInput.value
        };

        chrome.storage.local.get(['categories'], (data) => {
            const categories = data.categories || [];
            categories.push(newCategory); // Add new category

            saveCategories(categories);
            categoryNameInput.value = ''; // Clear input fields
            categoryColorInput.value = '#4CAF50'; // Reset color to default
        });
    });

    // Delete a category by index
    function deleteCategory(index) {
        chrome.storage.local.get(['categories'], (data) => {
            const categories = data.categories || [];
            categories.splice(index, 1); // Remove category

            saveCategories(categories);
        });
    }

    // Load categories on page load
    loadCategories();
});