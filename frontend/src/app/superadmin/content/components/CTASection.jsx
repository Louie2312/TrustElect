"use client"
import { useState, useRef } from 'react';

const CTASection = ({ 
  landingContent, 
  updateCTA, 
  saveSectionContent, 
  showPreview,
  handleFileUpload,
  removeMedia,
  formatImageUrl
}) => {
  const [mediaType, setMediaType] = useState(landingContent.callToAction.mediaType || 'none');
  const fileInputRef = useRef(null);
  
  const handleMediaTypeChange = (type) => {
    setMediaType(type);
    updateCTA('mediaType', type);
    
    // Reset media if changing type
    if (type === 'none') {
      updateCTA('mediaUrl', null);
    }
  };
  
  const handleMediaUpload = (e) => {
    handleFileUpload('ctaMedia', null, e);
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-base font-medium text-black">Engagement Section</h2>
        <button
          onClick={() => saveSectionContent('callToAction')}
          className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
        >
          Update Engagement Section
        </button>
      </div>
      
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-black mb-1">
            Section Purpose
          </label>
          <select
            value={landingContent.callToAction.purpose || 'default'}
            onChange={(e) => updateCTA('purpose', e.target.value)}
            className="w-full px-3 py-2 border rounded-md text-black"
          >
            <option value="default">Default</option>
            <option value="signup">Sign up / Registration</option>
            <option value="demo">Request Demo</option>
            <option value="contact">Contact Us</option>
            <option value="learn">Learn More</option>
            <option value="quote">Get Quote</option>
            <option value="custom">Custom Message</option>
          </select>
        </div>
      
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
        
        <div>
          <label className="block text-sm font-medium text-black mb-1">
            Button Text
          </label>
          <input 
            type="text" 
            value={landingContent.callToAction.buttonText || "Contact Us"}
            onChange={(e) => updateCTA('buttonText', e.target.value)}
            className="w-full px-3 py-2 border rounded-md text-black"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-black mb-1">
            Button URL
          </label>
          <input 
            type="text" 
            value={landingContent.callToAction.buttonUrl || "/contact"}
            onChange={(e) => updateCTA('buttonUrl', e.target.value)}
            className="w-full px-3 py-2 border rounded-md text-black"
          />
        </div>

        {/* Media section */}
        <div className="border rounded-md p-3 bg-gray-50">
          <h3 className="text-sm font-medium text-black mb-2">Media Content</h3>
          
          <div className="mb-3">
            <label className="block text-sm font-medium text-black mb-1">
              Media Type
            </label>
            <div className="grid grid-cols-4 gap-2">
              <button 
                type="button"
                onClick={() => handleMediaTypeChange('none')}
                className={`py-2 px-3 text-xs rounded ${mediaType === 'none' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}
              >
                No Media
              </button>
              <button 
                type="button"
                onClick={() => handleMediaTypeChange('image')}
                className={`py-2 px-3 text-xs rounded ${mediaType === 'image' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}
              >
                Image
              </button>
              <button 
                type="button"
                onClick={() => handleMediaTypeChange('video')}
                className={`py-2 px-3 text-xs rounded ${mediaType === 'video' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}
              >
                Video
              </button>
              <button 
                type="button"
                onClick={() => handleMediaTypeChange('flash')}
                className={`py-2 px-3 text-xs rounded ${mediaType === 'flash' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}
              >
                Flash
              </button>
            </div>
          </div>
          
          {mediaType !== 'none' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Upload {mediaType === 'image' ? 'Image' : mediaType === 'video' ? 'Video' : 'Flash Animation'}
                </label>
                <div className="flex items-center">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept={
                      mediaType === 'image' 
                        ? "image/*" 
                        : mediaType === 'video'
                          ? "video/*"
                          : ".swf"
                    }
                    onChange={handleMediaUpload}
                    className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100"
                  />
                  
                  {landingContent.callToAction.mediaUrl && (
                    <button
                      onClick={() => removeMedia('ctaMedia')}
                      className="ml-2 text-xs text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
              
              {landingContent.callToAction.mediaUrl && (
                <div className="border rounded p-2 bg-white">
                  {mediaType === 'image' && (
                    <img 
                      src={formatImageUrl(landingContent.callToAction.mediaUrl)} 
                      alt="Preview" 
                      className="max-h-40 mx-auto object-contain"
                    />
                  )}
                  {mediaType === 'video' && (
                    <video 
                      src={formatImageUrl(landingContent.callToAction.mediaUrl)} 
                      controls 
                      className="max-h-40 mx-auto"
                    />
                  )}
                  {mediaType === 'flash' && (
                    <div className="bg-gray-200 p-3 text-xs text-center">
                      Flash content will display on the live site
                    </div>
                  )}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Media Position
                </label>
                <select
                  value={landingContent.callToAction.mediaPosition || 'background'}
                  onChange={(e) => updateCTA('mediaPosition', e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-black"
                >
                  <option value="background">Background</option>
                  <option value="left">Left Side</option>
                  <option value="right">Right Side</option>
                  <option value="top">Top</option>
                  <option value="bottom">Bottom</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Color pickers for CTA section */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-black mb-1">
              Background Color
            </label>
            <div className="flex items-center">
              <input 
                type="color" 
                value={landingContent.callToAction.bgColor || "#1e3a8a"}
                onChange={(e) => updateCTA('bgColor', e.target.value)}
                className="h-10 w-10 border rounded"
              />
              <input 
                type="text"
                value={landingContent.callToAction.bgColor || "#1e3a8a"}
                onChange={(e) => updateCTA('bgColor', e.target.value)}
                className="w-full ml-2 px-3 py-2 border rounded-md text-black"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-black mb-1">
              Text Color
            </label>
            <div className="flex items-center">
              <input 
                type="color" 
                value={landingContent.callToAction.textColor || "#ffffff"}
                onChange={(e) => updateCTA('textColor', e.target.value)}
                className="h-10 w-10 border rounded"
              />
              <input 
                type="text"
                value={landingContent.callToAction.textColor || "#ffffff"}
                onChange={(e) => updateCTA('textColor', e.target.value)}
                className="w-full ml-2 px-3 py-2 border rounded-md text-black"
              />
            </div>
          </div>
        </div>

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
        
        {/* CTA preview */}
        {showPreview && (
          <div className="border rounded overflow-hidden">
            <div className="bg-gray-100 px-3 py-2 border-b flex justify-between items-center">
              <span className="text-sm font-medium text-black">Preview</span>
              <span className="text-xs text-blue-600">Pending save</span>
            </div>
            <div className="p-4">
              {landingContent.callToAction.enabled ? (
                <div className="relative">
                  {landingContent.callToAction.mediaUrl && mediaType === 'image' && (
                    <div 
                      className="absolute inset-0 bg-cover bg-center opacity-20" 
                      style={{
                        backgroundImage: `url(${formatImageUrl(landingContent.callToAction.mediaUrl)})` 
                      }}
                    ></div>
                  )}
                  
                  <div 
                    className={`p-4 rounded-lg text-center shadow-sm relative ${
                      landingContent.callToAction.mediaPosition === 'left' || 
                      landingContent.callToAction.mediaPosition === 'right' 
                        ? 'flex items-center' : ''
                    }`}
                    style={{
                      backgroundColor: landingContent.callToAction.bgColor || '#1e3a8a',
                      color: landingContent.callToAction.textColor || '#ffffff'
                    }}
                  >
                    {landingContent.callToAction.mediaUrl && mediaType !== 'background' && (
                      <div className={`
                        ${landingContent.callToAction.mediaPosition === 'left' ? 'mr-4' : ''}
                        ${landingContent.callToAction.mediaPosition === 'right' ? 'ml-4 order-2' : ''}
                        ${landingContent.callToAction.mediaPosition === 'top' ? 'mb-4' : ''}
                        ${landingContent.callToAction.mediaPosition === 'bottom' ? 'mt-4' : ''}
                        ${mediaType === 'image' ? 'max-h-32' : ''}
                      `}>
                        {mediaType === 'image' && (
                          <img 
                            src={formatImageUrl(landingContent.callToAction.mediaUrl)} 
                            alt="Preview" 
                            className="max-h-32 object-contain"
                          />
                        )}
                        {mediaType === 'video' && (
                          <video 
                            src={formatImageUrl(landingContent.callToAction.mediaUrl)} 
                            controls 
                            className="max-h-32"
                          />
                        )}
                        {mediaType === 'flash' && (
                          <div className="bg-gray-200 p-3 text-xs text-center text-gray-700">
                            Flash content will display here
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className={landingContent.callToAction.mediaPosition === 'left' || landingContent.callToAction.mediaPosition === 'right' ? 'flex-1' : ''}>
                      <h3 className="text-lg font-bold mb-2" style={{color: landingContent.callToAction.textColor || '#ffffff'}}>
                        {landingContent.callToAction.title}
                      </h3>
                      <p className="text-sm mb-3" style={{color: landingContent.callToAction.textColor || '#ffffff'}}>
                        {landingContent.callToAction.subtitle}
                      </p>
                      <button className="px-4 py-2 bg-white rounded shadow-sm font-medium" style={{color: landingContent.callToAction.bgColor || '#1e3a8a'}}>
                        {landingContent.callToAction.buttonText || "Contact Us"}
                      </button>
                    </div>
                  </div>
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
  );
}

export default CTASection; 