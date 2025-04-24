"use client"
import { useState, useEffect } from "react";
import axios from "axios";
import { HeroSection, FeaturesSection, CTASection, ThemesSection } from './components';
import * as utils from './utils';

// API base URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function ContentManagement() {
  const [activeTab, setActiveTab] = useState("hero");
  const [saveStatus, setSaveStatus] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  
  // Theme management state
  const [themes, setThemes] = useState([]);
  const [activeTheme, setActiveTheme] = useState(null);
  const [newTheme, setNewTheme] = useState({
    name: "",
    colors: {
      heroBg: "#1e40af",
      heroText: "#ffffff",
      featureSectionBg: "#f9fafb",
      featureBg: "#ffffff",
      featureText: "#000000",
      ctaBg: "#1e3a8a",
      ctaText: "#ffffff"
    }
  });
  
  // Track initial content for detecting changes
  const [initialContent, setInitialContent] = useState(null);
  const [contentTab, setContentTab] = useState('hero'); // Track active content tab

  // Content sections state
  const [content, setContent] = useState({
    hero: {
      title: "",
      subtitle: "",
      actionText: "",
      actionLink: "",
      imageUrl: ""
    },
    features: {
      title: "",
      subtitle: "",
      items: [
        { id: 1, title: "", description: "", icon: "CheckCircleIcon" },
        { id: 2, title: "", description: "", icon: "ShieldCheckIcon" },
        { id: 3, title: "", description: "", icon: "UserGroupIcon" }
      ]
    },
    cta: {
      title: "",
      subtitle: "",
      actionText: "",
      actionLink: ""
    },
    about: {
      title: "",
      content: "",
      imageUrl: ""
    }
  });

  const [landingContent, setLandingContent] = useState({
    hero: {
      title: "Secure Digital Voting Platform",
      subtitle: "Empower your educational institution with reliable election technology",
      videoUrl: null,
      posterImage: null,
      bgColor: "#1e40af", // Default hero background color
      textColor: "#ffffff" // Default hero text color
    },
    features: {
      columns: [
        {
          title: "Easy Setup",
          description: "Simple election configuration process",
          imageUrl: null,
          bgColor: "#ffffff", // Default card background color
          textColor: "#000000"  // Default card text color
        },
        {
          title: "Secure Voting",
          description: "End-to-end encrypted ballot submission",
          imageUrl: null,
          bgColor: "#ffffff",
          textColor: "#000000"
        },
        {
          title: "Real-time Results",
          description: "Instant counting and visualization",
          imageUrl: null,
          bgColor: "#ffffff",
          textColor: "#000000"
        }
      ]
    },
    callToAction: {
      title: "Ready to modernize your election process?",
      subtitle: "Join thousands of educational institutions using TrustElect",
      buttonText: "Contact Us",
      enabled: true,
      bgColor: "#1e3a8a", // Default CTA background color
      textColor: "#ffffff"  // Default CTA text color
    }
  });

  useEffect(() => {
    fetchContent();
    fetchThemes();
  }, []);

  // Apply active theme when it changes
  useEffect(() => {
    if (activeTheme) {
      console.log("Active theme changed, applying colors:", activeTheme.name);
      handleApplyThemeColors(activeTheme);
    }
  }, [activeTheme]);

  useEffect(() => {
    if (initialContent) {
      const hasChanged = initialContent !== JSON.stringify(landingContent);
      setShowPreview(hasChanged);
    }
  }, [landingContent, initialContent]);

  // Validate Feature Card 1 content
  const validateFeatureCard1 = () => {
    // Check if feature card 1 exists and has valid image URL
    if (landingContent.features?.columns?.[0]?.imageUrl) {
      console.log("Feature Card 1 has an image URL:", landingContent.features.columns[0].imageUrl);
      return true;
    } else {
      console.log("Feature Card 1 has no image URL");
      return false;
    }
  };

  // Fetch content from API
  const fetchContent = async () => {
    await utils.fetchContent(
      API_URL,
      setContent,
      setInitialContent,
      setIsLoading,
      setSaveStatus
    );
  };

  // Fetch themes from API
  const fetchThemes = async () => {
    await utils.fetchThemes(API_URL, setThemes, setActiveTheme);
  };

  // Save themes to localStorage
  const saveThemes = (updatedThemes) => {
    localStorage.setItem('trustElectThemes', JSON.stringify(updatedThemes));
  };

  // Update hero section
  const updateHero = (field, value) => {
    utils.updateHero(field, value, landingContent, setLandingContent);
  };

  // Update feature column
  const updateFeature = (index, field, value) => {
    utils.updateFeature(index, field, value, landingContent, setLandingContent);
  };

  // Update call to action
  const updateCTA = (field, value) => {
    utils.updateCTA(field, value, landingContent, setLandingContent);
  };

  // Handle theme color change
  const handleThemeColorChange = (colorKey, colorValue) => {
    utils.handleThemeColorChange(colorKey, colorValue, newTheme, setNewTheme);
  };

  // Apply theme colors
  const handleApplyThemeColors = (theme) => {
    utils.applyThemeColors(
      theme, 
      landingContent, 
      setLandingContent, 
      saveContent, 
      setIsLoading, 
      setSaveStatus
    );
  };

  // Handle file uploads
  const handleFileUpload = (type, index, e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Create preview URL
    const localUrl = URL.createObjectURL(file);
    
    if (type === 'heroVideo') {
      // Check video file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        alert("Video file is too large. Maximum size is 10MB.");
        e.target.value = '';
        return;
      }
      console.log("Updating hero video URL:", localUrl);
      updateHero('videoUrl', localUrl);
    } 
    else if (type === 'heroPoster') {
      // Check image file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        alert("Image file is too large. Maximum size is 5MB.");
        e.target.value = '';
        return;
      }
      console.log("Updating hero poster image URL:", localUrl);
      updateHero('posterImage', localUrl);
    } 
    else if (type === 'featureImage') {
      // Check image file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        alert("Image file is too large. Maximum size is 5MB.");
        e.target.value = '';
        return;
      }
      
      // Special debugging for Feature Card 1 (index 0)
      if (index === 0) {
        console.log("FEATURE CARD 1 IMAGE UPLOAD - index:" + index);
        console.log("Element ID:", e.target.id);
        console.log("Element data-feature-index before:", e.target.getAttribute('data-feature-index'));
      }
      
      // Log the index to verify correct association
      console.log(`Updating feature image ${index} with URL ${localUrl}`);
      
      // Set ID first to ensure it's properly set
      e.target.id = `feature-image-${index}`;
      
      // Ensure data attribute is correctly set - force it to be a string
      e.target.setAttribute('data-feature-index', String(index));
      
      // Double-check that attributes were correctly set
      if (index === 0) {
        console.log("Element data-feature-index after:", e.target.getAttribute('data-feature-index'));
        console.log("Element ID after:", e.target.id);
      }
      
      // Update UI with local URL preview
      updateFeature(index, 'imageUrl', localUrl);
    }
  };

  // Handle removing images
  const removeImage = (type, index) => {
    if (type === 'heroVideo') {
      updateHero('videoUrl', null);
    } 
    else if (type === 'heroPoster') {
      updateHero('posterImage', null);
    } 
    else if (type === 'featureImage') {
      updateFeature(index, 'imageUrl', null);
    }
    
    setSaveStatus('Image removed. Click Save to apply changes.');
    setTimeout(() => setSaveStatus(''), 3000);
  };

  // Special handler for Feature Card 1 to completely isolate it from other components
  const handleFeatureCard1Upload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check image file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image file is too large. Maximum size is 5MB.");
      e.target.value = '';
      return;
    }
    
    // Create preview URL
    const localUrl = URL.createObjectURL(file);
    
    console.log("FEATURE CARD 1 IMAGE UPLOAD (DEDICATED HANDLER)");
    console.log("File name:", file.name);
    console.log("Preview URL:", localUrl);
    
    // Explicitly set attributes to ensure correct processing
    const input = document.getElementById('feature-image-0');
    if (input) {
      input.setAttribute('data-feature-index', '0');
      input.setAttribute('data-section', 'feature');
      console.log("Input attributes set correctly for Feature Card 1");
    }
    
    // Update the state for feature card 1
    updateFeature(0, 'imageUrl', localUrl);
  };

  // Save section content to API
  const saveSectionContent = async (section) => {
    setIsLoading(true);
    setSaveStatus(`Saving ${section} content...`);
    
    try {
      const formData = new FormData();
      let contentData;
      
      // Add section-specific content to formData
      if (section === 'hero') {
        contentData = {
          title: landingContent.hero.title,
          subtitle: landingContent.hero.subtitle,
          videoUrl: landingContent.hero.videoUrl,
          posterImage: landingContent.hero.posterImage,
          bgColor: landingContent.hero.bgColor,
          textColor: landingContent.hero.textColor
        };

        // Add video file if selected
        const videoInput = document.querySelector('input[type="file"][accept*="video"]');
        if (videoInput && videoInput.files.length > 0) {
          formData.append('heroVideo', videoInput.files[0]);
        }
        
        // Add removal flag if video was removed
        if (landingContent.hero.videoUrl === null) {
          formData.append('removeHeroVideo', 'true');
        }

        // Add poster image if selected - use more specific selector to avoid picking feature image inputs
        const imageInput = document.querySelector('#hero-poster-input');
        console.log('Hero image input found:', imageInput ? 'Yes' : 'No');
        
        if (imageInput && imageInput.files.length > 0) {
          console.log('Adding hero poster file:', imageInput.files[0].name);
          formData.append('heroPoster', imageInput.files[0]);
        }
        
        // Add removal flag if poster was removed
        if (landingContent.hero.posterImage === null) {
          formData.append('removeHeroPoster', 'true');
        }
      } else if (section === 'features') {
        // Get theme colors if they exist
        const themeFeatureBg = activeTheme?.colors?.featureBg || "#ffffff";
        const themeFeatureText = activeTheme?.colors?.featureText || "#000000";
        const themeFeatureSectionBg = activeTheme?.colors?.featureSectionBg || "#f9fafb";
        
        // Create a deep copy to avoid reference issues
        contentData = {
          // Add section background color
          sectionBgColor: themeFeatureSectionBg,
          columns: landingContent.features.columns.map(column => ({
            title: column.title,
            description: column.description,
            imageUrl: column.imageUrl,
            // Apply consistent theme colors - individual column colors are deprecated
            bgColor: themeFeatureBg,
            textColor: themeFeatureText
          }))
        };

        console.log('Features content data before sending:', JSON.stringify(contentData));

        // Diagnostic: list all file inputs on the page
        const allFileInputs = document.querySelectorAll('input[type="file"]');
        console.log(`Found ${allFileInputs.length} file inputs on the page`);
        allFileInputs.forEach((input, i) => {
          const dataIndex = input.getAttribute('data-feature-index');
          console.log(`File input ${i}:`, input.accept, 'data-feature-index:', dataIndex);
        });

        // Add feature images if selected - using more specific selector with exact feature index
        landingContent.features.columns.forEach((column, index) => {
          // For Feature Card 1 (index 0), use the specific ID selector
          let fileInput;
          if (index === 0) {
            fileInput = document.getElementById('feature-image-0');
            console.log("FEATURE CARD 1: Using ID selector for upload, input found:", fileInput ? "Yes" : "No");
            
            // Extra validation for Feature Card 1
            if (fileInput) {
              console.log("Feature Card 1 input properties:");
              console.log("- data-feature-index:", fileInput.getAttribute('data-feature-index'));
              console.log("- data-section:", fileInput.getAttribute('data-section'));
              console.log("- id:", fileInput.id);
              console.log("- Has files:", fileInput.files.length > 0 ? "Yes" : "No");
              
              if (fileInput.files.length > 0) {
                console.log("- First file name:", fileInput.files[0].name);
                
                // Explicitly create the feature image entry for index 0
                formData.append("featureImage0", fileInput.files[0]);
                console.log("Explicitly added Feature Card 1 image to formData as 'featureImage0'");
              }
            }
          } else {
            // For other features, use attribute selector
            fileInput = document.querySelector(`input[type="file"][data-feature-index="${index}"]`);
            
            // Process normally
            if (fileInput && fileInput.files.length > 0) {
              console.log(`Found file for feature ${index}:`, fileInput.files[0].name);
              formData.append(`featureImage${index}`, fileInput.files[0]);
              console.log(`Added featureImage${index} to formData`);
            }
          }
          
          // Add removal flag if image was removed for this feature
          if (column.imageUrl === null) {
            console.log(`Adding removal flag for feature ${index}`);
            formData.append(`removeFeatureImage${index}`, 'true');
          }
        });
      } else if (section === 'callToAction') {
        contentData = {
          title: landingContent.callToAction.title,
          subtitle: landingContent.callToAction.subtitle,
          buttonText: landingContent.callToAction.buttonText,
          buttonUrl: landingContent.callToAction.buttonUrl,
          enabled: landingContent.callToAction.enabled,
          bgColor: landingContent.callToAction.bgColor,
          textColor: landingContent.callToAction.textColor
        };
      }

      // Add content JSON to formData
      formData.append('content', JSON.stringify(contentData));

      // Add cache-busting timestamp
      const timestamp = new Date().getTime();
      
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      };
      
      // Send the request to the API
      console.log(`Sending ${section} content to API:`, contentData);
      const response = await axios.post(
        `${API_URL}/api/content/${section}?t=${timestamp}`, 
        formData,
        config
      );
      
      if (response.data && response.data.content) {
        // Update the state with the returned content
        const newContent = { ...landingContent };
        
        // For features section, make sure we properly update each feature's imageUrl
        if (section === 'features' && response.data.content.columns) {
          console.log('Response features data:', JSON.stringify(response.data.content));
          
          // Create a deep copy to avoid reference issues
          newContent.features = {
            columns: response.data.content.columns.map((column, index) => {
              console.log(`Processing feature ${index} from response:`, column);
              
              // Make sure the image URL from the response is correct
              if (column.imageUrl) {
                console.log(`Updated feature ${index} with image URL:`, column.imageUrl);
              }
              
              // Return a clean copy of the column data
              return {
                title: column.title || '',
                description: column.description || '',
                imageUrl: column.imageUrl || null,
                bgColor: column.bgColor || "#ffffff",
                textColor: column.textColor || "#000000"
              };
            })
          };
        } else if (section === 'hero') {
          // For hero section, explicitly set hero properties
          newContent.hero = {
            title: response.data.content.title || '',
            subtitle: response.data.content.subtitle || '',
            videoUrl: response.data.content.videoUrl || null,
            posterImage: response.data.content.posterImage || null,
            bgColor: response.data.content.bgColor || "#1e40af",
            textColor: response.data.content.textColor || "#ffffff"
          };
        } else {
          // For other sections, just update with the response data
        newContent[section] = response.data.content;
        }
        
        console.log(`Setting updated landingContent for ${section}:`, newContent);
        setLandingContent(newContent);
        
        console.log(`Updated ${section} content from API response:`, response.data.content);
        
        // Update the initial content to match current content after save
        setInitialContent(JSON.stringify(newContent));
        setShowPreview(false);
        
        // Also save to localStorage as fallback
        localStorage.setItem('landingContent', JSON.stringify(newContent));
      }
      
      // Clear the file inputs
      const fileInputs = document.querySelectorAll('input[type="file"]');
      fileInputs.forEach(input => {
        input.value = '';
      });
      
      // Set appropriate success message based on section
      let successMessage = '';
      if (section === 'hero') {
        successMessage = 'Banner updated successfully!';
      } else if (section === 'features') {
        successMessage = 'Feature cards updated successfully!';
      } else if (section === 'callToAction') {
        successMessage = 'Updated successfully!';
      } else {
        successMessage = `${section} saved!`;
      }
      
      setSaveStatus(successMessage);
      setTimeout(() => setSaveStatus(""), 2000);
    } catch (error) {
      console.error(`Error saving ${section}:`, error);
      setSaveStatus(`Error: ${error.message || 'Failed to save'}`);
      setTimeout(() => setSaveStatus(""), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  // Save all content
  const saveContent = async () => {
    setSaveStatus("Applying all changes...");
    
    try {
      // Save features first to prevent hero from overriding feature card 1
      console.log("First saving features section...");
      await saveSectionContent('features');
      
      console.log("Now saving hero section...");
      await saveSectionContent('hero');
      
      console.log("Finally saving callToAction section...");
      await saveSectionContent('callToAction');
      
      // Fetch updated content to ensure everything is in sync
      console.log("Fetching fresh content after all saves...");
      await fetchContent();
      
      setSaveStatus("All changes applied successfully!");
      setTimeout(() => setSaveStatus(""), 2000);
    } catch (error) {
      console.error("Error saving content:", error);
      setSaveStatus(`Error: ${error.message || 'Failed to save all content'}`);
      setTimeout(() => setSaveStatus(""), 5000);
    }
  };

  // Function to toggle preview manually
  const togglePreview = () => {
    setShowPreview(!showPreview);
  };

  // Format image URL to ensure it points to the API
  const formatImageUrl = (url) => {
    return utils.formatImageUrl(url, API_URL);
  };

  // Add a new feature card
  const addFeatureCard = () => {
    setLandingContent(prev => ({
      ...prev,
      features: {
        ...prev.features,
        columns: [
          ...prev.features.columns,
          {
            title: "New Feature",
            description: "Describe your new feature here",
            imageUrl: null,
            bgColor: "#ffffff",
            textColor: "#000000"
          }
        ]
      }
    }));
  };

  // Delete a feature card
  const deleteFeatureCard = (index) => {
    // Don't allow deleting if there's only one card left
    if (landingContent.features.columns.length <= 1) {
      setSaveStatus("Cannot delete the last feature card");
      setTimeout(() => setSaveStatus(""), 3000);
      return;
    }

    setLandingContent(prev => ({
      ...prev,
      features: {
        ...prev.features,
        columns: prev.features.columns.filter((_, i) => i !== index)
      }
    }));
    
    setSaveStatus('Feature card removed. Click Save to apply changes.');
    setTimeout(() => setSaveStatus(''), 3000);
  };

  // Handle content change
  const handleContentChange = (section, field, value) => {
    setContent(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  // Handle feature item change
  const handleFeatureItemChange = (index, field, value) => {
    setContent(prev => {
      const updatedFeatures = {...prev.features};
      updatedFeatures.items = [...updatedFeatures.items];
      updatedFeatures.items[index] = {
        ...updatedFeatures.items[index],
        [field]: value
      };
      return {
        ...prev,
        features: updatedFeatures
      };
    });
  };

  // Check if content has changed
  const hasContentChanged = () => {
    return utils.hasContentChanged(content, initialContent);
  };

  // Save content changes
  const saveContentChanges = async () => {
    setSaveStatus('saving');
    try {
      const response = await fetch('/api/content', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(content),
      });

      if (response.ok) {
        setInitialContent(JSON.parse(JSON.stringify(content)));
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus(''), 3000);
      } else {
        setSaveStatus('error');
        console.error('Failed to save content');
      }
    } catch (error) {
      setSaveStatus('error');
      console.error('Error saving content:', error);
    }
  };

  useEffect(() => {
    if (activeTab === "content") {
      fetchContent();
    } else if (activeTab === "themes") {
      fetchThemes();
    }
  }, [activeTab]);

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold text-black">Content Management</h1>
          
          <div className="flex items-center space-x-2">
            {saveStatus && (
              <span className={`text-sm px-2 py-1 rounded ${
                saveStatus.includes("Error") 
                  ? "bg-red-100 text-red-800" 
                  : saveStatus.includes("Saving")
                    ? "bg-blue-100 text-blue-800"
                    : "bg-green-100 text-green-800"
              }`}>
                {saveStatus}
              </span>
            )}
            
            <button 
              onClick={togglePreview}
              className="px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
            >
              {showPreview ? "Hide Preview" : "Show Preview"}
            </button>
            
            <button 
              onClick={saveContent}
              disabled={isLoading}
              className={`px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? 'Loading...' : 'Save All Changes'}
            </button>
          </div>
        </div>
        
        <div className="bg-white rounded shadow mb-4">
          <div className="flex border-b">
            <button 
              className={`px-3 py-2 text-sm ${activeTab === 'hero' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-black'}`}
              onClick={() => setActiveTab('hero')}
            >
              Banner
            </button>
            <button 
              className={`px-3 py-2 text-sm ${activeTab === 'features' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-black'}`}
              onClick={() => setActiveTab('features')}
            >
              Feature Cards
            </button>
            <button 
              className={`px-3 py-2 text-sm ${activeTab === 'cta' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-black'}`}
              onClick={() => setActiveTab('cta')}
            >
              CTA
            </button>
            <button 
              className={`px-3 py-2 text-sm ${activeTab === 'themes' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-black'}`}
              onClick={() => setActiveTab('themes')}
            >
              Themes
            </button>
          </div>
          
          <div className="p-4">
            {/* Hero Section */}
            {activeTab === 'hero' && (
              <HeroSection 
                landingContent={landingContent}
                updateHero={updateHero}
                saveSectionContent={saveSectionContent}
                formatImageUrl={formatImageUrl}
                handleFileUpload={handleFileUpload}
                removeImage={removeImage}
                showPreview={showPreview}
              />
            )}
            
            {/* Features Section */}
            {activeTab === 'features' && (
              <FeaturesSection 
                landingContent={landingContent}
                updateFeature={updateFeature}
                saveSectionContent={saveSectionContent}
                formatImageUrl={formatImageUrl}
                handleFileUpload={handleFileUpload}
                removeImage={removeImage}
                addFeatureCard={addFeatureCard}
                deleteFeatureCard={deleteFeatureCard}
                showPreview={showPreview}
                handleFeatureCard1Upload={handleFeatureCard1Upload}
              />
            )}
            
            {/* Call to Action Section */}
            {activeTab === 'cta' && (
              <CTASection 
                landingContent={landingContent}
                updateCTA={updateCTA}
                saveSectionContent={saveSectionContent}
                showPreview={showPreview}
              />
            )}

            {/* Themes Section */}
            {activeTab === 'themes' && (
              <ThemesSection 
                themes={themes}
                setThemes={setThemes}
                activeTheme={activeTheme}
                setActiveTheme={setActiveTheme}
                newTheme={newTheme}
                setNewTheme={setNewTheme}
                saveThemes={saveThemes}
                setSaveStatus={setSaveStatus}
                applyThemeColors={handleApplyThemeColors}
                handleThemeColorChange={handleThemeColorChange}
              />
            )}
          </div>
        </div>
        
        {/* Save Button */}
        <div className="flex items-center mt-6">
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors disabled:bg-gray-400"
            onClick={saveContentChanges}
            disabled={!hasContentChanged() || saveStatus === 'saving'}
          >
            Save Changes
          </button>
          
          {saveStatus === 'saving' && (
            <span className="ml-3 text-yellow-600">Saving...</span>
          )}
          
          {saveStatus === 'saved' && (
            <span className="ml-3 text-green-600">Changes saved!</span>
          )}
          
          {saveStatus === 'error' && (
            <span className="ml-3 text-red-600">Error saving changes</span>
          )}
        </div>
      </div>
    </div>
  );
}