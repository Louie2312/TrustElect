"use client";

import { useState, useRef } from "react";
import { Upload, X, Image as ImageIcon, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";

const PageBackgroundSection = ({ 
  landingContent, 
  setLandingContent, 
  section, 
  sectionName,
  onSave 
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('section', section);

      const token = localStorage.getItem('token');
      const response = await fetch('/api/content/upload-background', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      
      // Update the landing content with the new background image
      setLandingContent(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          backgroundImage: data.imageUrl
        }
      }));

      toast.success(`${sectionName} background updated successfully!`);
      
      // Auto-save after successful upload
      if (onSave) {
        onSave();
      }

    } catch (error) {
      console.error('Error uploading background:', error);
      toast.error('Failed to upload background image');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeBackground = () => {
    setLandingContent(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        backgroundImage: null
      }
    }));
    toast.success(`${sectionName} background removed`);
    
    // Auto-save after removal
    if (onSave) {
      onSave();
    }
  };

  const currentBackground = landingContent[section]?.backgroundImage;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">
        {sectionName} Background
      </h3>
      
      <div className="space-y-4">
        {/* Current Background Preview */}
        {currentBackground && (
          <div className="relative">
            <div className="text-sm font-medium text-gray-700 mb-2">Current Background:</div>
            <div className="relative w-full h-32 bg-gray-100 rounded-lg overflow-hidden border">
              <img
                src={currentBackground}
                alt={`${sectionName} background`}
                className="w-full h-full object-cover"
              />
              <button
                onClick={removeBackground}
                className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors"
                title="Remove background"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Upload Section */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
            disabled={isUploading}
          />
          
          <div className="flex flex-col items-center space-y-3">
            <div className="p-3 bg-blue-100 rounded-full">
              {isUploading ? (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              ) : (
                <ImageIcon className="w-8 h-8 text-blue-600" />
              )}
            </div>
            
            <div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
              >
                {isUploading ? 'Uploading...' : 'Upload Background Image'}
              </button>
              <p className="text-sm text-gray-500 mt-1">
                PNG, JPG, JPEG up to 5MB
              </p>
            </div>
          </div>
        </div>

        {/* Background Options */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Background Size
            </label>
            <select
              value={landingContent[section]?.backgroundSize || 'cover'}
              onChange={(e) => setLandingContent(prev => ({
                ...prev,
                [section]: {
                  ...prev[section],
                  backgroundSize: e.target.value
                }
              }))}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="cover">Cover (Fill entire section)</option>
              <option value="contain">Contain (Fit within section)</option>
              <option value="100% 100%">Stretch (Fill exactly)</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Background Position
            </label>
            <select
              value={landingContent[section]?.backgroundPosition || 'center'}
              onChange={(e) => setLandingContent(prev => ({
                ...prev,
                [section]: {
                  ...prev[section],
                  backgroundPosition: e.target.value
                }
              }))}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="center">Center</option>
              <option value="top">Top</option>
              <option value="bottom">Bottom</option>
              <option value="left">Left</option>
              <option value="right">Right</option>
              <option value="top left">Top Left</option>
              <option value="top right">Top Right</option>
              <option value="bottom left">Bottom Left</option>
              <option value="bottom right">Bottom Right</option>
            </select>
          </div>
        </div>

        {/* Background Overlay */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Background Overlay (Optional)
          </label>
          <div className="flex items-center space-x-4">
            <input
              type="checkbox"
              checked={landingContent[section]?.backgroundOverlay || false}
              onChange={(e) => setLandingContent(prev => ({
                ...prev,
                [section]: {
                  ...prev[section],
                  backgroundOverlay: e.target.checked
                }
              }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-600">Add dark overlay for better text readability</span>
          </div>
          
          {landingContent[section]?.backgroundOverlay && (
            <div className="mt-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Overlay Opacity
              </label>
              <input
                type="range"
                min="0.1"
                max="0.9"
                step="0.1"
                value={landingContent[section]?.overlayOpacity || 0.5}
                onChange={(e) => setLandingContent(prev => ({
                  ...prev,
                  [section]: {
                    ...prev[section],
                    overlayOpacity: parseFloat(e.target.value)
                  }
                }))}
                className="w-full"
              />
              <div className="text-xs text-gray-500 text-center">
                {Math.round((landingContent[section]?.overlayOpacity || 0.5) * 100)}%
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PageBackgroundSection;
