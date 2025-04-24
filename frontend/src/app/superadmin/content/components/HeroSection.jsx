"use client"
import { useState } from 'react';

const HeroSection = ({ 
  landingContent, 
  updateHero, 
  saveSectionContent, 
  formatImageUrl, 
  handleFileUpload, 
  removeImage, 
  showPreview 
}) => {
  return (
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

        {/* Color pickers for hero section */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-black mb-1">
              Background Color
            </label>
            <div className="flex items-center">
              <input 
                type="color" 
                value={landingContent.hero.bgColor}
                onChange={(e) => updateHero('bgColor', e.target.value)}
                className="h-10 w-10 border rounded"
              />
              <input 
                type="text"
                value={landingContent.hero.bgColor}
                onChange={(e) => updateHero('bgColor', e.target.value)}
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
                value={landingContent.hero.textColor}
                onChange={(e) => updateHero('textColor', e.target.value)}
                className="h-10 w-10 border rounded"
              />
              <input 
                type="text"
                value={landingContent.hero.textColor}
                onChange={(e) => updateHero('textColor', e.target.value)}
                className="w-full ml-2 px-3 py-2 border rounded-md text-black"
              />
            </div>
          </div>
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
  );
}

export default HeroSection; 