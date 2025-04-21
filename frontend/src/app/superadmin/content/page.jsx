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

  // Fetch content from API
  const fetchContent = async () => {
    setIsLoading(true);
    try {
      // Add cache-busting timestamp
      const timestamp = new Date().getTime();
      const response = await axios.get(`${API_URL}/api/content?t=${timestamp}`);
      
      if (response.data) {
        setLandingContent({
          hero: response.data.hero || landingContent.hero,
          features: response.data.features || landingContent.features,
          callToAction: response.data.callToAction || landingContent.callToAction
        });
        
        // Store initial content for comparison
        setInitialContent(JSON.stringify(response.data));
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
      updateHero('videoUrl', localUrl);
    } 
    else if (type === 'heroPoster') {
      // Check image file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        alert("Image file is too large. Maximum size is 5MB.");
        e.target.value = '';
        return;
      }
      updateHero('posterImage', localUrl);
    } 
    else if (type === 'featureImage') {
      // Check image file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        alert("Image file is too large. Maximum size is 5MB.");
        e.target.value = '';
        return;
      }
      updateFeature(index, 'imageUrl', localUrl);
    }
  };

  // Save section content to API
  const saveSectionContent = async (section) => {
    setSaveStatus(`Saving ${section}...`);
    
    try {
      const formData = new FormData();
      
      // Add the section content as JSON
      formData.append('content', JSON.stringify(landingContent[section]));
      
      // Add appropriate files based on section
      if (section === 'hero') {
        // If we have a hero video that's not from the API (starts with blob:)
        const heroVideoInput = document.querySelector('input[type="file"][accept*="video"]');
        if (heroVideoInput?.files?.[0]) {
          formData.append('heroVideo', heroVideoInput.files[0]);
        }
        
        // If we have a hero poster image that's not from the API
        const heroPosterInput = document.querySelector('input[type="file"][accept*="image/jpeg,image/png,image/webp"]');
        if (heroPosterInput?.files?.[0]) {
          formData.append('heroPoster', heroPosterInput.files[0]);
        }
      } 
      else if (section === 'features') {
        // Handle feature images upload
        landingContent.features.columns.forEach((_, index) => {
          const featureImageInput = document.querySelector(`input[type="file"][accept*="image"][data-feature-index="${index}"]`);
          if (featureImageInput?.files?.[0]) {
            formData.append(`featureImage${index}`, featureImageInput.files[0]);
          }
        });
      }

      // Add cache-busting timestamp
      const timestamp = new Date().getTime();
      
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      };
      
      // Send the request to the API
      const response = await axios.post(
        `${API_URL}/api/content/${section}?t=${timestamp}`, 
        formData,
        config
      );
      
      if (response.data && response.data.content) {
        // Update the state with the returned content
        const newContent = { ...landingContent };
        newContent[section] = response.data.content;
        setLandingContent(newContent);
        
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
    }
  };

  // Save all content
  const saveContent = async () => {
    setSaveStatus("Applying all changes...");
    
    try {
      // Save each section sequentially
      await saveSectionContent('hero');
      await saveSectionContent('features');
      await saveSectionContent('callToAction');
      
      // Fetch updated content to ensure everything is in sync
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
    if (url.startsWith('blob:')) return url;
    if (url.startsWith('http')) return url;
    return `${API_URL}${url}`;
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
                      <input 
                        type="file" 
                        accept="video/mp4,video/webm"
                        onChange={(e) => handleFileUpload('heroVideo', null, e)}
                        className="w-full border rounded p-1 text-sm file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-blue-50 file:text-black"
                      />
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
                      <input 
                        type="file" 
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => handleFileUpload('heroPoster', null, e)}
                        className="w-full border rounded p-1 text-sm file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-blue-50 file:text-black"
                      />
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
                          Image
        </label> 
                        <input 
                          type="file" 
                          accept="image/jpeg,image/png,image/webp"
                          data-feature-index={index}
                          onChange={(e) => handleFileUpload('featureImage', index, e)}
                          className="w-full border rounded p-1 text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-blue-50 file:text-black" 
                        />
                        {feature.imageUrl && !feature.imageUrl.startsWith('blob:') && (
                          <p className="mt-1 text-xs text-black truncate">
                            Current: {feature.imageUrl}
                          </p>
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

