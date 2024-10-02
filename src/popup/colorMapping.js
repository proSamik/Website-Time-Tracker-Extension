// src/popup/ColorMapping.js

// Centralized color mapping (same as ChartManager)
const colorMapping = {
	productive: 'rgba(252, 65, 0, 0.6)',        // #FC4100 - Orange
	uncategorized : 'rgba(255, 197, 90, 0.6)',         // #FFC55A - Yellow
	entertainment: 'rgba(44, 78, 128, 0.6)',    // #2C4E80 - Blue (swapped with Uncategorized)
	neutral: 'rgba(0, 33, 94, 0.6)'       // #00215E - Navy Blue (swapped with Entertainment)
  };

// Export the colorMapping object
window.colorMapping = colorMapping;
