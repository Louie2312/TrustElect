"use client"
import { useState, useEffect } from "react";
import axios from "axios";

// API base URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function ContentManagement() {
  const [activeTab, setActiveTab] = useState("hero");
  const [saveStatus, setSaveStatus] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  
  // Initial content to compare against changes
  const [initialContent, setInitialContent] = useState(null);

  const [landingContent, setLandingContent] = useState({
    hero: {
      title: "Secure Digital Voting Platform",
      subtitle: "Empower your educational institution with reliable election technology",
      videoUrl: null,
      posterImage: null
    },
    features: {
      columns: [
        {
          title: "Easy Setup",
          description: "Simple election configuration process",
          imageUrl: null
        },
        {
          title: "Secure Voting",
          description: "End-to-end encrypted ballot submission",
          imageUrl: null
        },
        {
          title: "Real-time Results",
          description: "Instant counting and visualization",
          imageUrl: null
        }
      ]
    },
    callToAction: {
      title: "Ready to modernize your election process?",
      subtitle: "Join thousands of educational institutions using TrustElect",
      buttonText: "Contact Us",
      enabled: true
    }
  });


  useEffect(() => {
    fetchContent();
  }, []);


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
    setIsLoading(true);
    try {
      // Add cache-busting timestamp
      const timestamp = new Date().getTime();
      const response = await axios.get(`${API_URL}/api/content?t=${timestamp}`);
      
      if (response.data) {
        console.log("Content loaded from API:", response.data);
        
        // Create a clean structure for the content
        const cleanContent = {
          hero: {
            title: response.data.hero?.title || landingContent.hero.title,
            subtitle: response.data.hero?.subtitle || landingContent.hero.subtitle,
            videoUrl: response.data.hero?.videoUrl || null,
            posterImage: response.data.hero?.posterImage || null
          },
          features: {
            columns: []
          },
          callToAction: {
            title: response.data.callToAction?.title || landingContent.callToAction.title,
            subtitle: response.data.callToAction?.subtitle || landingContent.callToAction.subtitle,
            buttonText: response.data.callToAction?.buttonText || landingContent.callToAction.buttonText,
            enabled: response.data.callToAction?.enabled !== undefined ? response.data.callToAction.enabled : true
          }
        };
        
        // Process feature columns
        if (response.data.features && Array.isArray(response.data.features.columns)) {
          cleanContent.features.columns = response.data.features.columns.map((column, index) => {
            console.log(`Processing feature ${index} from API:`, column);
            return {
              title: column.title || '',
              description: column.description || '',
              imageUrl: column.imageUrl || null
            };
          });
          
          console.log("Processed feature columns:", cleanContent.features.columns);
          
          // Validate Feature Card 1 specifically
          if (cleanContent.features.columns[0]) {
            console.log("Feature Card 1 after processing:", cleanContent.features.columns[0]);
          }
        } else {
          // Use default features if not available
          cleanContent.features.columns = landingContent.features.columns;
        }
        
        setLandingContent(cleanContent);
        
        // Store initial content for comparison
        setInitialContent(JSON.stringify(cleanContent));
      }
    } catch (error) {
      console.error("Error fetching content:", error);
      setSaveStatus("Error loading content");
      setTimeout(() => setSaveStatus(""), 3000);
      
      // Fallback to localStorage if API fails
      const savedContent = localStorage.getItem('landingContent');
      if (savedContent) {
        try {
          const parsedContent = JSON.parse(savedContent);
          setLandingContent(parsedContent);
          setInitialContent(JSON.stringify(parsedContent));
        } catch (error) {
          console.error("Error parsing saved content:", error);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Update hero section
  const updateHero = (field, value) => {
    setLandingContent(prev => ({
      ...prev,
      hero: {
        ...prev.hero,
        [field]: value
      }
    }));
  };

  // Update feature column
  const updateFeature = (index, field, value) => {
    console.log(`Updating feature ${index}, field ${field} with value:`, value);
    const updatedColumns = [...landingContent.features.columns];
    updatedColumns[index] = {
      ...updatedColumns[index],
      [field]: value
    };
    
    setLandingContent(prev => ({
      ...prev,
      features: {
        ...prev.features,
        columns: updatedColumns
      }
    }));
  };

  // Update call to action
  const updateCTA = (field, value) => {
    setLandingContent(prev => ({
      ...prev,
      callToAction: {
        ...prev.callToAction,
        [field]: value
      }
    }));
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
          posterImage: landingContent.hero.posterImage
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
        // Create a deep copy to avoid reference issues
        contentData = {
          columns: landingContent.features.columns.map(column => ({
            title: column.title,
            description: column.description,
            imageUrl: column.imageUrl
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
          enabled: landingContent.callToAction.enabled
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
                imageUrl: column.imageUrl || null
              };
            })
          };
        } else if (section === 'hero') {
          // For hero section, explicitly set hero properties
          newContent.hero = {
            title: response.data.content.title || '',
            subtitle: response.data.content.subtitle || '',
            videoUrl: response.data.content.videoUrl || null,
            posterImage: response.data.content.posterImage || null
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
    if (!url) return null;
    
    // For blob URLs (local file previews), use them directly
    if (url.startsWith('blob:')) {
      return url;
    }
    
    // For already complete URLs, use them directly
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // For relative paths, prepend the API URL
    // Make sure path starts with a slash
    const path = url.startsWith('/') ? url : `/${url}`;
    return `${API_URL}${path}`;
  };

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
          </div>
          
          <div className="p-4">
            {/* Hero Section */}
            {activeTab === 'hero' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-base font-medium text-black">Main Content Banner</h2>
                  <button
                    onClick={() => saveSectionContent('hero')}
                    className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                  >
                    Update Banner
                  </button>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">
                      Title
                    </label>
                    <input 
                      type="text" 
                      value={landingContent.hero.title}
                      onChange={(e) => updateHero('title', e.target.value)}
                      className="w-full px-3 py-2 border rounded-md text-black"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">
                      Subtitle
                    </label>
                    <textarea 
                      value={landingContent.hero.subtitle}
                      onChange={(e) => updateHero('subtitle', e.target.value)}
                      rows="2"
                      className="w-full px-3 py-2 border rounded-md text-black"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-black mb-1">
                        Background Video
                      </label>
                      <div className="flex items-center">
                      <input 
                        type="file" 
                        accept="video/mp4,video/webm"
                        onChange={(e) => handleFileUpload('heroVideo', null, e)}
                        className="w-full border rounded p-1 text-sm file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-blue-50 file:text-black"
                      />
                        {landingContent.hero.videoUrl && (
                          <button
                            onClick={() => removeImage('heroVideo')}
                            className="ml-2 bg-red-100 text-red-800 px-2 py-1 rounded text-xs hover:bg-red-200"
                            title="Remove video"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      {landingContent.hero.videoUrl && !landingContent.hero.videoUrl.startsWith('blob:') && (
                        <p className="mt-1 text-xs text-black truncate">
                          Current: {landingContent.hero.videoUrl}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-black mb-1">
                        Poster Image
                      </label>
                      <div className="flex items-center">
                      <input 
                        type="file" 
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => handleFileUpload('heroPoster', null, e)}
                        className="w-full border rounded p-1 text-sm file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-blue-50 file:text-black"
                          id="hero-poster-input"
                          data-section="hero"
                        />
                        {landingContent.hero.posterImage && (
                          <button
                            onClick={() => removeImage('heroPoster')}
                            className="ml-2 bg-red-100 text-red-800 px-2 py-1 rounded text-xs hover:bg-red-200"
                            title="Remove image"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      {landingContent.hero.posterImage && !landingContent.hero.posterImage.startsWith('blob:') && (
                        <p className="mt-1 text-xs text-black truncate">
                          Current: {landingContent.hero.posterImage}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Hero Preview - only shown if content has changed or preview is toggled */}
                  {showPreview && (
                    <div className="border rounded overflow-hidden">
                      <div className="bg-gray-100 px-3 py-2 border-b flex justify-between items-center">
                        <span className="text-sm font-medium text-black">Preview</span>
                        <span className="text-xs text-blue-600">Content pending save</span>
                      </div>
                      <div className="p-4">
                        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4 rounded-lg shadow-sm">
                          <h3 className="text-xl font-bold mb-2">{landingContent.hero.title}</h3>
                          <p className="text-sm mb-3">{landingContent.hero.subtitle}</p>
                          
                          <div className="aspect-video rounded-md overflow-hidden bg-black/20">
                            {landingContent.hero.videoUrl ? (
                              <video
                                src={formatImageUrl(landingContent.hero.videoUrl)}
                                poster={formatImageUrl(landingContent.hero.posterImage)}
                                controls
                                className="w-full h-full object-cover"
                              />
                            ) : landingContent.hero.posterImage ? (
                              <img
                                src={formatImageUrl(landingContent.hero.posterImage)}
                                alt="Hero background"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <span className="text-sm text-white/70">No media selected</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Features Section */}
            {activeTab === 'features' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-base font-medium text-black">Feature Cards</h2>
                  <button
                    onClick={() => saveSectionContent('features')}
                    className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                  >
                    Update Features
                  </button>
                </div>
                
                {landingContent.features.columns.map((feature, index) => (
                  <div key={index} className="border rounded p-3 mb-3">
                    <h3 className="text-sm font-medium text-black mb-2">Feature {index + 1}</h3>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-black mb-1">
                          Title
                        </label>
                        <input 
                          type="text" 
                          value={feature.title}
                          onChange={(e) => updateFeature(index, 'title', e.target.value)}
                          className="w-full px-2 py-1 border rounded-md text-black"
                        />
                      </div>
                      
      <div>
                        <label className="block text-xs text-black mb-1">
                          Description
        </label>
                        <textarea 
                          value={feature.description}
                          onChange={(e) => updateFeature(index, 'description', e.target.value)}
                          rows="2"
                          className="w-full px-2 py-1 border rounded-md text-black"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs text-black mb-1">
                          Image for Feature {index + 1}
        </label> 
                        <div className="flex items-center">
                          {index === 0 ? (
                            <div className="w-full">
                              <div className="p-1 border border-blue-300 rounded bg-blue-50">
                                <p className="text-xs text-blue-800 mb-1 font-semibold">Feature Card 1 Image Upload</p>
                                <input 
                                  type="file" 
                                  accept="image/jpeg,image/png,image/webp"
                                  data-feature-index="0"
                                  data-section="feature"
                                  id="feature-image-0"
                                  name="feature-image-0"
                                  onChange={(e) => handleFeatureCard1Upload(e)}
                                  className="w-full border rounded p-1 text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-blue-50 file:text-black" 
                                />
                              </div>
                            </div>
                          ) : (
                        <input 
                          type="file" 
                          accept="image/jpeg,image/png,image/webp"
                          data-feature-index={index}
                              id={`feature-image-${index}`}
                          onChange={(e) => handleFileUpload('featureImage', index, e)}
                          className="w-full border rounded p-1 text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-blue-50 file:text-black" 
                        />
                          )}
                          {feature.imageUrl && (
                            <button
                              onClick={() => removeImage('featureImage', index)}
                              className="ml-2 bg-red-100 text-red-800 px-2 py-1 rounded text-xs hover:bg-red-200"
                              title="Remove image"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        {feature.imageUrl && (
                          <div className="mt-2">
                            {feature.imageUrl.startsWith('blob:') ? (
                              <p className="text-xs text-blue-600">New image selected (not yet saved)</p>
                            ) : (
                          <p className="mt-1 text-xs text-black truncate">
                            Current: {feature.imageUrl}
                          </p>
                            )}
                            <div className="mt-1 h-12 w-12 border rounded overflow-hidden">
                              <img 
                                src={formatImageUrl(feature.imageUrl)} 
                                alt={`Feature ${index + 1}`}
                                className="h-full w-full object-cover" 
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Feature preview - only shown if content has changed or preview is toggled */}
                      {showPreview && (
                        <div className="border rounded-md overflow-hidden">
                          <div className="bg-gray-100 px-3 py-1 border-b flex justify-between items-center">
                            <span className="text-xs font-medium text-black">Preview</span>
                            <span className="text-xs text-blue-600">Pending save</span>
                          </div>
                          <div className="bg-white shadow-sm">
                            {feature.imageUrl && (
                              <div className="h-40 overflow-hidden">
                                <img 
                                  src={formatImageUrl(feature.imageUrl)} 
                                  alt={feature.title} 
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            
                            <div className="p-3">
                              <h3 className="text-md font-medium text-black mb-1">{feature.title}</h3>
                              <p className="text-sm text-black">{feature.description}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Call to Action Section */}
            {activeTab === 'cta' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-base font-medium text-black">Call to Action Banner</h2>
                  <button
                    onClick={() => saveSectionContent('callToAction')}
                    className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                  >
                    Update CTA
        </button>
      </div>
        
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">
                      Title
                    </label>
                    <input 
                      type="text" 
                      value={landingContent.callToAction.title}
                      onChange={(e) => updateCTA('title', e.target.value)}
                      className="w-full px-3 py-2 border rounded-md text-black"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">
                      Subtitle
                    </label>
                    <textarea 
                      value={landingContent.callToAction.subtitle}
                      onChange={(e) => updateCTA('subtitle', e.target.value)}
                      rows="2"
                      className="w-full px-3 py-2 border rounded-md text-black"
                    />
                  </div>
                  {/* 
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Button Text
                    </label>
                    <input 
                      type="text" 
                      value={landingContent.callToAction.buttonText}
                      onChange={(e) => updateCTA('buttonText', e.target.value)}
                      className="w-full px-3 py-2 border rounded-md text-gray-800"
                    />
                  </div>
                  */}


                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="cta-enabled"
                      checked={landingContent.callToAction.enabled}
                      onChange={(e) => updateCTA('enabled', e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600"
                    />
                    <label htmlFor="cta-enabled" className="ml-2 text-sm text-black">
                      Display this section
                    </label>
                  </div>
                  
                  {/* CTA preview - only shown if content has changed or preview is toggled */}
                  {showPreview && (
                    <div className="border rounded overflow-hidden">
                      <div className="bg-gray-100 px-3 py-2 border-b flex justify-between items-center">
                        <span className="text-sm font-medium text-black">Preview</span>
                        <span className="text-xs text-blue-600">Pending save</span>
                      </div>
                      <div className="p-4">
                        {landingContent.callToAction.enabled ? (
                          <div className="bg-blue-900 text-white p-4 rounded-lg text-center shadow-sm">
                            <h3 className="text-lg font-bold mb-2">{landingContent.callToAction.title}</h3>
                            <p className="text-sm mb-3">{landingContent.callToAction.subtitle}</p>
                            <button className="px-4 py-2 bg-white text-blue-800 rounded shadow-sm font-medium">
                              {landingContent.callToAction.buttonText}
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-32 bg-gray-100 rounded-lg border-2 border-dashed">
                            <p className="text-black text-sm">Section disabled</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
);
}

