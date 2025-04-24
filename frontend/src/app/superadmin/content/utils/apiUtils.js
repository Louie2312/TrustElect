"use client"
import axios from 'axios';

/**
 * Fetch content from API
 * @param {string} apiUrl - The API base URL
 * @param {Function} setContent - Function to update the content state
 * @param {Function} setInitialContent - Function to update the initial content state
 * @param {Function} setIsLoading - Function to update the loading state
 * @param {Function} setSaveStatus - Function to update the save status
 */
export const fetchContent = async (
  apiUrl,
  setContent,
  setInitialContent,
  setIsLoading,
  setSaveStatus
) => {
  setIsLoading(true);
  try {
    const response = await axios.get(`${apiUrl}/api/content`);
    if (response.data) {
      const contentData = response.data;
      
      // Ensure features.items exists and has the expected format
      if (contentData.features && !contentData.features.items) {
        contentData.features.items = [
          { id: 1, title: "", description: "", icon: "CheckCircleIcon" },
          { id: 2, title: "", description: "", icon: "ShieldCheckIcon" },
          { id: 3, title: "", description: "", icon: "UserGroupIcon" }
        ];
      }
      
      setContent(contentData);
      setInitialContent(JSON.parse(JSON.stringify(contentData))); // Deep copy for comparison
    }
  } catch (error) {
    console.error("Error fetching content:", error);
    setSaveStatus("Error loading content");
    setTimeout(() => setSaveStatus(""), 3000);
  } finally {
    setIsLoading(false);
  }
};

/**
 * Fetch themes from API
 * @param {string} apiUrl - The API base URL
 * @param {Function} setThemes - Function to update the themes state
 * @param {Function} setActiveTheme - Function to update the active theme state
 */
export const fetchThemes = async (apiUrl, setThemes, setActiveTheme) => {
  try {
    const response = await axios.get(`${apiUrl}/api/content/themes`);
    if (response.data) {
      setThemes(response.data);
      
      // Find the active theme
      const active = response.data.find(theme => theme.isActive);
      if (active) {
        setActiveTheme(active);
      }
    }
  } catch (error) {
    console.log("Themes API not available, using default themes");
    loadDefaultThemes(setThemes, setActiveTheme);
  }
};

/**
 * Load default themes when API is not available
 * @param {Function} setThemes - Function to update the themes state
 * @param {Function} setActiveTheme - Function to update the active theme state
 */
export const loadDefaultThemes = (setThemes, setActiveTheme) => {
  // Try to load themes from localStorage first
  const savedThemes = localStorage.getItem('trustElectThemes');
  if (savedThemes) {
    try {
      const parsedThemes = JSON.parse(savedThemes);
      console.log("Loaded themes from localStorage:", parsedThemes);
      setThemes(parsedThemes);
      
      // Find the active theme
      const active = parsedThemes.find(theme => theme.isActive);
      if (active) {
        setActiveTheme(active);
      }
      return;
    } catch (err) {
      console.error("Error parsing saved themes:", err);
    }
  }
  
  // Create default themes when API is not available and no saved themes
  const defaultThemes = [
    {
      id: 1,
      name: "Default Blue",
      isActive: true,
      colors: {
        heroBg: "#1e40af",
        heroText: "#ffffff",
        featureSectionBg: "#f9fafb", // Light gray for feature section background
        featureBg: "#ffffff",
        featureText: "#000000",
        ctaBg: "#1e3a8a",
        ctaText: "#ffffff"
      }
    },
    {
      id: 2,
      name: "Dark Mode",
      isActive: false,
      colors: {
        heroBg: "#1f2937",
        heroText: "#f3f4f6",
        featureSectionBg: "#111827", // Dark background for dark mode
        featureBg: "#1f2937",
        featureText: "#f9fafb",
        ctaBg: "#374151",
        ctaText: "#f3f4f6"
      }
    }
  ];
  
  setThemes(defaultThemes);
  setActiveTheme(defaultThemes[0]);
  
  // Save the default themes to localStorage
  localStorage.setItem('trustElectThemes', JSON.stringify(defaultThemes));
}; 