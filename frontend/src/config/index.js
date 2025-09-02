const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

// Add BASE_URL export
export const BASE_URL = API_URL;

export const config = {
  API_URL,
  API_BASE: process.env.NEXT_PUBLIC_API_URL || '',
  UPLOADS_URL: `/uploads`,
  PUBLIC_URL: `/public`,
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

    // Remove any leading slashes and keep same-origin path
    const cleanPath = url.replace(/^\/+/, '');
    return `/${cleanPath}`;
  } catch (error) {
    console.error('Error formatting URL:', error, url);
    return null;
  }
};

export default config;