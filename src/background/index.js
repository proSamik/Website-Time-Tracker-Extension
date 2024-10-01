// src/background/index.js

import StorageManager from './storageManager.js';
import CategorizationManager from './categorizationManager.js';
import TimeTracker from './timeTracker.js';

// Initialize Storage Manager
const storageManager = new StorageManager();

// Initialize Categorization Manager
const categorizationManager = new CategorizationManager(storageManager);

// Initialize Time Tracker
const timeTracker = new TimeTracker(storageManager, categorizationManager);

console.log("Background scripts initialized and modularized.");
