"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import LoginForm from "@/components/Auth/LoginForm";
import { Button } from "@/components/ui/button";
import stiLogo from "../assets/sti_logo.png";
import axios from "axios";

// API base URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function Home() {
  const [showLogin, setShowLogin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [apiConnected, setApiConnected] = useState(false);
  
  // Landing content state with defaults
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

  // Check API connection and fetch content on mount
  useEffect(() => {
    checkApiConnection();
    fetchContent();
  }, []);

  // Check if API is reachable
  const checkApiConnection = async () => {
    try {
      // Use HEAD request with a short timeout
      await axios.head(`${API_URL}/api/healthcheck`, { timeout: 5000 });
      console.log('API connection successful');
      setApiConnected(true);
      return true;
    } catch (error) {
      console.error('API connection failed:', error);
      setApiConnected(false);
      return false;
    }
  };

  // Cache the landing content
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

  // Get cached landing content
  const getCachedLandingContent = () => {
    try {
      const cachedData = localStorage.getItem('cachedLandingContent');
      if (!cachedData) return null;
      
      const { content, timestamp } = JSON.parse(cachedData);
      const now = new Date().getTime();
      const cacheAge = now - timestamp;
      
      // Cache valid for 30 minutes
      if (cacheAge < 30 * 60 * 1000) {
        console.log('Using cached content');
        return content;
      }
      
      return null;
    } catch (error) {
      console.error('Error reading cached content:', error);
      return null;
    }
  };

  // Fetch content from API
  const fetchContent = async () => {
    setIsLoading(true);
    
    try {
      // Always attempt to fetch new content, even if API connection failed previously
      // Add cache-busting timestamp
      const timestamp = new Date().getTime();
      
      console.log("Fetching latest content from API...");
      const response = await axios.get(`${API_URL}/api/content?t=${timestamp}`, {
        // Set a reasonable timeout
        timeout: 5000
      });
      
      if (response.data) {
        console.log("Content fetched from API:", response.data);
        
        // Extract the new content
        const newHero = response.data.hero || landingContent.hero;
        const newFeatures = response.data.features || landingContent.features;
        const newCTA = response.data.callToAction || landingContent.callToAction;
        
        // Create a complete content object with all the latest data and colors
        const newContent = {
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
              // Safely get the existing column if it exists
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
            buttonText: newCTA.buttonText || landingContent.callToAction.buttonText,
            buttonUrl: newCTA.buttonUrl || landingContent.callToAction.buttonUrl,
            enabled: typeof newCTA.enabled !== 'undefined' ? newCTA.enabled : true,
            bgColor: newCTA.bgColor || landingContent.callToAction.bgColor || "#1e3a8a",
            textColor: newCTA.textColor || landingContent.callToAction.textColor || "#ffffff"
          }
        };
        
        console.log("Setting updated landing content:", newContent);
        setLandingContent(newContent);
        
        // Cache the content for offline use
        cacheLandingContent(newContent);
      }
    } catch (error) {
      console.error("Error fetching content:", error);
      
      // Try to use cached content on error
      const cachedContent = getCachedLandingContent();
      if (cachedContent) {
        console.log("Using cached content due to fetch error");
        setLandingContent(cachedContent);
      } else {
        console.log("No cached content available, using defaults");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Format image URL
  const formatImageUrl = (url) => {
    // If URL is null or undefined, return null
    if (!url) return null;
    
    try {
      // Handle blob URLs - don't use these in production
      if (url.startsWith('blob:')) {
        console.warn("Blob URLs cannot be used on the public landing page:", url);
        return null;
      }
      
      // If already a complete URL, return as is
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
      }
      
      // Make sure path starts with a slash
      const path = url.startsWith('/') ? url : `/${url}`;
      const fullUrl = `${API_URL}${path}`;
      return fullUrl;
    } catch (error) {
      console.error('Error formatting URL:', error, url);
      return null;
    }
  };

  // Helper function to render image based on URL type
  const renderImage = (url, alt, width, height, className, onErrorAction) => {
    const formattedUrl = formatImageUrl(url);
    if (!formattedUrl) return null;
    
    // Use Next.js Image for all URLs (no special blob handling)
    return (
      <Image
        src={formattedUrl}
        alt={alt || "Image"}
        width={width || 400}
        height={height || 300}
        className={className || ""}
        unoptimized={true}
        onError={(e) => {
          console.error("Error loading image:", formattedUrl);
          if (onErrorAction) onErrorAction(e);
        }}
      />
    );
  };

  return (
    <div className="relative min-h-screen bg-white flex flex-col">
      {/* Header Section */}
      <header className="w-full flex justify-between items-center p-6 bg-[#01579B] shadow-md fixed top-0 left-0 right-0 z-10">
        <h1 className="text-2xl font-bold flex items-center">
          <Image 
            src={stiLogo} 
            alt="STI Logo" 
            width={60}
            height={20} 
            className="mr-2"
            priority
            style={{ maxHeight: 'calc(51px - (0px * 2))' }}
          />
          <span className="text-white">TrustElect</span>
        </h1>
        <Button
          onClick={() => setShowLogin(true)}
          className="cursor-pointer px-6 py-2 br-5 bg-[#0000FF] text-white font-semibold rounded-lg shadow-md hover:bg-blue-800"
        >
          Login
        </Button>
      </header>

      {/* Main content */}
      <main className="flex-grow pt-24">
        {/* Hero Section */}
        <section 
          className="text-white py-20 px-6"
          style={{
            backgroundColor: landingContent.hero?.bgColor || '#01579B',
            color: landingContent.hero?.textColor || '#ffffff'
          }}
        >
          <div className="container mx-auto max-w-6xl flex flex-col md:flex-row items-center">
            <div className="md:w-1/2 space-y-6">
              <h1 
                className="text-4xl md:text-5xl font-bold leading-tight"
                style={{ color: landingContent.hero?.textColor || '#ffffff' }}
              >
                {landingContent.hero.title}
              </h1>
              <p 
                className="text-xl md:text-2xl"
                style={{ color: landingContent.hero?.textColor || '#ffffff' }}
              >
                {landingContent.hero.subtitle}
              </p>
             
            </div>
            <div className="md:w-1/2 mt-10 md:mt-0 flex justify-center">
              {(() => {
               
                const heroVideoUrl = landingContent.hero && landingContent.hero.videoUrl ? 
                  formatImageUrl(landingContent.hero.videoUrl) : null;
                
                // Process poster image URL - ensure it comes from hero section only
                const heroPosterUrl = landingContent.hero && landingContent.hero.posterImage ? 
                  formatImageUrl(landingContent.hero.posterImage) : null;
                
                console.log("Hero section video URL:", heroVideoUrl);
                console.log("Hero section poster URL:", heroPosterUrl);
                
                // Render video if available
                if (heroVideoUrl) {
                  return (
                    <div className="w-full max-w-md aspect-video bg-black/20 rounded-lg overflow-hidden relative">
                      <video
                        src={heroVideoUrl}
                        poster={heroPosterUrl}
                        controls
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          console.error("Error loading hero video");
                          e.currentTarget.style.display = 'none';
                          const parent = e.currentTarget.parentElement;
                          if (parent) {
                            const fallback = document.createElement('div');
                            fallback.className = 'absolute inset-0 flex items-center justify-center bg-blue-700';
                            fallback.innerHTML = `<span class="text-white/70">Video unavailable</span>`;
                            parent.appendChild(fallback);
                          }
                        }}
                      >
                        Your browser does not support the video tag.
                      </video>
                    </div>
                  );
                // Render poster image if available
                } else if (heroPosterUrl) {
                  return (
                    <div className="w-full max-w-md aspect-video bg-black/20 rounded-lg overflow-hidden">
                      <Image
                        src={heroPosterUrl}
                        alt="TrustElect Platform"
                        width={640}
                        height={360}
                        className="w-full h-full object-cover"
                        unoptimized={true}
                        onError={(e) => {
                          console.error("Error loading hero poster image");
                          const container = e.currentTarget.closest('div');
                          if (container) {
                            container.innerHTML = `
                              <div class="w-full h-full flex items-center justify-center bg-blue-700">
                                <span class="text-xl text-white/70">Demo Video</span>
                              </div>
                            `;
                          }
                        }}
                      />
                    </div>
                  );
                // Render placeholder if no media
                } else {
                  return (
                    <div className="w-full max-w-md aspect-video bg-blue-700 rounded-lg flex items-center justify-center">
                      <span className="text-xl text-white/70">Demo Video</span>
                    </div>
                  );
                }
              })()}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 px-6 bg-gray-50">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">
              Key Features
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {landingContent.features.columns.map((feature, index) => {
                // Extra debugging to trace Feature Card 1 image
                if (index === 0) {
                  console.log("Feature Card 1 data:", feature);
                  console.log("Feature Card 1 image URL:", feature.imageUrl);
                }
                
                // Get the formatted image URL only if it exists and belongs to this feature
                let imageUrl = null;
                if (feature.imageUrl) {
                  imageUrl = formatImageUrl(feature.imageUrl);
                  
                  // Ensure this is really a feature image (not a hero image)
                  const isHeroImage = landingContent.hero && 
                    (feature.imageUrl === landingContent.hero.videoUrl || 
                     feature.imageUrl === landingContent.hero.posterImage);
                     
                  if (isHeroImage) {
                    console.warn(`Feature ${index} image URL matches a hero image - ignoring`);
                    imageUrl = null;
                  }
                }
                
                // More debugging for Feature Card 1
                if (index === 0) {
                  console.log("Feature Card 1 final image URL:", imageUrl);
                }
                
                return (
                  <div 
                    key={index} 
                    className="p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
                    style={{
                      backgroundColor: feature.bgColor || '#ffffff',
                      color: feature.textColor || '#000000'
                    }}
                  >
                    {imageUrl ? (
                      <div className="mb-4 h-48 overflow-hidden rounded-lg">
                        <Image
                          src={imageUrl}
                          alt={feature.title || `Feature ${index + 1}`}
                          width={400}
                          height={300}
                          className="w-full h-full object-cover"
                          unoptimized={true}
                          onError={(e) => {
                            console.error(`Error loading feature image ${index}:`, imageUrl);
                            const container = e.currentTarget.closest('.mb-4');
                            if (container) {
                              container.style.display = 'none';
                            }
                          }}
                        />
                      </div>
                    ) : null}
                    <h3 
                      className="text-xl font-semibold mb-2"
                      style={{ color: feature.textColor || '#000000' }}
                    >
                      {feature.title}
                    </h3>
                    <p style={{ color: feature.textColor || '#000000' }}>
                      {feature.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Call to Action Section */}
        {landingContent.callToAction.enabled && (
          <section 
            className="text-white py-16 px-6"
            style={{
              backgroundColor: landingContent.callToAction?.bgColor || '#1e3a8a',
              color: landingContent.callToAction?.textColor || '#ffffff'
            }}
          >
            <div className="container mx-auto max-w-4xl text-center">
              <h2 
                className="text-3xl font-bold mb-4"
                style={{ color: landingContent.callToAction?.textColor || '#ffffff' }}
              >
                {landingContent.callToAction.title}
              </h2>
              <p 
                className="text-xl mb-8"
                style={{ color: landingContent.callToAction?.textColor || '#ffffff' }}
              >
                {landingContent.callToAction.subtitle}
              </p>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#01579B] text-white py-8 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <h2 className="text-xl font-bold text-white">TrustElect</h2>
              <p className="text-white">Secure Digital Voting Platform</p>
            </div>
            <div className="text-white text-sm">
              © {new Date().getFullYear()} TrustElect. All rights reserved.
            </div>
          </div>
        </div>
      </footer>

      {/* Login Form (Centered on Click) */}
      {showLogin && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <LoginForm onClose={() => setShowLogin(false)} />
        </div>
      )}
    </div>
  );
}
