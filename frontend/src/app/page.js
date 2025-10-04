"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import LoginForm from "@/components/Auth/LoginForm";
import { Button } from "@/components/ui/button";
import stiLogo from "../assets/sti_logo.png";
import axios from "axios";

export default function Home() {
  const [showLogin, setShowLogin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [apiConnected, setApiConnected] = useState(false);
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0);
  
  const [landingContent, setLandingContent] = useState({
    logo: {
      imageUrl: null
    },
    hero: {
      title: "TrustElect Voting Platform",
      subtitle: "STI TrustElect Voting System",
      videoUrl: null,
      posterImage: null,
      carouselImages: []
    },
    features: {
      columns: [
        {
          title: "Easy Setup",
          description: "Simple election  process",
          imageUrl: null
        },
        {
          title: "Secure Voting",
          description: "End-to-end encryption votes",
          imageUrl: null
        },
        {
          title: "Real-time Results",
          description: "Instant counting and results",
          imageUrl: null
        }
      ]
    },
    callToAction: {
      title: "Ready to Vote?",
      subtitle: "Start your experience with TrustElect",
      buttonText: "Contact Us",
      enabled: true,
      videoUrl: null,
      bgColor: "#1e3a8a",
      textColor: "#ffffff"
    }
  });

  const checkApiConnection = async () => {
    try {
      // Fix: Use relative path - Next.js rewrites will handle the routing
      await axios.head('/api/healthcheck', { timeout: 5000 });
      console.log('API connection successful');
      setApiConnected(true);
      return true;
    } catch (error) {
      console.error('API connection failed:', error);
      setApiConnected(false);
      return false;
    }
  };

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

  const getCachedLandingContent = () => {
    try {
      const cachedData = localStorage.getItem('cachedLandingContent');
      if (!cachedData) return null;
      
      const { content, timestamp } = JSON.parse(cachedData);
      const now = new Date().getTime();
      const cacheAge = now - timestamp;

      if (cacheAge < 30 * 60 * 1000) {
        return content;
      }
      
      return null;
    } catch (error) {
      console.error('Error reading cached content:', error);
      return null;
    }
  };

  const fetchContent = useCallback(async () => {
    setIsLoading(true);
    
    try {
      const timestamp = new Date().getTime();
      // Fix: Use relative path - Next.js rewrites will handle the routing
      const response = await axios.get(`/api/content?t=${timestamp}`, {
        timeout: 5000
      });
      
      if (response.data) {
        const newHero = response.data.hero || landingContent.hero;
        const newFeatures = response.data.features || landingContent.features;
        const newCTA = response.data.callToAction || landingContent.callToAction;

        const newContent = {
          logo: {
            imageUrl: response.data.logo?.imageUrl || landingContent.logo.imageUrl
          },
          hero: {
            title: newHero.title || landingContent.hero.title,
            subtitle: newHero.subtitle || landingContent.hero.subtitle,
            videoUrl: newHero.videoUrl || null,
            posterImage: newHero.posterImage || null,
            carouselImages: newHero.carouselImages || [],
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
            buttonText: newCTA.buttonText || landingContent.callToAction.buttonText,
            buttonUrl: newCTA.buttonUrl || landingContent.callToAction.buttonUrl,
            enabled: typeof newCTA.enabled !== 'undefined' ? newCTA.enabled : true,
            videoUrl: newCTA.videoUrl || null,
            bgColor: newCTA.bgColor || landingContent.callToAction.bgColor || "#1e3a8a",
            textColor: newCTA.textColor || landingContent.callToAction.textColor || "#ffffff"
          }
        };

        setLandingContent(newContent);
        cacheLandingContent(newContent);
      }
    } catch (error) {
      console.error("Error fetching content:", error);
      const cachedContent = getCachedLandingContent();
      if (cachedContent) {
        setLandingContent(cachedContent);
      } else {
        console.log("No cached content available, using defaults");
      }
    } finally {
      setIsLoading(false);
    }
  }, [landingContent]);

  // KEEP ONLY THIS useEffect - the one with empty dependency array
  useEffect(() => {
    checkApiConnection();
    fetchContent();
  }, [fetchContent]); // Added fetchContent dependency

  // Carousel auto-rotation effect
  useEffect(() => {
    if (landingContent.hero.carouselImages && landingContent.hero.carouselImages.length > 1) {
      const interval = setInterval(() => {
        setCurrentCarouselIndex((prevIndex) => 
          (prevIndex + 1) % landingContent.hero.carouselImages.length
        );
      }, 5000); // Change image every 5 seconds

      return () => clearInterval(interval);
    } else {
      // Reset to first image if carousel images change
      setCurrentCarouselIndex(0);
    }
  }, [landingContent.hero.carouselImages]);

  // Reset carousel index when images change
  useEffect(() => {
    setCurrentCarouselIndex(0);
  }, [landingContent.hero.carouselImages]);


  const formatImageUrl = (url) => {
    if (!url) return null; 
    try {
      if (url.startsWith('blob:')) {
        console.warn("Blob URLs cannot be used on the public landing page:", url);
        return null;
      }

      // Handle both absolute and relative URLs, prevent duplicate query strings
      const baseUrl = url.split("?")[0]; // Remove any existing query params
      const isAbsolute = /^https?:\/\//i.test(baseUrl);
      
      if (isAbsolute) {
        // For absolute URLs, return as-is
        console.log('Formatting absolute URL:', url, '->', baseUrl);
        return baseUrl;
      }

      // For relative URLs, ensure they start with / and include BASE_URL if needed
      const path = baseUrl.startsWith('/') ? baseUrl : `/${baseUrl}`;
      
      // Check if we need to prepend the API base URL
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';
      const fullUrl = API_BASE ? `${API_BASE}${path}` : path;
      
      // Log the URL for debugging
      console.log('Formatting image URL:', url, '->', fullUrl);
      
      return fullUrl;
    } catch (error) {
      console.error('Error formatting URL:', error, url);
      return null;
    }
  };

  const renderImage = (url, alt, width, height, className, onErrorAction) => {
    const formattedUrl = formatImageUrl(url);
    if (!formattedUrl) return null;

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
      {/* Header Section - Updated to remove About button */}
      <header className="w-full flex justify-between items-center p-6 bg-[#01579B] shadow-md fixed top-0 left-0 right-0 z-10">
        <h1 className="text-2xl font-bold flex items-center">
          {landingContent.logo?.imageUrl ? (
            <Image 
              src={`${formatImageUrl(landingContent.logo.imageUrl)}?timestamp=${new Date().getTime()}`}
              alt="Site Logo" 
              width={60}
              height={20} 
              className="mr-2"
              priority
              unoptimized={true}
              quality={95}
              style={{ maxHeight: 'calc(51px - (0px * 2))' }}
              onError={(e) => {
                console.error("Error loading logo:", landingContent.logo.imageUrl);
                console.error("Formatted URL:", formatImageUrl(landingContent.logo.imageUrl));
                
                // Try multiple fallback URLs for logo
                const fallbackUrls = [
                  landingContent.logo.imageUrl.replace('/uploads/images/', '/api/uploads/images/'),
                  landingContent.logo.imageUrl.replace('/uploads/', '/api/uploads/'),
                  landingContent.logo.imageUrl.replace('/uploads/images/', '/uploads/'),
                  landingContent.logo.imageUrl
                ];
                
                const img = e.currentTarget;
                const tryNextFallback = (index) => {
                  if (index >= fallbackUrls.length) {
                    console.error('All logo fallback URLs failed, hiding logo');
                    img.style.display = 'none';
                    return;
                  }
                  
                  const fallbackUrl = fallbackUrls[index];
                  console.log('Trying logo fallback URL:', fallbackUrl);
                  img.src = `${fallbackUrl}?timestamp=${new Date().getTime()}`;
                  img.onload = () => {
                    console.log('Logo fallback URL worked:', fallbackUrl);
                  };
                  img.onerror = () => {
                    console.error('Logo fallback URL failed:', fallbackUrl);
                    tryNextFallback(index + 1);
                  };
                };
                
                tryNextFallback(0);
              }}
              onLoad={() => {
                console.log('Logo loaded successfully:', landingContent.logo.imageUrl);
              }}
            />
          ) : (
            <Image 
              src={stiLogo} 
              alt="STI Logo" 
              width={130}
              height={50} 
              className="mr-2"
              priority
              quality={95}
              style={{ maxHeight: 'calc(51px - (0px * 2))' }}
            />
          )}
          <span className="text-white">TrustElect Voting System</span>
        </h1>
        
        <nav className="flex items-center gap-4">
          {/* Removed About button */}
          <Button
            onClick={() => setShowLogin(true)}
            className="cursor-pointer px-6 py-2 br-5 bg-[#0000FF] text-white font-semibold rounded-lg shadow-md hover:bg-blue-800"
          >
            Login
          </Button>
        </nav>
      </header>

      <main className="flex-grow pt-24">
        <section 
        className="text-white py-20 px-6"
        style={{
          backgroundColor: landingContent.hero?.bgColor || '#01579B',
          color: landingContent.hero?.textColor || '#ffffff'
        }}
      >
        <div className="container mx-auto max-w-7xl flex flex-col lg:flex-row items-center">
          <div className="lg:w-2/5 space-y-6 pr-0 lg:pr-8 z-10 relative">
            <h1 
              className="text-4xl md:text-6xl font-bold leading-tight text-left"
              style={{ color: landingContent.hero?.textColor || '#ffffff' }}
            >
              {landingContent.hero.title}
            </h1>
            <p 
              className="text-xl md:text-2xl text-left"
              style={{ color: landingContent.hero?.textColor || '#ffffff' }}
            >
              {landingContent.hero.subtitle}
            </p>
            
          </div>
          <div className="lg:w-3/5 mt-10 lg:mt-0 flex justify-center w-full">
            {(() => {
              // Check for carousel images first
              if (landingContent.hero.carouselImages && landingContent.hero.carouselImages.length > 0) {
                return (
                  <div className="w-full h-full min-h-[400px] bg-black/20 rounded-lg overflow-hidden relative">
                    {/* Carousel Images */}
                    <div className="relative w-full h-full">
                      {landingContent.hero.carouselImages.map((image, index) => {
                        const imageUrl = formatImageUrl(image);
                        if (!imageUrl) return null;
                        
                        return (
                          <div
                            key={index}
                            className={`absolute inset-0 transition-opacity duration-1000 ${
                              index === currentCarouselIndex ? 'opacity-100' : 'opacity-0'
                            }`}
                          >
                            <Image
                              src={`${imageUrl}?timestamp=${new Date().getTime()}`}
                              alt={`Hero carousel ${index + 1}`}
                              width={2560}
                              height={1440}
                              className="w-full h-full object-cover"
                              unoptimized={true}
                              priority={index === 0}
                              quality={95}
                              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
                              onError={(e) => {
                                console.error(`Error loading carousel image ${index + 1}:`, imageUrl);
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Carousel Indicators */}
                    {landingContent.hero.carouselImages.length > 1 && (
                      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                        {landingContent.hero.carouselImages.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => setCurrentCarouselIndex(index)}
                            className={`w-3 h-3 rounded-full transition-colors ${
                              index === currentCarouselIndex 
                                ? 'bg-white' 
                                : 'bg-white/50 hover:bg-white/75'
                            }`}
                            aria-label={`Go to slide ${index + 1}`}
                          />
                        ))}
                      </div>
                    )}
                    
                    {/* Navigation Arrows */}
                    {landingContent.hero.carouselImages.length > 1 && (
                      <>
                        <button
                          onClick={() => setCurrentCarouselIndex(
                            currentCarouselIndex === 0 
                              ? landingContent.hero.carouselImages.length - 1 
                              : currentCarouselIndex - 1
                          )}
                          className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                          aria-label="Previous image"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setCurrentCarouselIndex(
                            (currentCarouselIndex + 1) % landingContent.hero.carouselImages.length
                          )}
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                          aria-label="Next image"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                );
              }
              
              // Default fallback - no carousel images
              return (
                <div className="w-full h-full min-h-[400px] bg-blue-700 rounded-lg flex items-center justify-center">
                  <span className="text-2xl text-white/70">Upload images to create carousel</span>
                </div>
              );
            })()}
          </div>
        </div>
      </section>

      {/* Call to Action Section - Moved after Hero */}
      {landingContent.callToAction.enabled && (
        <section 
          className="text-white py-16 px-6"
          style={{
            backgroundColor: landingContent.callToAction?.bgColor || '#1e3a8a',
            color: landingContent.callToAction?.textColor || '#ffffff'
          }}
        >
          <div className="container mx-auto max-w-6xl">
            <div className="space-y-6">
              {/* Title above the video */}
              <div className="text-center">
                <h2 
                  className="text-4xl md:text-5xl font-bold drop-shadow-2xl"
                  style={{ color: landingContent.callToAction?.textColor || '#ffffff' }}
                >
                  {landingContent.callToAction.title}
                </h2>
              </div>

              {/* Video container - Same size as hero poster */}
              {(() => {
                console.log("=== CTA SECTION DEBUG ===");
                console.log("CTA video URL:", landingContent.callToAction?.videoUrl);
                console.log("CTA enabled:", landingContent.callToAction?.enabled);
                console.log("Formatted CTA video URL:", landingContent.callToAction?.videoUrl ? formatImageUrl(landingContent.callToAction.videoUrl) : null);
                
                // Safety check: Ensure CTA video is not accidentally using hero video
                if (landingContent.callToAction?.videoUrl && landingContent.hero?.videoUrl && 
                    formatImageUrl(landingContent.callToAction.videoUrl) === formatImageUrl(landingContent.hero.videoUrl)) {
                  console.warn("WARNING: CTA video URL matches Hero video URL - this should not happen!");
                  console.warn("CTA video URL:", formatImageUrl(landingContent.callToAction.videoUrl));
                  console.warn("Hero video URL:", formatImageUrl(landingContent.hero.videoUrl));
                }
                
                console.log("========================");
                
                return landingContent.callToAction?.videoUrl;
              })() ? (
                <div className="w-full max-w-4xl aspect-video bg-black/20 rounded-lg overflow-hidden relative mx-auto">
                  <video
                    src={formatImageUrl(landingContent.callToAction.videoUrl)}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="w-full h-full object-cover"
                    onLoadStart={() => {
                      console.log("CTA Video loading started:", landingContent.callToAction.videoUrl);
                    }}
                    onLoadedData={() => {
                      console.log("CTA Video loaded successfully:", landingContent.callToAction.videoUrl);
                    }}
                    onError={(e) => {
                      console.error("Error loading CTA video:", landingContent.callToAction.videoUrl);
                      console.error("Formatted URL:", formatImageUrl(landingContent.callToAction.videoUrl));
                      e.currentTarget.style.display = 'none';
                      const parent = e.currentTarget.parentElement;
                      if (parent) {
                        const fallback = document.createElement('div');
                        fallback.className = 'absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-700';
                        fallback.innerHTML = `
                          <div class="text-center">
                            <p class="text-2xl text-white">Video unavailable</p>
                          </div>
                        `;
                        parent.appendChild(fallback);
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="w-full max-w-4xl aspect-video flex items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-purple-700 mx-auto">
                  <p className="text-2xl text-white">No video uploaded</p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Features Section - Moved after CTA */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">
            Key Features
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {landingContent.features.columns.map((feature, index) => {
              if (index === 0) {
                console.log("Feature Card 1 data:", feature);
                console.log("Feature Card 1 image URL:", feature.imageUrl);
              }

              let imageUrl = null;
              if (feature.imageUrl) {
                const formattedUrl = formatImageUrl(feature.imageUrl);
                imageUrl = formattedUrl ? `${formattedUrl}?timestamp=${new Date().getTime()}` : null;

                const isHeroImage = landingContent.hero && 
                  (feature.imageUrl === landingContent.hero.videoUrl || 
                    feature.imageUrl === landingContent.hero.posterImage);
                    
                if (isHeroImage) {
                  console.warn(`Feature ${index} image URL matches a hero image - ignoring`);
                  imageUrl = null;
                }
              }

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
                    width={800}
                    height={600}
                    className="w-full h-full object-cover"
                    unoptimized={true}
                    quality={95}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
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

      {/* New About Us Section */}
      <section className="py-20 px-6 bg-white">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-4xl font-bold text-center mb-12 text-blue-900">
            About Us
          </h2>
          
          <div className="max-w-4xl mx-auto">
            <p className="mb-6 text-lg text-gray-800 leading-relaxed">
              TrustElect is a comprehensive election management system dedicated to fostering secure, efficient, and transparent electoral processes. We provide a robust platform designed to empower both administrators and voters throughout every stage of an election, from initial setup to the declaration of results.
            </p>
            
            <div className="mb-8">
              <h3 className="text-2xl font-semibold mb-4 text-blue-800">
                Our Platform Provides:
              </h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-800">
                <li>Secure Administration with Role-Based Access Control (RBAC) and data encryption using Advance Encryption System 256 (AES – 256)</li>
                <li>Efficient Database Management for fast and accurate processing</li>
                <li>User-Friendly Interfaces that prioritize ease of use</li>
                <li>Verifiable Ballot Receipts through encrypted ballots and receipt confirmation</li>
                <li>Transparent Results with partial vote counting for clear visualization and easily understandable results promoting transparency and integrity</li>
              </ul>
            </div>
            
            <p className="mb-8 text-lg text-gray-800 leading-relaxed">
              At TrustElect, our objective is to increase trust in the electoral process by providing a safe, transparent, and dependable platform. We are devoted to fair elections, accurate results, and the ongoing strengthening of democratic processes.
            </p>
            
            <div className="mb-8">
              <h3 className="text-2xl font-semibold mb-6 text-blue-800">
                Meet the Team
              </h3>
              <p className="mb-6 text-lg text-gray-800 leading-relaxed">
                Our team consists of enthusiastic individuals with growing experience in software development, cybersecurity, and election systems. We deliver a trusted and effective election management platform by combining technical skills with real-world understanding, guided by an experienced IT instructor.
              </p>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-blue-50 p-6 rounded-lg">
                  <h4 className="font-bold text-blue-900 mb-2">Steven Baradero</h4>
                  <p className="text-blue-700 font-semibold mb-2">Project Manager</p>
                  <p className="text-gray-700">Leads project planning, execution, and team coordination.</p>
                </div>
                
                <div className="bg-blue-50 p-6 rounded-lg">
                  <h4 className="font-bold text-blue-900 mb-2">Suiluj Louis Anunciado</h4>
                  <p className="text-blue-700 font-semibold mb-2">Lead Programmer</p>
                  <p className="text-gray-700">Heads development, system architecture, and security implementation.</p>
                </div>
                
                <div className="bg-blue-50 p-6 rounded-lg">
                  <h4 className="font-bold text-blue-900 mb-2">Elmie Sanico</h4>
                  <p className="text-blue-700 font-semibold mb-2">System Analyst</p>
                  <p className="text-gray-700">Translate user needs into functional, effective system designs.</p>
                </div>
                
                <div className="bg-blue-50 p-6 rounded-lg">
                  <h4 className="font-bold text-blue-900 mb-2">Giann Emerson Ararao</h4>
                  <p className="text-blue-700 font-semibold mb-2">Quality Assurance</p>
                  <p className="text-gray-700">Ensures the platform is secure, bug-free, and reliable through rigorous testing.</p>
                </div>
                
                <div className="bg-blue-100 p-6 rounded-lg md:col-span-2">
                  <h4 className="font-bold text-blue-900 mb-2">John Robert Soriano</h4>
                  <p className="text-blue-700 font-semibold mb-2">Adviser</p>
                  <p className="text-gray-700">Provides expert technical guidance and oversight to uphold industry standards.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#01579B] text-white py-8 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <h2 className="text-xl font-bold text-white">TrustElect</h2>
              <p className="text-white">STI TrustElect Voting System</p>
            </div>
            <div className="text-white text-sm">
              © {new Date().getFullYear()} TrustElect
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

      {/* Remove the About Modal completely */}
    </div>
  );
}