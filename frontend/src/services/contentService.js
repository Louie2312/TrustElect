import axios from 'axios';

// API base URL
const API_URL = ''; // use same-origin so Next.js rewrites proxy the request

// Create Axios instance with defaults
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  }
});

// Response interceptor for retrying failed requests
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    
    // If this is already a retry, don't retry again
    if (config && config.__isRetry) {
      return Promise.reject(error);
    }
    
    // Determine if error is retryable
    const isRetryable = 
      !response || // Network errors (no response)
      response.status >= 500 || // Server errors
      response.status === 429; // Rate limited
    
    if (isRetryable && config) {
      config.__isRetry = true;
      
      // Exponential backoff
      const retryCount = config.__retryCount || 0;
      if (retryCount < 2) { // Maximum 2 retries
        config.__retryCount = retryCount + 1;
        
        // Delay with exponential backoff (1s, then 3s)
        const delay = Math.pow(2, retryCount) * 1000;
        
        console.log(`Retrying request (${retryCount + 1}/2) after ${delay}ms delay...`);
        
        return new Promise(resolve => {
          setTimeout(() => resolve(apiClient(config)), delay);
        });
      }
    }
    
    return Promise.reject(error);
  }
);

/**
 * Check if the API is reachable
 * @returns {Promise<boolean>} Whether API is reachable
 */
export const checkApiConnection = async () => {
  try {
    // Use same-origin so it goes through the rewrite
    await axios.head(`/api/healthcheck`, { timeout: 5000 });
    return true;
  } catch (error) {
    console.error('API connection check failed:', error);
    return false;
  }
};

/**
 * Get all landing content
 * @returns {Promise<Object>} Landing content
 */
export const getLandingContent = async () => {
  try {
    // Add cache-busting timestamp
    const timestamp = new Date().getTime();
    const response = await apiClient.get(`/api/content?t=${timestamp}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching landing content:', error);
    throw error;
  }
};

/**
 * Cache landing content in localStorage
 * @param {Object} content Content to cache
 */
export const cacheLandingContent = (content) => {
  try {
    const cacheData = {
      content,
      timestamp: new Date().getTime()
    };
    localStorage.setItem('cachedLandingContent', JSON.stringify(cacheData));
  } catch (error) {
    console.error('Error caching content:', error);
  }
};

/**
 * Get cached landing content
 * @param {number} maxAgeMinutes Maximum age in minutes for cache to be valid
 * @returns {Object|null} Cached content or null if invalid/not found
 */
export const getCachedLandingContent = (maxAgeMinutes = 30) => {
  try {
    const cachedData = localStorage.getItem('cachedLandingContent');
    if (!cachedData) return null;
    
    const { content, timestamp } = JSON.parse(cachedData);
    const now = new Date().getTime();
    const cacheAge = now - timestamp;
    
    // Convert maxAgeMinutes to milliseconds
    if (cacheAge < maxAgeMinutes * 60 * 1000) {
      return content;
    }
    
    return null;
  } catch (error) {
    console.error('Error reading cached content:', error);
    return null;
  }
};

/**
 * Get content for a specific section
 * @param {string} section Section to get content for
 * @returns {Promise<Object>} Section content
 */
export const getSectionContent = async (section) => {
  try {
    // Add cache-busting timestamp
    const timestamp = new Date().getTime();
    const response = await apiClient.get(`/api/content/${section}?t=${timestamp}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching ${section} content:`, error);
    throw error;
  }
};

/**
 * Save content for a specific section
 * @param {string} section Section to save content for
 * @param {Object} contentData Content data
 * @param {Object} files Files to upload (optional)
 * @returns {Promise<Object>} Updated section content
 */
export const saveSectionContent = async (section, contentData, files = {}) => {
  try {
    const formData = new FormData();
    
    // Add content data
    formData.append('content', JSON.stringify(contentData));
    
    // Add files if provided
    Object.keys(files).forEach(key => {
      if (files[key]) {
        formData.append(key, files[key]);
      }
    });
    
    // Add cache-busting timestamp
    const timestamp = new Date().getTime();
    
    const response = await apiClient.post(
      `/api/content/${section}?t=${timestamp}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error(`Error saving ${section} content:`, error);
    
    // Handle specific error cases
    if (error.response?.status === 413) {
      const enhancedError = new Error('File too large. Please try a smaller video file (max 200MB).');
      enhancedError.status = 413;
      throw enhancedError;
    }
    
    throw error;
  }
};

/**
 * Get all media files
 * @param {string} type Optional file type filter (image, video)
 * @returns {Promise<Array>} Media files
 */
export const getAllMedia = async (type = null) => {
  try {
    let url = '/api/content/media/all';
    if (type) {
      url += `?type=${type}`;
    }
    
    const response = await apiClient.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching media files:', error);
    throw error;
  }
};

/**
 * Delete a media file
 * @param {number} id Media ID to delete
 * @returns {Promise<Object>} Response data
 */
export const deleteMedia = async (id) => {
  try {
    const response = await apiClient.delete(`/api/content/media/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting media with ID ${id}:`, error);
    throw error;
  }
};

/**
 * Format image URL to ensure it points to the API
 * @param {string} url URL to format
 * @returns {string|null} Formatted URL
 */
export const formatImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('blob:')) return url;
  if (url.startsWith('http')) return url;
  // Return a same-origin path so Next rewrites proxy /uploads
  return url.startsWith('/') ? url : `/${url}`;
};

const ContentService = {
  checkApiConnection,
  getLandingContent,
  cacheLandingContent,
  getCachedLandingContent,
  getSectionContent,
  saveSectionContent,
  getAllMedia,
  deleteMedia,
  formatImageUrl
};

export default ContentService;