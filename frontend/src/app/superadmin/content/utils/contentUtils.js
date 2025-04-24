"use client"

/**
 * Format image URL to ensure it points to the API
 * @param {string} url - The image URL
 * @param {string} apiUrl - The API base URL
 * @returns {string|null} - The formatted URL or null if no URL provided
 */
export const formatImageUrl = (url, apiUrl) => {
  if (!url) return null;
  
  // For blob URLs (local file previews), use them directly
  if (url.startsWith('blob:')) {
    return url;
  }
  
  // For already complete URLs, use them directly
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // For relative paths, prepend the API URL
  // Make sure path starts with a slash
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${apiUrl}${path}`;
};

/**
 * Check if content has changed since initial load
 * @param {Object} content - The current content
 * @param {Object} initialContent - The initial content (for comparison)
 * @returns {boolean} - Whether content has changed
 */
export const hasContentChanged = (content, initialContent) => {
  if (!initialContent) return false;
  return JSON.stringify(content) !== JSON.stringify(initialContent);
};

/**
 * Update a hero section field
 * @param {string} field - The field to update
 * @param {*} value - The new value
 * @param {Object} landingContent - The current landing content
 * @param {Function} setLandingContent - Function to update the landing content
 */
export const updateHero = (field, value, landingContent, setLandingContent) => {
  setLandingContent(prev => ({
    ...prev,
    hero: {
      ...prev.hero,
      [field]: value
    }
  }));
};

/**
 * Update a feature column field
 * @param {number} index - The index of the feature to update
 * @param {string} field - The field to update
 * @param {*} value - The new value
 * @param {Object} landingContent - The current landing content
 * @param {Function} setLandingContent - Function to update the landing content
 */
export const updateFeature = (index, field, value, landingContent, setLandingContent) => {
  console.log(`Updating feature ${index}, field ${field} with value:`, value);
  const updatedColumns = [...landingContent.features.columns];
  updatedColumns[index] = {
    ...updatedColumns[index],
    [field]: value
  };
  
  setLandingContent(prev => ({
    ...prev,
    features: {
      ...prev.features,
      columns: updatedColumns
    }
  }));
};

/**
 * Update a call to action field
 * @param {string} field - The field to update
 * @param {*} value - The new value
 * @param {Object} landingContent - The current landing content
 * @param {Function} setLandingContent - Function to update the landing content
 */
export const updateCTA = (field, value, landingContent, setLandingContent) => {
  setLandingContent(prev => ({
    ...prev,
    callToAction: {
      ...prev.callToAction,
      [field]: value
    }
  }));
}; 