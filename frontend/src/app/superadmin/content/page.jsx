"use client"
import { useState, useEffect } from "react";
import axios from "axios";
import Cookies from 'js-cookie';
import { HeroSection, FeaturesSection, CTASection, ThemesSection, CandidatesSection, LogoSection } from './components';
import ElectionCarousel from './components/ElectionCarousel';
import * as utils from './utils';
import { updateAllBackgrounds, updateCTASettings } from './utils/themeUtils';
import StudentsSection from './components/StudentsSection';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

// Cache management functions
const cacheLandingContent = (content) => {
  try {
    const cacheData = {
      content,
      timestamp: new Date().getTime()
    };
    localStorage.setItem('cachedLandingContent', JSON.stringify(cacheData));
  } catch (error) {
    console.error('Error caching content:', error);
  }
};

const getCachedLandingContent = (maxAgeMinutes = 30) => {
  try {
    const cachedData = localStorage.getItem('cachedLandingContent');
    if (!cachedData) return null;
    
    const { content, timestamp } = JSON.parse(cachedData);
    const now = new Date().getTime();
    const cacheAge = now - timestamp;
    
    // Convert maxAgeMinutes to milliseconds
    if (cacheAge < maxAgeMinutes * 60 * 1000) {
      return content;
    }
    
    return null;
  } catch (error) {
    console.error('Error reading cached content:', error);
    return null;
  }
};

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
  const [elections, setElections] = useState([]);
  
  const [initialContent, setInitialContent] = useState(null);
  const [contentTab, setContentTab] = useState('hero'); 

  const [landingContent, setLandingContent] = useState({
    logo: {
      imageUrl: null
    },
    hero: {
      title: "",
      subtitle: "",
      actionText: "",
      actionLink: "",
      imageUrl: "",
      videoUrl: null,
      posterImage: null,
      bgColor: "#1e40af",
      textColor: "#ffffff"
    },
    features: {
      title: "",
      subtitle: "",
      columns: []
    },
    callToAction: {
      title: "",
      subtitle: "",
      actionText: "",
      actionLink: "",
      enabled: true,
      bgColor: "#1e3a8a",
      textColor: "#ffffff"
    },
    candidates: {
      title: "Election Candidates",
      subtitle: "Meet the candidates running in this election",
      items: []
    },
    studentUI: {
      type: 'poster',
      backgroundImage: null,
      use_landing_design: false
    }
  });

  useEffect(() => {
    fetchContent();
    fetchThemes();
    fetchElections();
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
      const timestamp = new Date().getTime();

      // Fetch main content
      const response = await axios.get(`${API_URL}/content?t=${timestamp}`, {
        timeout: 5000
      });

      // Fetch student UI configuration
      const studentUIResponse = await axios.get(`${API_URL}/studentUI?t=${timestamp}`, {
        headers: {
          'Authorization': `Bearer ${Cookies.get('token')}`
        }
      });
      
      if (response.data) {
        const newHero = response.data.hero || landingContent.hero;
        const newFeatures = response.data.features || landingContent.features;
        const newCTA = response.data.callToAction || landingContent.callToAction;
        const newStudentUI = studentUIResponse.data?.content || landingContent.studentUI;

        const newContent = {
          logo: {
            imageUrl: response.data.logo?.imageUrl || landingContent.logo.imageUrl
          },
          hero: {
            title: newHero.title || landingContent.hero.title,
            subtitle: newHero.subtitle || landingContent.hero.subtitle,
            videoUrl: newHero.videoUrl || null,
            posterImage: newHero.posterImage || null,
            bgColor: newHero.bgColor || landingContent.hero.bgColor || "#1e40af",
            textColor: newHero.textColor || landingContent.hero.textColor || "#ffffff"
          },
          features: {
            columns: (newFeatures.columns || []).map((column, index) => {
              const existingColumn = landingContent.features.columns[index] || {};
              
              return {
                title: column.title || existingColumn.title || "",
                description: column.description || existingColumn.description || "",
                imageUrl: column.imageUrl || existingColumn.imageUrl || null,
                bgColor: column.bgColor || existingColumn.bgColor || "#ffffff",
                textColor: column.textColor || existingColumn.textColor || "#000000"
              };
            })
          },
          callToAction: {
            title: newCTA.title || landingContent.callToAction.title,
            subtitle: newCTA.subtitle || landingContent.callToAction.subtitle,
            actionText: newCTA.actionText || landingContent.callToAction.actionText,
            actionLink: newCTA.actionLink || landingContent.callToAction.actionLink,
            enabled: typeof newCTA.enabled !== 'undefined' ? newCTA.enabled : true,
            bgColor: newCTA.bgColor || landingContent.callToAction.bgColor || "#1e3a8a",
            textColor: newCTA.textColor || landingContent.callToAction.textColor || "#ffffff"
          },
          studentUI: {
            type: newStudentUI.type || 'poster',
            backgroundImage: newStudentUI.background_image || null,
            use_landing_design: newStudentUI.use_landing_design || false
          }
        };

        setLandingContent(newContent);
        setInitialContent(JSON.stringify(newContent));
        cacheLandingContent(newContent);
      }
    } catch (error) {
      console.error("Error fetching content:", error);
      const cachedContent = getCachedLandingContent();
      if (cachedContent) {
        setLandingContent(cachedContent);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchThemes = async () => {
    await utils.fetchThemes(API_URL, setThemes, setActiveTheme);
  };

  const fetchElections = async () => {
    try {
      const token = Cookies.get('token');
      const statuses = ['ongoing', 'upcoming', 'completed'];
      const allElections = [];

      for (const status of statuses) {
        try {
          const response = await axios.get(`${API_URL}/elections/status/${status}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.data) {
            allElections.push(...response.data);
          }
        } catch (error) {
          console.error(`Error fetching ${status} elections:`, error);
        }
      }

      setElections(allElections);
    } catch (error) {
      console.error('Error fetching elections:', error);
    }
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

  const handleFileUpload = async (type, index, e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File is too large. Maximum size is 5MB.");
      e.target.value = '';
      return;
    }

    if (type === 'studentBackground') {
      console.log('Handling student background upload:', file);
      
      try {
        setSaveStatus('Uploading background image...');
        
        // Create form data for direct upload
        const formData = new FormData();
        
        // Important: The server expects both the file and content data
        formData.append('backgroundImage', file);
        
        // Add the content JSON data which is required by the server
        const contentData = {
          type: 'poster', // Default to poster type for background uploads
          use_landing_design: false,
          existing_background_image: null // We're uploading a new one
        };
        
        formData.append('content', JSON.stringify(contentData));
        
        console.log('Uploading with content data:', contentData);
        
        // Get the token
        const token = Cookies.get('token');
        if (!token) {
          throw new Error('Authentication token not found');
        }
        
        // Make direct upload request - debug the request
        console.log('FormData entries:');
        for (let pair of formData.entries()) {
          console.log(pair[0], pair[1]);
        }
        
        // Make the request with proper headers
        const response = await axios.post(
          `${API_URL}/studentUI`,
          formData,
          {
            headers: {
              'Authorization': `Bearer ${token}`
              // Don't manually set Content-Type with FormData - axios will set it with boundary
            }
          }
        );
        
        console.log('Background upload response:', response.data);
        
        if (response.data && response.data.content && response.data.content.background_image) {
          // Update the UI with the server path
          const serverPath = response.data.content.background_image;
          
          // Update the landing content state
          const newContent = { ...landingContent };
          newContent.studentUI = {
            ...newContent.studentUI,
            backgroundImage: serverPath,
            // If we're currently using landing design, switch to poster automatically
            type: newContent.studentUI.type === 'landing' ? 'poster' : newContent.studentUI.type,
            use_landing_design: newContent.studentUI.type === 'landing' ? false : newContent.studentUI.use_landing_design
          };
          
          setLandingContent(newContent);
          setSaveStatus('Background image uploaded successfully!');
          setTimeout(() => setSaveStatus(''), 3000);
        } else {
          throw new Error('Invalid server response');
        }
      } catch (error) {
        console.error('Error uploading background image:', error);
        if (error.response) {
          console.error('Response data:', error.response.data);
          console.error('Response status:', error.response.status);
          console.error('Response headers:', error.response.headers);
          setSaveStatus(`Error: ${error.response.data.message || 'Server error'}`);
        } else {
          setSaveStatus(`Error: ${error.message}`);
        }
        setTimeout(() => setSaveStatus(''), 5000);
      }
    }
    else if (type === 'heroVideo') {
      if (file.size > 50 * 1024 * 1024) {
        alert("Video file is too large. Maximum size is 50MB.");
        e.target.value = '';
        return;
      }
      
      const localUrl = URL.createObjectURL(file);
      console.log("Updating hero video URL:", localUrl);
      updateHero('videoUrl', localUrl);
    } 
    else if (type === 'heroPoster') {
      const localUrl = URL.createObjectURL(file);
      console.log("Updating hero poster image URL:", localUrl);
      updateHero('posterImage', localUrl);
    } 
    else if (type === 'featureImage') {
      const localUrl = URL.createObjectURL(file);
      
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

  const removeImage = async (type, index) => {
    if (type === 'studentBackground') {
      try {
        setSaveStatus('Removing background image...');
        
        // Get the token
        const token = Cookies.get('token');
        if (!token) {
          throw new Error('Authentication token not found');
        }
        
        // Create form data for the request
        const formData = new FormData();
        
        // Add the content JSON data
        const contentData = {
          type: 'poster', // Keep as poster type but remove background
          use_landing_design: false,
          existing_background_image: null // Explicitly set to null
        };
        
        formData.append('content', JSON.stringify(contentData));
        formData.append('removeBackground', 'true'); // Important flag
        
        console.log('Removing background with data:', contentData);
        
        // Debug the request
        console.log('FormData entries:');
        for (let pair of formData.entries()) {
          console.log(pair[0], pair[1]);
        }
        
        // Make the request to remove the background
        const response = await axios.post(
          `${API_URL}/studentUI`,
          formData,
          {
            headers: {
              'Authorization': `Bearer ${token}`
              // Don't manually set Content-Type with FormData
            }
          }
        );
        
        console.log('Background removal response:', response.data);
        
        if (response.data && response.data.content) {
          // Update the landing content state with server data
          const newContent = { ...landingContent };
          newContent.studentUI = {
            type: response.data.content.type || 'poster',
            backgroundImage: null, // Force to null locally
            use_landing_design: response.data.content.use_landing_design || false
          };
          
          setLandingContent(newContent);
          
          // Clear file input for student background
          const backgroundInput = document.querySelector('#student-background-input');
          if (backgroundInput) {
            backgroundInput.value = '';
          }
          
          setSaveStatus('Background image removed successfully!');
        } else {
          throw new Error('Invalid server response');
        }
      } catch (error) {
        console.error('Error removing background image:', error);
        if (error.response) {
          console.error('Response data:', error.response.data);
          console.error('Response status:', error.response.status);
          setSaveStatus(`Error: ${error.response.data.message || 'Server error'}`);
        } else {
          setSaveStatus(`Error: ${error.message}`);
        }
      } finally {
        setTimeout(() => setSaveStatus(''), 3000);
      }
    }
    else if (type === 'heroVideo') {
      updateHero('videoUrl', null);
    } 
    else if (type === 'heroPoster') {
      updateHero('posterImage', null);
    } 
    else if (type === 'featureImage') {
      updateFeature(index, 'imageUrl', null);
    }
    
    if (type !== 'studentBackground') {
      setSaveStatus('Image removed. Click Save to apply changes.');
      setTimeout(() => setSaveStatus(''), 3000);
    }
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

      if (section === 'studentUI') {
        console.log('Saving student UI content:', landingContent.studentUI);
        
        // If type is landing, ensure use_landing_design is true
        const isLandingDesign = landingContent.studentUI?.type === 'landing';
        
        contentData = {
          type: landingContent.studentUI?.type || 'poster',
          use_landing_design: isLandingDesign || landingContent.studentUI?.use_landing_design || false
        };
        
        // For landing design, we always remove the background image
        if (isLandingDesign) {
          console.log('Landing design selected, removing background image');
          formData.append('removeBackground', 'true');
          contentData.existing_background_image = null;
        } 
        // For poster design, handle the background image
        else {
          // If we already have a background image path in the state that's not a blob URL
          if (landingContent.studentUI?.backgroundImage && 
              !landingContent.studentUI.backgroundImage.startsWith('blob:')) {
            console.log('Using existing background image:', landingContent.studentUI.backgroundImage);
            contentData.existing_background_image = landingContent.studentUI.backgroundImage;
          } 
          // If background image is explicitly null, remove it
          else if (landingContent.studentUI?.backgroundImage === null) {
            console.log('Removing background image');
            formData.append('removeBackground', 'true');
          }
        }

        formData.append('content', JSON.stringify(contentData));
        
        // Log what we're sending
        console.log('Sending student UI update with data:', contentData);
        for (let pair of formData.entries()) {
          console.log(pair[0], pair[1]);
        }

        const timestamp = new Date().getTime();
        const config = {
          headers: {
            'Authorization': `Bearer ${Cookies.get('token')}`,
            'Content-Type': 'multipart/form-data'
          }
        };

        // Special handling for landing design - use the direct endpoint
        if (isLandingDesign) {
          console.log('Using direct force-landing endpoint for landing design');
          
          const directResponse = await axios.post(
            `${API_URL}/studentUI/force-landing`,
            {},
            {
              headers: {
                'Authorization': `Bearer ${Cookies.get('token')}`,
                'Content-Type': 'application/json'
              }
            }
          );
          
          console.log('Direct landing design response:', directResponse.data);
          
          if (directResponse.data && directResponse.data.content) {
            const newContent = { ...landingContent };
            newContent.studentUI = {
              type: 'landing',
              backgroundImage: null,
              use_landing_design: true
            };
            setLandingContent(newContent);
            setSaveStatus('Landing design applied successfully!');
            setTimeout(() => setSaveStatus(''), 3000);
          }
        } 
        // For poster design, use the regular endpoint
        else {
          const response = await axios.post(
            `${API_URL}/studentUI?t=${timestamp}`,
            formData,
            config
          );
          
          console.log('Student UI update response:', response.data);
  
          if (response.data && response.data.content) {
            const newContent = { ...landingContent };
            newContent.studentUI = {
              type: response.data.content.type || 'poster',
              backgroundImage: response.data.content.background_image || null,
              use_landing_design: response.data.content.use_landing_design || false
            };
            setLandingContent(newContent);
            setSaveStatus('Changes saved successfully!');
            setTimeout(() => setSaveStatus(''), 3000);
          }
        }
        
        return;
      } else if (section === 'logo') {
        contentData = {
          imageUrl: landingContent.logo.imageUrl
        };

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
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${Cookies.get('token')}`
        }
      };
      
      let endpoint = section === 'studentUI' ? 'studentUI' : `content/${section}`;
      const response = await axios.post(
        `${API_URL}/${endpoint}?t=${timestamp}`, 
        formData,
        config
      );
      
      if (response.data && response.data.content) {
        const newContent = { ...landingContent };

        if (section === 'studentUI') {
          newContent.studentUI = {
            type: response.data.content.type || 'poster',
            backgroundImage: response.data.content.background_image || null,
            use_landing_design: response.data.content.use_landing_design || false
          };
        } else if (section === 'logo') {
          newContent.logo = {
            imageUrl: response.data.content.imageUrl || null
          };
        } else if (section === 'features' && response.data.content.columns) {
  
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
        
        // Clear file inputs after successful save
        const fileInputs = document.querySelectorAll('input[type="file"]');
        fileInputs.forEach(input => {
          input.value = '';
        });
      
        let successMessage = '';
        if (section === 'studentUI') {
          successMessage = 'Student UI settings updated successfully!';
        } else if (section === 'logo') {
          successMessage = 'Logo updated successfully!';
        } else if (section === 'hero') {
          successMessage = 'Banner updated successfully!';
        } else if (section === 'features') {
          successMessage = 'Feature cards updated successfully!';
        } else if (section === 'callToAction') {
          successMessage = 'Call to action updated successfully!';
        } else {
          successMessage = `${section} saved!`;
        }
        
        setSaveStatus(successMessage);
        setTimeout(() => setSaveStatus(""), 2000);
      }
    } catch (error) {
      console.error(`Error saving ${section}:`, error);
      setSaveStatus(`Error: ${error.response?.data?.message || error.message || 'Failed to save'}`);
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
    if (!url) return null;
    if (url.startsWith('blob:')) return url;
    if (url.startsWith('http')) return url;
    // If the URL already starts with a slash, don't add another one
    return `${API_URL}${url.startsWith('/') ? url : '/' + url}`;
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

  const updateStudentUI = (field, value) => {
    setLandingContent(prev => ({
      ...prev,
      studentUI: {
        ...prev.studentUI,
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
            <button 
              className={`px-3 py-2 text-sm ${activeTab === 'students' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-black'}`}
              onClick={() => setActiveTab('students')}
            >
              Students UI
            </button>
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
              <ElectionCarousel 
                landingContent={landingContent}
                updateCTA={updateCTA}
                saveSectionContent={saveSectionContent}
                showPreview={showPreview}
                elections={elections}
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

            {/* Students Section */}
            {activeTab === 'students' && (
              <StudentsSection 
                landingContent={landingContent}
                updateStudentUI={updateStudentUI}
                saveSectionContent={saveSectionContent}
                formatImageUrl={formatImageUrl}
                handleFileUpload={handleFileUpload}
                removeImage={removeImage}
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