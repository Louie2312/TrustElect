"use client"
import { useState, useEffect } from "react";
import axios from "axios";
import { HeroSection, FeaturesSection, CTASection, ThemesSection, CandidatesSection } from './components';
import * as utils from './utils';
import { updateAllBackgrounds, updateCTASettings } from './utils/themeUtils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function ContentManagement() {
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
    hero: {
      title: "TrustElect Voting Platform",
      subtitle: "STI TrustElect Voting System",
      videoUrl: null,
      posterImage: null,
      bgColor: "#1e40af",
      textColor: "#ffffff" 
    },
    features: {
      columns: [
        {
          title: "Easy Setup",
          description: "Simple election  process",
          imageUrl: null,
          bgColor: "#ffffff", 
          textColor: "#000000"  
        },
        {
          title: "Secure Voting",
          description: "End-to-end encryption votes",
          imageUrl: null,
          bgColor: "#ffffff",
          textColor: "#000000"
        },
        {
          title: "Real-time Results",
          description: "Instant counting and results",
          imageUrl: null,
          bgColor: "#ffffff",
          textColor: "#000000"
        }
      ]
    },
    callToAction: {
      title: "Ready to Vote?",
      subtitle: "Start your experience with TrustElect.",
      buttonText: "Contact Us",
      enabled: true,
      bgColor: "#1e3a8a", 
      textColor: "#ffffff",  
      mediaType: null,
      mediaPosition: null,
      purpose: null
    },
    candidates: {
      title: "Election Candidates",
      subtitle: "Meet the candidates running in this election",
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
    await utils.fetchContent(
      API_URL,
      setContent,
      setInitialContent,
      setIsLoading,
      setSaveStatus
    );
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
    utils.applyThemeColors(
      theme, 
      landingContent, 
      setLandingContent, 
      saveContent, 
      setIsLoading, 
      setSaveStatus
    );
  };

  const handleFileUpload = (type, index, e) => {
    const file = e.target.files[0];
    if (!file) return;

    const localUrl = URL.createObjectURL(file);
    
    if (type === 'heroVideo') {
      if (file.size > 50 * 1024 * 1024) {
        alert("Video file is too large. Maximum size is 50MB.");
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
    setSaveStatus(`Saving ${section} content...`);
    
    try {
      const formData = new FormData();
      let contentData;

      if (section === 'hero') {
        contentData = {
          title: landingContent.hero.title,
          subtitle: landingContent.hero.subtitle,
          videoUrl: landingContent.hero.videoUrl,
          posterImage: landingContent.hero.posterImage,
          bgColor: landingContent.hero.bgColor,
          textColor: landingContent.hero.textColor
        };

        const videoInput = document.querySelector('input[type="file"][accept*="video"]');
        if (videoInput && videoInput.files.length > 0) {
          formData.append('heroVideo', videoInput.files[0]);
        }
        
        if (landingContent.hero.videoUrl === null) {
          formData.append('removeHeroVideo', 'true');
        }

        const imageInput = document.querySelector('#hero-poster-input');

        
        if (imageInput && imageInput.files.length > 0) {
       
          formData.append('heroPoster', imageInput.files[0]);
        }
        
        if (landingContent.hero.posterImage === null) {
          formData.append('removeHeroPoster', 'true');
        }
      } else if (section === 'features') {
   
        const themeFeatureBg = activeTheme?.colors?.featureBg || "#ffffff";
        const themeFeatureText = activeTheme?.colors?.featureText || "#000000";
        const themeFeatureSectionBg = activeTheme?.colors?.featureSectionBg || "#f9fafb";

        contentData = {

          sectionBgColor: themeFeatureSectionBg,
          columns: landingContent.features.columns.map(column => ({
            title: column.title,
            description: column.description,
            imageUrl: column.imageUrl,
            bgColor: themeFeatureBg,
            textColor: themeFeatureText
          }))
        };

        const allFileInputs = document.querySelectorAll('input[type="file"]');
        allFileInputs.forEach((input, i) => {
          const dataIndex = input.getAttribute('data-feature-index');
        });

        landingContent.features.columns.forEach((column, index) => {
          let fileInput;
          if (index === 0) {
            fileInput = document.getElementById('feature-image-0');
            if (fileInput) {
             
              if (fileInput.files.length > 0) {
         
                formData.append("featureImage0", fileInput.files[0]);
          
              }
            }
          } else {

            if (fileInput && fileInput.files.length > 0) {
              formData.append(`featureImage${index}`, fileInput.files[0]);
     
            }
          }
                  
          if (column.imageUrl === null) {
           
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
          textColor: landingContent.callToAction.textColor,
          purpose: landingContent.callToAction.purpose || 'default'
        };

        const mediaInput = document.querySelector('#cta-media-input');
        if (mediaInput && mediaInput.files.length > 0) {
          formData.append('ctaMedia', mediaInput.files[0]);
        }
        
     
        if (landingContent.callToAction.mediaUrl === null) {
          formData.append('removeCtaMedia', 'true');
        }
      } else if (section === 'candidates') {
        contentData = {
          title: landingContent.candidates.title,
          subtitle: landingContent.candidates.subtitle,
          sectionBgColor: landingContent.candidates.sectionBgColor,
          textColor: landingContent.candidates.textColor,
          items: landingContent.candidates.items || []
        };
        
      
        if (landingContent.candidates.items && landingContent.candidates.items.length > 0) {
          landingContent.candidates.items.forEach((candidate, index) => {
            if (candidate.photoUrl && candidate.photoUrl.startsWith('blob:')) {
            
              const candidatePhotoInput = document.querySelector(`#candidate-photo-${index}`);
              if (candidatePhotoInput && candidatePhotoInput.files.length > 0) {
                formData.append(`candidatePhoto${index}`, candidatePhotoInput.files[0]);
              }
            }
          });
        }
      }

      formData.append('content', JSON.stringify(contentData));

      const timestamp = new Date().getTime();
      
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      };
      
      const response = await axios.post(
        `${API_URL}/api/content/${section}?t=${timestamp}`, 
        formData,
        config
      );
      
      if (response.data && response.data.content) {
 
        const newContent = { ...landingContent };

        if (section === 'features' && response.data.content.columns) {
  
          newContent.features = {
            columns: response.data.content.columns.map((column, index) => {
        
            
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

          newContent.hero = {
            title: response.data.content.title || '',
            subtitle: response.data.content.subtitle || '',
            videoUrl: response.data.content.videoUrl || null,
            posterImage: response.data.content.posterImage || null,
            bgColor: response.data.content.bgColor || "#1e40af",
            textColor: response.data.content.textColor || "#ffffff"
          };
        } else {
 
        newContent[section] = response.data.content;
        }
        
        setLandingContent(newContent);
        setInitialContent(JSON.stringify(newContent));
        setShowPreview(false);

        localStorage.setItem('landingContent', JSON.stringify(newContent));
      }
      
      const fileInputs = document.querySelectorAll('input[type="file"]');
      fileInputs.forEach(input => {
        input.value = '';
      });
    
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
      setSaveStatus(`Error: ${error.message || 'Failed to save all content'}`);
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