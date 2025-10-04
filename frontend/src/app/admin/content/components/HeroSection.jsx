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
            Upload 3 - 5 Images for Carousel
          </label>
          <div className="space-y-4">
            {/* Upload Area */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
              <input 
                id="hero-carousel-input"
                type="file" 
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(e) => handleFileUpload('heroCarousel', null, e)}
                className="hidden"
              />
              <label 
                htmlFor="hero-carousel-input"
                className="cursor-pointer flex flex-col items-center space-y-2"
              >
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span className="text-sm text-gray-600">
                  Click to upload images or drag and drop
                </span>
                <span className="text-xs text-gray-500">
                  PNG, JPG, WEBP up to 5 images
                </span>
              </label>
            </div>
            
            {/* Display uploaded carousel images */}
            {landingContent.hero.carouselImages && landingContent.hero.carouselImages.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-black">
                    Uploaded Images ({landingContent.hero.carouselImages.length}/5)
                  </span>
                  <div className="flex items-center space-x-4">
                    <span className="text-xs text-gray-600">
                      Click X to remove
                    </span>
                    {/* FIX: Add clear all button */}
                    <button
                      onClick={() => {
                        updateHero('carouselImages', []);
                        // Clear temporary files
                        if (window.carouselFiles) {
                          window.carouselFiles = [];
                        }
                      }}
                      className="text-xs text-red-600 hover:text-red-800 font-medium"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
                
                {/* Large Preview Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {landingContent.hero.carouselImages.map((image, index) => (
                    <div key={index} className="relative group border-2 border-gray-200 rounded-lg overflow-hidden hover:border-blue-400 transition-all duration-200 shadow-sm hover:shadow-md">
                      <img
                        src={formatImageUrl(image)}
                        alt={`Carousel image ${index + 1}`}
                        className="w-full h-24 object-cover"
                      />
                      {/* FIX: Always visible delete button, not just on hover */}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center">
                        <button
                          onClick={() => removeImage('heroCarousel', index)}
                          className="bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm hover:bg-red-600 transition-all duration-200 shadow-lg"
                          title="Remove image"
                        >
                          ×
                        </button>
                      </div>
                      {/* FIX: Add permanent delete button in top-right corner */}
                      <button
                        onClick={() => removeImage('heroCarousel', index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors shadow-lg z-10"
                        title="Remove image"
                      >
                        ×
                      </button>
                      <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-medium shadow-sm">
                        {index + 1}
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                        <div className="text-white text-xs font-medium truncate">
                          {image.split('/').pop()}
                        </div>
                        <div className="text-white/80 text-xs">
                          {index === 0 ? 'First to display' : `Position ${index + 1}`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Status and Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <div className="text-blue-500 mt-0.5">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
 
                  </div>
                </div>
              </div>
            )}
            
            {/* Upload Instructions */}

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
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-sm text-white/70">Upload images to create carousel</span>
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