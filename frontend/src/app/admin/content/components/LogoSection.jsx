"use client"
import { useState, useEffect } from 'react';

const LogoSection = ({ 
  landingContent, 
  updateLogo, 
  saveSectionContent, 
  formatImageUrl, 
  handleFileUpload, 
  removeImage, 
  showPreview 
}) => {
  const [currentLogo, setCurrentLogo] = useState(null);

  useEffect(() => {
    // Check if there's a logo in the landing content
    if (landingContent?.logo?.imageUrl) {
      setCurrentLogo(formatImageUrl(landingContent.logo.imageUrl));
    } else {
      // If no logo in landing content, check if there's a default logo
      const defaultLogo = '/images/sti-logo.png'; // Default STI logo path
      setCurrentLogo(defaultLogo);
    }
  }, [landingContent?.logo?.imageUrl, formatImageUrl]);

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      alert("Image file is too large. Maximum size is 5MB.");
      e.target.value = '';
      return;
    }

    const localUrl = URL.createObjectURL(file);
    setCurrentLogo(localUrl);
    handleFileUpload('logo', 0, e);
  };

  const handleRemoveLogo = () => {
    // When removing logo, set back to default STI logo
    const defaultLogo = '/images/sti-logo.png';
    setCurrentLogo(defaultLogo);
    removeImage('logo', 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-base font-medium text-black">STI Logo</h2>
        <button
          onClick={() => saveSectionContent('logo')}
          className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
        >
          Update Logo
        </button>
      </div>
      
      <div className="grid grid-cols-1 gap-6">
        {/* Current Logo Display */}
        <div>
          <label className="block text-sm font-medium text-black mb-2">
            Current Logo
          </label>
          <div className="border rounded-lg p-6 bg-white">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-full max-w-[200px] h-[100px] flex items-center justify-center bg-gray-50 rounded-lg p-4">
                <img
                  src={currentLogo}
                  alt="Current Site Logo"
                  className="max-h-full max-w-full object-contain"
                  onError={(e) => {
                    // If image fails to load, show default STI logo
                    e.target.onerror = null;
                    e.target.src = '/images/sti-logo.png';
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Logo Upload Section */}
        <div>
          <label className="block text-sm font-medium text-black mb-2">
            Update Logo
          </label>
          <div className="flex items-center space-x-4">
            <input
              type="file"
              id="logo-input"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />
            <label
              htmlFor="logo-input"
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md cursor-pointer hover:bg-gray-200"
            >
              Upload New Logo
            </label>
            {currentLogo && currentLogo !== '/images/sti-logo.png' && (
              <button
                onClick={handleRemoveLogo}
                className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200"
              >
                Remove Logo
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LogoSection; 