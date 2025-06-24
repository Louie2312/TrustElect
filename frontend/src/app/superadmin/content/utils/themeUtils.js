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
  if (!theme) return;

  const newContent = {
    ...landingContent,
    hero: {
      ...landingContent.hero,
      bgColor: theme.colors.heroBg,
      textColor: theme.colors.heroText
    },
    features: {
      ...landingContent.features,
      columns: landingContent.features.columns.map(column => ({
        ...column,
        bgColor: theme.colors.featureBg,
        textColor: theme.colors.featureText
      }))
    },
    callToAction: {
      ...landingContent.callToAction,
      bgColor: theme.colors.ctaBg,
      textColor: theme.colors.ctaText
    }
  };

  setLandingContent(newContent);
  
  // Only save if saveContent function is provided
  if (saveContent && typeof saveContent === 'function') {
    saveContent();
  }
}; 