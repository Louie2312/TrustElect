"use client"
import { useState, useEffect } from "react";
import axios from "axios";
import Cookies from 'js-cookie';
import { HeroSection, FeaturesSection, CTASection, ThemesSection, CandidatesSection, LogoSection } from './components';
import * as utils from './utils';
import { updateAllBackgrounds, updateCTASettings } from './utils/themeUtils';
import usePermissions from "../../../hooks/usePermissions";

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export default function ContentManagement() {
  const { hasPermission, permissionsLoading } = usePermissions();
  if (!permissionsLoading && !hasPermission('cms', 'view')) {
    return <div className="p-8 text-center text-red-600 font-bold">You do not have permission to view content management.</div>;
  }

  const [activeTab, setActiveTab] = useState("hero");
  const [saveStatus, setSaveStatus] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);

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
  
  const [initialContent, setInitialContent] = useState(null);
  const [contentTab, setContentTab] = useState('hero'); 

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
    },
    candidates: {
      title: "Election Candidates",
      subtitle: "Meet the candidates running in this election",
      items: []
    }
  });

  const [landingContent, setLandingContent] = useState({
    logo: {
      imageUrl: null
    },
    hero: {
      title: "",
      subtitle: "",
      videoUrl: null,
      posterImage: null,
      bgColor: "#1e40af",
      textColor: "#ffffff" 
    },
    features: {
      columns: []
    },
    callToAction: {
      title: "",
      subtitle: "",
      buttonText: "",
      enabled: true,
      bgColor: "#1e3a8a", 
      textColor: "#ffffff",  
      mediaType: null,
      mediaPosition: null,
      purpose: null
    },
    candidates: {
      title: "",
      subtitle: "",
      sectionBgColor: "#f9fafb", 
      textColor: "#000000", 
      items: []
    }
  });

  useEffect(() => {
    fetchContent();
    fetchThemes();
  }, []);

  useEffect(() => {
    if (activeTheme) {
      console.log("Active theme changed:", activeTheme.name);
    }
  }, [activeTheme]);

  useEffect(() => {
    if (initialContent) {
      const hasChanged = initialContent !== JSON.stringify(landingContent);
      setShowPreview(hasChanged);
    }
  }, [landingContent, initialContent]);

  const validateFeatureCard1 = () => {
    if (landingContent.features?.columns?.[0]?.imageUrl) {
      console.log("Feature Card 1 has an image URL:", landingContent.features.columns[0].imageUrl);
      return true;
    } else {
      console.log("Feature Card 1 has no image URL");
      return false;
    }
  };

  const fetchContent = async () => {
    setIsLoading(true);
    try {
      const token = Cookies.get('token');
      const sections = ['logo', 'hero', 'features', 'callToAction', 'candidates'];
      const contentData = {};

      // Fetch content for each section
      for (const section of sections) {
        try {
          const response = await axios.get(`${API_URL}/content/${section}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.data && response.data.content) {
            contentData[section] = response.data.content;
          }
        } catch (error) {
          console.error(`Error fetching ${section} content:`, error);
        }
      }

      // Only update the state if we have content
      if (Object.keys(contentData).length > 0) {
        const newContent = {
          logo: contentData.logo || landingContent.logo,
          hero: contentData.hero || landingContent.hero,
          features: contentData.features || landingContent.features,
          callToAction: contentData.callToAction || landingContent.callToAction,
          candidates: contentData.candidates || landingContent.candidates
        };

        // Ensure features has columns array
        if (!newContent.features.columns) {
          newContent.features.columns = [];
        }

        // Ensure candidates has items array
        if (!newContent.candidates.items) {
          newContent.candidates.items = [];
        }

        setLandingContent(newContent);
        setInitialContent(JSON.stringify(newContent));
        console.log('Content loaded:', newContent);
      }
    } catch (error) {
      console.error("Error fetching content:", error);
      setSaveStatus("Error loading content. Please refresh the page.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchThemes = async () => {
    await utils.fetchThemes(API_URL, setThemes, setActiveTheme);
  };

  const saveThemes = (updatedThemes) => {
    localStorage.setItem('trustElectThemes', JSON.stringify(updatedThemes));
  };

  const updateHero = (field, value) => {
    utils.updateHero(field, value, landingContent, setLandingContent);
  };

  const updateFeature = (index, field, value) => {
    utils.updateFeature(index, field, value, landingContent, setLandingContent);
  };

  const updateCTA = (field, value) => {
    utils.updateCTA(field, value, landingContent, setLandingContent);
  };

  const updateCandidates = (field, value) => {
    setLandingContent(prev => ({
      ...prev,
      candidates: {
        ...prev.candidates,
        [field]: value
      }
    }));
  };

  const handleThemeColorChange = (colorKey, colorValue) => {
    utils.handleThemeColorChange(colorKey, colorValue, newTheme, setNewTheme);
  };

  const handleBulkBackgroundUpdate = (color, theme) => {
 
    const updatedTheme = updateAllBackgrounds(color, theme);

    if (theme.isActive) {
      applyThemeColors(updatedTheme);
    }
    
    return updatedTheme;
  };

  const handleCTAUpdate = (color, purpose, mediaType, theme) => {
    const updatedTheme = updateCTASettings(
      color, 
      purpose, 
      mediaType,
      theme, 
      landingContent, 
      setLandingContent
    );
 
    if (theme.isActive) {
      applyThemeColors(updatedTheme);
    }
    
    return updatedTheme;
  };

  const handleApplyThemeColors = (theme) => {
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
    setShowPreview(true);
  };

  const handleFileUpload = (type, index, e) => {
    const file = e.target.files[0];
    if (!file) return;

    const localUrl = URL.createObjectURL(file);
    
    if (type === 'heroVideo') {
      if (file.size > 200 * 1024 * 1024) {
        alert("Video file is too large. Maximum size is 200MB.");
        e.target.value = '';
        return;
      }
      console.log("Updating hero video URL:", localUrl);
      updateHero('videoUrl', localUrl);
    } 
    else if (type === 'heroPoster') {
      if (file.size > 5 * 1024 * 1024) {
        alert("Image file is too large. Maximum size is 5MB.");
        e.target.value = '';
        return;
      }
      console.log("Updating hero poster image URL:", localUrl);
      updateHero('posterImage', localUrl);
    }
    else if (type === 'ctaVideo') {
      if (file.size > 200 * 1024 * 1024) {
        alert("Video file is too large. Maximum size is 200MB.");
        e.target.value = '';
        return;
      }
      console.log("Updating CTA video URL:", localUrl);
      updateCTA('videoUrl', localUrl);
    } 
    else if (type === 'featureImage') {
      if (file.size > 5 * 1024 * 1024) {
        alert("Image file is too large. Maximum size is 5MB.");
        e.target.value = '';
        return;
      }

      if (index === 0) {
        console.log("FEATURE CARD 1 IMAGE UPLOAD - index:" + index);
        console.log("Element ID:", e.target.id);
        console.log("Element data-feature-index before:", e.target.getAttribute('data-feature-index'));
      }

      console.log(`Updating feature image ${index} with URL ${localUrl}`);

      e.target.id = `feature-image-${index}`;

      e.target.setAttribute('data-feature-index', String(index));
 
      if (index === 0) {
        console.log("Element data-feature-index after:", e.target.getAttribute('data-feature-index'));
        console.log("Element ID after:", e.target.id);
      }

      updateFeature(index, 'imageUrl', localUrl);
    }
  };

  const removeImage = (type, index) => {
    if (type === 'heroVideo') {
      updateHero('videoUrl', null);
    } 
    else if (type === 'heroPoster') {
      updateHero('posterImage', null);
    } 
    else if (type === 'ctaVideo') {
      updateCTA('videoUrl', null);
    }
    else if (type === 'featureImage') {
      updateFeature(index, 'imageUrl', null);
    }
    
    setSaveStatus('Image removed. Click Save to apply changes.');
    setTimeout(() => setSaveStatus(''), 3000);
  };

  const handleFeatureCard1Upload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Image file is too large. Maximum size is 5MB.");
      e.target.value = '';
      return;
    }

    const localUrl = URL.createObjectURL(file);
    
   

    const input = document.getElementById('feature-image-0');
    if (input) {
      input.setAttribute('data-feature-index', '0');
      input.setAttribute('data-section', 'feature');

    }

    updateFeature(0, 'imageUrl', localUrl);
  };

  const saveSectionContent = async (section) => {
    setIsLoading(true);
    setSaveStatus("Saving...");
    
    try {
      const token = Cookies.get('token');
      const formData = new FormData();
      
      // Create content data based on section
      let contentData;
      
      if (section === 'logo') {
        contentData = {
          imageUrl: landingContent.logo.imageUrl
        };
        
        // Append logo file if selected
        const logoInput = document.querySelector('#logo-input');
        if (logoInput && logoInput.files.length > 0) {
          formData.append('logo', logoInput.files[0]);
        }
        
        if (landingContent.logo.imageUrl === null) {
          formData.append('removeLogo', 'true');
        }
      } else if (section === 'hero') {
        contentData = {
          title: landingContent.hero.title,
          subtitle: landingContent.hero.subtitle,
          videoUrl: landingContent.hero.videoUrl,
          posterImage: landingContent.hero.posterImage,
          bgColor: landingContent.hero.bgColor,
          textColor: landingContent.hero.textColor
        };
  
        // Append hero video file if selected
        const videoInput = document.querySelector('#hero-video-input');
        if (videoInput && videoInput.files.length > 0) {
          formData.append('heroVideo', videoInput.files[0]);
        }
        
        if (landingContent.hero.videoUrl === null) {
          formData.append('removeHeroVideo', 'true');
        }
  
        // Append hero poster file if selected
        const imageInput = document.querySelector('#hero-poster-input');
        if (imageInput && imageInput.files.length > 0) {
          formData.append('heroPoster', imageInput.files[0]);
        }
        
        if (landingContent.hero.posterImage === null) {
          formData.append('removeHeroPoster', 'true');
        }
      } else if (section === 'features') {
        // Handle features section
        contentData = { ...landingContent[section] };
        
        // Handle feature images
        landingContent.features.columns.forEach((feature, index) => {
          const featureInput = document.querySelector(`#feature-image-${index}`);
          if (featureInput && featureInput.files.length > 0) {
            formData.append(`featureImage${index}`, featureInput.files[0]);
          }
        });
      } else if (section === 'callToAction') {
        // Handle CTA section
        contentData = {
          title: landingContent.callToAction.title,
          subtitle: landingContent.callToAction.subtitle,
          buttonText: landingContent.callToAction.buttonText,
          buttonUrl: landingContent.callToAction.buttonUrl,
          enabled: landingContent.callToAction.enabled,
          videoUrl: landingContent.callToAction.videoUrl,
          bgColor: landingContent.callToAction.bgColor,
          textColor: landingContent.callToAction.textColor,
          purpose: landingContent.callToAction.purpose
        };

        // Append CTA video file if selected
        const ctaVideoInput = document.querySelector('#cta-video-input');
        if (ctaVideoInput && ctaVideoInput.files.length > 0) {
          formData.append('ctaVideo', ctaVideoInput.files[0]);
        }
        
        if (landingContent.callToAction.videoUrl === null) {
          formData.append('removeCtaVideo', 'true');
        }
      } else {
        // For other sections, just use the content as-is
        contentData = { ...landingContent[section] };
      }
      
      formData.append('content', JSON.stringify(contentData));
      
      const response = await axios.post(
        `${API_URL}/content/${section}`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
  
      if (response.status === 200) {
        setSaveStatus("Changes saved successfully!");
        // Update initialContent to reflect the saved state
        setInitialContent(JSON.stringify(landingContent));
        setShowPreview(false);
      }
    } catch (error) {
      console.error("Error saving content:", error);
      
      // Handle specific error cases
      let errorMessage = "Error saving changes. Please try again.";
      if (error.status === 413 || error.response?.status === 413) {
        errorMessage = 'File too large. Please try a smaller video file (max 200MB).';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      setSaveStatus(errorMessage);
    } finally {
      setIsLoading(false);
      // Clear save status after 3 seconds
      setTimeout(() => setSaveStatus(""), 3000);
    }
  };

  const saveContent = async () => {
    setSaveStatus("Applying all changes...");
    
    try {

      await saveSectionContent('features');

      await saveSectionContent('hero');

      await saveSectionContent('callToAction');

      await fetchContent();
      
      setSaveStatus("All changes applied successfully!");
      setTimeout(() => setSaveStatus(""), 2000);
    } catch (error) {
      console.error("Error saving content:", error);
      
      // Handle specific error cases
      let errorMessage = error.message || 'Failed to save all content';
      if (error.status === 413 || error.response?.status === 413) {
        errorMessage = 'File too large. Please try a smaller video file (max 200MB).';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      setSaveStatus(`Error: ${errorMessage}`);
      setTimeout(() => setSaveStatus(""), 5000);
    }
  };

  const togglePreview = () => {
    setShowPreview(!showPreview);
  };

  const formatImageUrl = (url) => {
    return utils.formatImageUrl(url, API_URL);
  };

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


  const deleteFeatureCard = (index) => {

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


  const handleContentChange = (section, field, value) => {
    setContent(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };


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

  const hasContentChanged = () => {
    return utils.hasContentChanged(content, initialContent);
  };

  const updateLogo = (field, value) => {
    setLandingContent(prev => ({
      ...prev,
      logo: {
        ...prev.logo,
        [field]: value
      }
    }));
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
              className={`px-3 py-2 text-sm ${activeTab === 'logo' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-black'}`}
              onClick={() => setActiveTab('logo')}
            >
              Logo
            </button>
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
              Engagement
            </button>
            {/* 
            <button 
              className={`px-3 py-2 text-sm ${activeTab === 'candidates' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-black'}`}
              onClick={() => setActiveTab('candidates')}
            >
              Candidates
            </button>
            */}
            <button 
              className={`px-3 py-2 text-sm ${activeTab === 'themes' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-black'}`}
              onClick={() => setActiveTab('themes')}
            >
              Themes
            </button>
          </div>
          
          <div className="p-4">
            {/* Logo Section */}
            {activeTab === 'logo' && (
              <LogoSection 
                landingContent={landingContent}
                updateLogo={updateLogo}
                saveSectionContent={saveSectionContent}
                formatImageUrl={formatImageUrl}
                handleFileUpload={handleFileUpload}
                removeImage={removeImage}
                showPreview={showPreview}
              />
            )}
            
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
                handleFileUpload={handleFileUpload}
                removeMedia={removeImage}
                formatImageUrl={formatImageUrl}
              />
            )}
            
            {/* Candidates Section */}
            {activeTab === 'candidates' && (
              <CandidatesSection 
                landingContent={landingContent}
                updateCandidates={updateCandidates}
                saveSectionContent={saveSectionContent}
                showPreview={showPreview}
                handleFileUpload={handleFileUpload}
                removeMedia={removeImage}
                formatImageUrl={formatImageUrl}
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
                handleBulkBackgroundUpdate={handleBulkBackgroundUpdate}
                handleCTAUpdate={handleCTAUpdate}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}