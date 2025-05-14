"use client"
import axios from 'axios';

/**

 * @param {string} apiUrl 
 * @param {Function} setContent 
 * @param {Function} setInitialContent 
 * @param {Function} setIsLoading
 * @param {Function} setSaveStatus 
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

      if (contentData.features && !contentData.features.items) {
        contentData.features.items = [
          { id: 1, title: "", description: "", icon: "CheckCircleIcon" },
          { id: 2, title: "", description: "", icon: "ShieldCheckIcon" },
          { id: 3, title: "", description: "", icon: "UserGroupIcon" }
        ];
      }
      
      setContent(contentData);
      setInitialContent(JSON.parse(JSON.stringify(contentData))); 
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
 
 * @param {string} apiUrl
 * @param {Function} setThemes 
 * @param {Function} setActiveTheme 
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

 * @param {Function} setThemes
 * @param {Function} setActiveTheme
 */
export const loadDefaultThemes = (setThemes, setActiveTheme) => {

  const savedThemes = localStorage.getItem('trustElectThemes');
  if (savedThemes) {
    try {
      const parsedThemes = JSON.parse(savedThemes);
      setThemes(parsedThemes);

      const active = parsedThemes.find(theme => theme.isActive);
      if (active) {
        setActiveTheme(active);
      }
      return;
    } catch (err) {
      console.error("Error parsing saved themes:", err);
    }
  }

  const defaultThemes = [
    {
      id: 1,
      name: "Default Blue",
      isActive: true,
      colors: {
        heroBg: "#1e40af",
        heroText: "#ffffff",
        featureSectionBg: "#f9fafb", 
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
        featureSectionBg: "#111827", 
        featureBg: "#1f2937",
        featureText: "#f9fafb",
        ctaBg: "#374151",
        ctaText: "#f3f4f6"
      }
    }
  ];
  
  setThemes(defaultThemes);
  setActiveTheme(defaultThemes[0]);

  localStorage.setItem('trustElectThemes', JSON.stringify(defaultThemes));
}; 