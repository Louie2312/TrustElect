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
 * Update all background colors at once
 * @param {string} colorValue - The new color value (hex)
 * @param {Object} theme - The theme to update
 * @returns {Object} - Updated theme object
 */
export const updateAllBackgrounds = (colorValue, theme) => {
  return {
    ...theme,
    colors: {
      ...theme.colors,
      heroBg: colorValue,
      featureSectionBg: colorValue,
      featureBg: colorValue,
      ctaBg: colorValue
    }
  };
};

/**
 * Update CTA settings
 * @param {string} colorValue - The new color value (hex)
 * @param {string} purpose - The purpose/type of CTA
 * @param {string} mediaType - The type of media to display (image, video, flash)
 * @param {Object} theme - The theme to update
 * @param {Object} landingContent - The current landing content
 * @param {Function} setLandingContent - Function to update landing content
 * @returns {Object} - Updated theme object
 */
export const updateCTASettings = (colorValue, purpose, mediaType, theme, landingContent, setLandingContent) => {
  // CTA configurations based on purpose
  const ctaConfigs = {
    signup: {
      title: "Ready to create your first election?",
      subtitle: "Sign up now to get started with TrustElect",
      buttonText: "Sign Up",
      buttonUrl: "/signup"
    },
    demo: {
      title: "Want to see how it works?",
      subtitle: "Request a demo to experience TrustElect in action",
      buttonText: "Request Demo",
      buttonUrl: "/request-demo"
    },
    contact: {
      title: "Questions about our platform?",
      subtitle: "Our team is ready to help your institution",
      buttonText: "Contact Us",
      buttonUrl: "/contact"
    },
    learn: {
      title: "Discover what TrustElect can do for you",
      subtitle: "Learn more about our features and benefits",
      buttonText: "Learn More",
      buttonUrl: "/features"
    },
    quote: {
      title: "Ready to get started?",
      subtitle: "Request a customized quote for your institution",
      buttonText: "Get Quote",
      buttonUrl: "/quote"
    },
    custom: {
      title: landingContent?.callToAction?.title || "Ready to modernize your election process?",
      subtitle: landingContent?.callToAction?.subtitle || "Join thousands of educational institutions using TrustElect",
      buttonText: landingContent?.callToAction?.buttonText || "Get Started",
      buttonUrl: landingContent?.callToAction?.buttonUrl || "/contact"
    }
  };

  if (landingContent && setLandingContent) {
    const ctaConfig = purpose && ctaConfigs[purpose] ? ctaConfigs[purpose] : ctaConfigs.custom;
    
    const updatedContent = {
      ...landingContent,
      callToAction: {
        ...landingContent.callToAction,
        title: ctaConfig.title,
        subtitle: ctaConfig.subtitle,
        buttonText: ctaConfig.buttonText,
        buttonUrl: ctaConfig.buttonUrl,
        mediaType: mediaType || "none",
        bgColor: colorValue || landingContent.callToAction.bgColor
      }
    };
    
    setLandingContent(updatedContent);
  }
  
  // Return updated theme
  return {
    ...theme,
    colors: {
      ...theme.colors,
      ctaBg: colorValue || theme.colors.ctaBg
    },
    ctaConfig: {
      ...theme.ctaConfig,
      purpose: purpose || theme.ctaConfig?.purpose || "default",
      mediaType: mediaType || theme.ctaConfig?.mediaType || "none"
    }
  };
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
  
  // Apply CTA configuration if available
  if (theme.ctaConfig) {
    if (theme.ctaConfig.purpose && theme.ctaConfig.purpose !== "default") {
      // Use updateCTASettings to apply the correct CTA content based on purpose
      return updateCTASettings(
        theme.colors.ctaBg,
        theme.ctaConfig.purpose,
        theme.ctaConfig.mediaType,
        theme,
        updatedContent,
        setLandingContent
      );
    }
  }
  
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