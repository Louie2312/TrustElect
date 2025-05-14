"use client"

/**
 * Format image URL to ensure it points to the API
 * @param {string} url - The image URL
 * @param {string} apiUrl - The API base URL
 * @returns {string|null} - The formatted URL or null if no URL provided
 */
export const formatImageUrl = (url, apiUrl) => {
  if (!url) return null;

  if (url.startsWith('blob:')) {
    return url;
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${apiUrl}${path}`;
};

/**
 * Check if content has changed since initial load
 * @param {Object} content - The current content
 * @param {Object} initialContent 
 * @returns {boolean} 
 */
export const hasContentChanged = (content, initialContent) => {
  if (!initialContent) return false;
  return JSON.stringify(content) !== JSON.stringify(initialContent);
};

/**

 * @param {string} field e
 * @param {*} value
 * @param {Object} landingContent 
 * @param {Function} setLandingContent 
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
 * @param {number} index 
 * @param {string} field
 * @param {*} value
 * @param {Object} landingContent 
 * @param {Function} setLandingContent 
 */
export const updateFeature = (index, field, value, landingContent, setLandingContent) => {

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
 
 * @param {string} field 
 * @param {*} value 
 * @param {Object} landingContent 
 * @param {Function} setLandingContent 
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