"use client"

/**
 * Theme color change handler
 * @param {string} colorKey - The color key to update (e.g., 'heroBg', 'heroText')
 * @param {string} colorValue - The new color value (hex)
 * @param {Object} newTheme - The current theme object
 * @param {Function} setNewTheme - Function to update the theme object
 */
export const handleThemeColorChange = (colorKey, colorValue, newTheme, setNewTheme) => {
  setNewTheme({
    ...newTheme,
    colors: {
      ...newTheme.colors,
      [colorKey]: colorValue
    }
  });
};

/**
 * Apply theme colors to site content
 * @param {Object} theme - The theme to apply
 * @param {Object} landingContent - The current landing content
 * @param {Function} setLandingContent - Function to update the landing content
 * @param {Function} saveContent - Function to save all content
 * @param {Function} setIsLoading - Function to update the loading state
 * @param {Function} setSaveStatus - Function to update the save status
 */
export const applyThemeColors = (theme, landingContent, setLandingContent, saveContent, setIsLoading, setSaveStatus) => {
  console.log("Applying theme colors with direct function:", theme.name);
  // Use a temporary variable to create a completely new object
  const updatedContent = JSON.parse(JSON.stringify(landingContent));
  
  // Update hero colors
  updatedContent.hero.bgColor = theme.colors.heroBg;
  updatedContent.hero.textColor = theme.colors.heroText;
  
  // Add the feature section background color
  updatedContent.features.sectionBgColor = theme.colors.featureSectionBg;
  
  // Update all feature columns to have consistent colors
  updatedContent.features.columns = updatedContent.features.columns.map(column => ({
    ...column,
    bgColor: theme.colors.featureBg,
    textColor: theme.colors.featureText
  }));
  
  // Update CTA colors
  updatedContent.callToAction.bgColor = theme.colors.ctaBg;
  updatedContent.callToAction.textColor = theme.colors.ctaText;
  
  console.log("Updated content with applied theme:", updatedContent);
  
  // Set the new content state
  setLandingContent(updatedContent);
  
  // Force a refresh of the UI
  setIsLoading(true);
  
  // Add a small delay and then save all sections
  setTimeout(() => {
    setIsLoading(false);
    console.log("Auto-saving theme changes...");
    setSaveStatus("Saving theme changes...");
    
    // Use saveContent to save all sections at once
    saveContent().then(() => {
      console.log("Theme changes saved successfully");
      setSaveStatus("Theme applied and saved!");
      setTimeout(() => setSaveStatus(""), 3000);
    }).catch(error => {
      console.error("Error saving theme changes:", error);
      setSaveStatus("Theme applied but not saved - click Save All Changes");
    });
  }, 300);
}; 