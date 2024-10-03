// src/background/index.js

import StorageManager from './storageManager.js';
import CategorizationManager from './categorizationManager.js';
import TimeTracker from './timeTracker.js';

// Default categories to initialize
const defaultCategories = [
    { name: "productive", color: "#4CAF50" },     // Light Green
    { name: "entertainment", color: "#E91E63" },  // Soft Pink/Coral
    { name: "neutral", color: "#FF9800" },        // Soft Orange
    { name: "uncategorized", color: "#03A9F4" }   // Sky Blue (Fixed for uncategorized)
];

// Function to check and initialize default categories
function initializeDefaultCategories() {
    chrome.storage.local.get(['categories'], (data) => {
        if (!data.categories) {
            // If categories do not exist in storage, set default categories
            chrome.storage.local.set({ categories: defaultCategories }, () => {
                console.log("Background/index.js: Initialized default categories:", defaultCategories);
            });
        } else {
            console.log("Background/index.js: Categories already exist. Skipping initialization.");
        }
    });
}

// Run this when the extension is installed or updated
chrome.runtime.onInstalled.addListener((details) => {
    console.log("Background/index.js: Extension installed or updated", details);
    initializeDefaultCategories();
});

// Optionally run this on extension startup to ensure categories are loaded
chrome.runtime.onStartup.addListener(() => {
    console.log("Background/index.js: Extension startup");
    initializeDefaultCategories();
});

// Initialize Storage Manager
const storageManager = new StorageManager();

// Initialize Categorization Manager
const categorizationManager = new CategorizationManager(storageManager);

// Initialize Time Tracker
const timeTracker = new TimeTracker(storageManager, categorizationManager);

console.log("Background scripts initialized and modularized.");