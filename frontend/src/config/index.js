const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export const config = {
  API_URL,
  API_BASE: `${API_URL}/api`,
  UPLOADS_URL: `${API_URL}/uploads`,
  PUBLIC_URL: `${API_URL}/public`,
};

export const formatImageUrl = (url) => {
  if (!url) return null;
  
  try {
    if (url.startsWith('blob:') || url.startsWith('data:')) {
      return url;
    }

    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    // Remove any leading slashes
    const cleanPath = url.replace(/^\/+/, '');
    return `${API_URL}/${cleanPath}`;
  } catch (error) {
    console.error('Error formatting URL:', error, url);
    return null;
  }
};

export default config; 