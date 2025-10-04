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
        
        {/* Carousel Images Section */}
        <div>
          <label className="block text-sm font-medium text-black mb-2">
            Upload 3 - 5 Images
          </label>
          <div className="space-y-3">
            <div className="flex items-center">
              <input 
                id="hero-carousel-input"
                type="file" 
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(e) => handleFileUpload('heroCarousel', null, e)}
                className="w-full border rounded p-1 text-sm file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-blue-50 file:text-black text-black"
              />
            </div>
            
            {/* Display uploaded carousel images */}
            {landingContent.hero.carouselImages && landingContent.hero.carouselImages.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-black">
                    Uploaded Images ({landingContent.hero.carouselImages.length}/5)
                  </span>
                  <span className="text-xs text-gray-600">
                    Click to remove • Drag to reorder
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {landingContent.hero.carouselImages.map((image, index) => (
                    <div key={index} className="relative group border-2 border-gray-200 rounded-lg overflow-hidden hover:border-blue-300 transition-colors">
                      <img
                        src={formatImageUrl(image)}
                        alt={`Carousel image ${index + 1}`}
                        className="w-full h-24 object-cover"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                        <button
                          onClick={() => removeImage('heroCarousel', index)}
                          className="bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove image"
                        >
                          ×
                        </button>
                      </div>
                      <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                        {index + 1}
                      </div>
                      <div className="absolute bottom-2 left-2 right-2">
                        <div className="bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded truncate">
                          {image.split('/').pop()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                  <strong>Current Display Order:</strong> Images will appear in the carousel in the order shown above. 
                  The first image will be displayed initially, then rotate every 5 seconds.
                </div>
              </div>
            )}
            
            <p className="text-xs text-gray-600">
              Upload 3-5 high-quality images for the hero carousel. Images will be displayed in a rotating carousel.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-black mb-1">
              Background Video (Optional)
            </label>
            <div className="flex items-center">
            <input 
              id="hero-video-input"
              type="file" 
              accept="video/mp4,video/webm"
              onChange={(e) => handleFileUpload('heroVideo', null, e)}
              className="w-full border rounded p-1 text-sm file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-blue-50 file:text-black text-black"
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
              Fallback Poster Image
            </label>
            <div className="flex items-center">
            <input 
              type="file" 
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => handleFileUpload('heroPoster', null, e)}
              className="w-full border rounded p-1 text-sm file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-blue-50 file:text-black text-black"
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
                  {landingContent.hero.carouselImages && landingContent.hero.carouselImages.length > 0 ? (
                    <div className="relative w-full h-full">
                      <img
                        src={formatImageUrl(landingContent.hero.carouselImages[0])}
                        alt="Hero carousel preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                        Carousel Preview
                      </div>
                      {landingContent.hero.carouselImages.length > 1 && (
                        <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                          {landingContent.hero.carouselImages.length} images • Auto-rotates every 5s
                        </div>
                      )}
                      <div className="absolute bottom-2 left-2 flex space-x-1">
                        {landingContent.hero.carouselImages.map((_, index) => (
                          <div
                            key={index}
                            className={`w-2 h-2 rounded-full ${
                              index === 0 ? 'bg-white' : 'bg-white/50'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  ) : landingContent.hero.videoUrl ? (
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