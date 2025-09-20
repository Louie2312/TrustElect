"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import LoginForm from "@/components/Auth/LoginForm";
import { Button } from "@/components/ui/button";
import stiLogo from "../assets/sti_logo.png";
import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';
import { 
  Clock, 
  Calendar, 
  CheckCircle, 
  Users, 
  Vote, 
  BarChart3, 
  ChevronLeft, 
  ChevronRight,
  Play,
  Pause,
  RefreshCw
} from "lucide-react";

export default function Home() {
  const [showLogin, setShowLogin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [apiConnected, setApiConnected] = useState(false);
  
  // Election carousel states
  const [elections, setElections] = useState({
    ongoing: [],
    upcoming: [],
    completed: []
  });
  const [currentStatus, setCurrentStatus] = useState('ongoing');
  const [currentElectionIndex, setCurrentElectionIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  
  const [landingContent, setLandingContent] = useState({
    logo: {
      imageUrl: null
    },
    hero: {
      title: "TrustElect Voting Platform",
      subtitle: "STI TrustElect Voting System",
      videoUrl: null,
      posterImage: null
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
      enabled: true
    }
  });

  const checkApiConnection = async () => {
    try {
      // Use the same API pattern as superadmin dashboard
      const response = await fetch(`${API_BASE}/api/healthcheck`, {
        method: 'HEAD',
        timeout: 5000
      });
      
      if (response.ok) {
        console.log('API connection successful');
        setApiConnected(true);
        return true;
      } else {
        throw new Error(`API connection failed: ${response.status}`);
      }
    } catch (error) {
      console.error('API connection failed:', error);
      setApiConnected(false);
      return false;
    }
  };

  const fetchElections = useCallback(async () => {
    try {
      const statuses = ['ongoing', 'upcoming', 'completed'];
      const results = { ongoing: [], upcoming: [], completed: [] };
      
      await Promise.all(statuses.map(async (status) => {
        try {
          // Try public endpoint first
          let response = await fetch(`${API_BASE}/api/elections/public/status/${status}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          // If public endpoint fails, try the authenticated endpoint as fallback
          if (!response.ok) {
            console.log(`Public endpoint failed for ${status}, trying authenticated endpoint...`);
            response = await fetch(`${API_BASE}/api/elections/status/${status}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json'
              }
            });
          }
          
          if (!response.ok) {
            console.error(`Error fetching ${status} elections: ${response.status} ${response.statusText}`);
            results[status] = [];
            return;
          }
          
          const data = await response.json();
          
          if (data && Array.isArray(data)) {
            results[status] = data;
            console.log(`Fetched ${data.length} ${status} elections:`, data);
          } else {
            console.log(`No ${status} elections found or invalid response format:`, data);
            results[status] = [];
          }
        } catch (err) {
          console.error(`Error fetching ${status} elections:`, err);
          results[status] = [];
        }
      }));
      
      console.log('Final elections data:', results);
      setElections(results);
      return results;
    } catch (err) {
      console.error('Error in fetchElections:', err);
      return { ongoing: [], upcoming: [], completed: [] };
    }
  }, []);

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
      // Use the same API pattern as superadmin dashboard
      const response = await fetch(`${API_BASE}/api/content?t=${timestamp}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Content fetch failed: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data) {
        const newHero = data.hero || landingContent.hero;
        const newFeatures = data.features || landingContent.features;
        const newCTA = data.callToAction || landingContent.callToAction;

        const newContent = {
          logo: {
            imageUrl: data.logo?.imageUrl || landingContent.logo.imageUrl
          },
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

  // Carousel navigation functions
  const getElectionsByStatus = (status) => {
    return elections[status] || [];
  };

  const nextStatus = () => {
    const statuses = ['ongoing', 'upcoming', 'completed'];
    const currentIndex = statuses.indexOf(currentStatus);
    const nextIndex = (currentIndex + 1) % statuses.length;
    setCurrentStatus(statuses[nextIndex]);
    setCurrentElectionIndex(0);
  };

  const prevStatus = () => {
    const statuses = ['ongoing', 'upcoming', 'completed'];
    const currentIndex = statuses.indexOf(currentStatus);
    const prevIndex = currentIndex === 0 ? statuses.length - 1 : currentIndex - 1;
    setCurrentStatus(statuses[prevIndex]);
    setCurrentElectionIndex(0);
  };

  const nextElection = () => {
    const currentElections = getElectionsByStatus(currentStatus);
    if (currentElections.length > 0) {
      setCurrentElectionIndex((prev) => (prev + 1) % currentElections.length);
    }
  };

  const prevElection = () => {
    const currentElections = getElectionsByStatus(currentStatus);
    if (currentElections.length > 0) {
      setCurrentElectionIndex((prev) => 
        prev === 0 ? currentElections.length - 1 : prev - 1
      );
    }
  };

  const getCurrentElection = () => {
    const currentElections = getElectionsByStatus(currentStatus);
    return currentElections[currentElectionIndex] || null;
  };

  const getStatusConfig = (status) => {
    const configs = {
      ongoing: {
        label: 'Ongoing Elections',
        icon: <Clock className="w-5 h-5" />,
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-800',
        borderColor: 'border-blue-300'
      },
      upcoming: {
        label: 'Upcoming Elections',
        icon: <Calendar className="w-5 h-5" />,
        bgColor: 'bg-yellow-100',
        textColor: 'text-yellow-800',
        borderColor: 'border-yellow-300'
      },
      completed: {
        label: 'Completed Elections',
        icon: <CheckCircle className="w-5 h-5" />,
        bgColor: 'bg-green-100',
        textColor: 'text-green-800',
        borderColor: 'border-green-300'
      }
    };
    return configs[status] || configs.ongoing;
  };

  const getTimeRemaining = (election) => {
    if (!election) return '';
    
    const now = new Date();
    const startDate = new Date(election.date_from);
    const endDate = new Date(election.date_to);
    
    if (election.status === 'upcoming') {
      const diff = startDate - now;
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      return `Starts in ${days}d ${hours}h`;
    } else if (election.status === 'ongoing') {
      const diff = endDate - now;
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      return `Ends in ${days}d ${hours}h`;
    } else {
      return 'Election Ended';
    }
  };

  const getCandidateImages = (election) => {
    if (!election?.positions) return [];
    
    const images = [];
    election.positions.forEach(position => {
      if (position.candidates) {
        position.candidates.forEach(candidate => {
          if (candidate.image_url) {
            images.push({
              url: candidate.image_url,
              name: candidate.name,
              position: position.name
            });
          }
        });
      }
    });
    
    return images.slice(0, 8); // Limit to 8 images
  };

  // KEEP ONLY THIS useEffect - the one with empty dependency array
  useEffect(() => {
    checkApiConnection();
    fetchContent();
    fetchElections();
  }, [fetchContent, fetchElections]); // Added fetchElections dependency

  // Auto-rotation effects
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      nextStatus();
    }, 10000); // Change status every 10 seconds

    return () => clearInterval(interval);
  }, [isPlaying, currentStatus]);

  useEffect(() => {
    if (!isPlaying) return;

    const currentElections = getElectionsByStatus(currentStatus);
    if (currentElections.length <= 1) return;

    const interval = setInterval(() => {
      nextElection();
    }, 5000); // Change election every 5 seconds within status

    return () => clearInterval(interval);
  }, [isPlaying, currentStatus, currentElectionIndex]);


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
        // For absolute URLs, return as-is for now
        console.log('Using absolute URL:', url);
        return url;
      }

      // For relative URLs, ensure they start with /
      const path = baseUrl.startsWith('/') ? baseUrl : `/${baseUrl}`;
      
      // Log the URL for debugging
      console.log('Formatting image URL:', url, '->', path);
      
      return path; // Return relative path for same-origin requests
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
              style={{ maxHeight: 'calc(51px - (0px * 2))' }}
              onError={(e) => {
                console.error("Error loading logo:", landingContent.logo.imageUrl);
                console.error("Formatted URL:", formatImageUrl(landingContent.logo.imageUrl));
                
                // Try API endpoint first, then direct uploads
                const apiUrl = landingContent.logo.imageUrl.startsWith('/uploads/') 
                  ? landingContent.logo.imageUrl.replace('/uploads/', '/api/uploads/')
                  : landingContent.logo.imageUrl;
                const directUrl = landingContent.logo.imageUrl.startsWith('/uploads/') 
                  ? landingContent.logo.imageUrl 
                  : `/uploads/images/${landingContent.logo.imageUrl.split('/').pop()}`;
                
                console.log('Trying API logo URL:', apiUrl);
                
                const img = e.currentTarget;
                img.src = `${apiUrl}?timestamp=${new Date().getTime()}`;
                img.onload = () => {
                  console.log('API logo URL worked:', apiUrl);
                };
                img.onerror = () => {
                  console.log('API logo URL failed, trying direct URL:', directUrl);
                  img.src = `${directUrl}?timestamp=${new Date().getTime()}`;
                  img.onload = () => {
                    console.log('Direct logo URL worked:', directUrl);
                  };
                  img.onerror = () => {
                    console.log('All logo URLs failed, hiding logo');
                    img.style.display = 'none';
                  };
                };
              }}
              onLoad={() => {
                console.log('Logo loaded successfully:', landingContent.logo.imageUrl);
              }}
            />
          ) : (
            <Image 
              src={stiLogo} 
              alt="STI Logo" 
              width={65}
              height={25} 
              className="mr-2"
              priority
              style={{ maxHeight: 'calc(51px - (0px * 2))' }}
            />
          )}
          <span className="text-white">TrustElect</span>
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
        <div className="container mx-auto max-w-6xl flex flex-col md:flex-row items-center">
          <div className="md:w-1/3 space-y-6">
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
          <div className="md:w-2/3 mt-10 md:mt-0 flex justify-center">
            {(() => {
              
              const heroVideoUrl = landingContent.hero && landingContent.hero.videoUrl ? 
                formatImageUrl(landingContent.hero.videoUrl) : null;
              
              const heroPosterUrl = landingContent.hero && landingContent.hero.posterImage ? 
                formatImageUrl(landingContent.hero.posterImage) : null;

          if (heroVideoUrl) {
                return (
            <div className="w-full max-w-6xl aspect-video bg-black/20 rounded-lg overflow-hidden relative">
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

              } else if (heroPosterUrl) {
                // Try API endpoint first, then fallback to direct uploads
                const apiUrl = heroPosterUrl.startsWith('/uploads/') 
                  ? heroPosterUrl.replace('/uploads/', '/api/uploads/')
                  : heroPosterUrl;
                const posterWithTimestamp = `${apiUrl}?timestamp=${new Date().getTime()}`;
                
                return (
              <div className="w-full max-w-6xl aspect-video bg-black/20 rounded-lg overflow-hidden">
                <Image
                  src={posterWithTimestamp}
                  alt="TrustElect Platform"
                  width={1920}
                  height={1080}
                  className="w-full h-full object-cover"
                  unoptimized={true}
                  onError={(e) => {
                    console.error("Error loading hero poster image:", posterWithTimestamp);
                    console.error("Original URL:", heroPosterUrl);
                    
                    // Try direct uploads path as fallback
                    const directUrl = heroPosterUrl.startsWith('/uploads/') 
                      ? heroPosterUrl 
                      : `/uploads/images/${heroPosterUrl.split('/').pop()}`;
                    const fallbackUrl = `${directUrl}?timestamp=${new Date().getTime()}`;
                    
                    const container = e.currentTarget.closest('div');
                    if (container) {
                      const img = document.createElement('img');
                      img.src = fallbackUrl;
                      img.className = 'w-full h-full object-cover';
                      img.onload = () => {
                        console.log('Fallback URL worked:', fallbackUrl); 
                        container.innerHTML = '';
                        container.appendChild(img);
                      };
                      img.onerror = () => {
                        console.log('All URLs failed, showing fallback');
                        container.innerHTML = `
                          <div class="w-full h-full flex items-center justify-center bg-blue-700">
                            <span class="text-xl text-white/70">Demo Video</span>
                          </div>
                        `;
                      };
                    }
                  }}
                  onLoad={() => {
                    console.log('Hero poster loaded successfully:', posterWithTimestamp);
                  }}
                />
              </div>
            );

              } else {
                return (
                  <div className="w-full max-w-6xl aspect-video bg-blue-700 rounded-lg flex items-center justify-center">

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
                    width={400}
                    height={300}
                    className="w-full h-full object-cover"
                    unoptimized={true}
                    onError={(e) => {
                      console.error(`Error loading feature image ${index}:`, imageUrl);
                      
                      // Try API endpoint as fallback
                      const apiUrl = feature.imageUrl.startsWith('/uploads/') 
                        ? feature.imageUrl.replace('/uploads/', '/api/uploads/')
                        : feature.imageUrl;
                      const fallbackUrl = `${apiUrl}?timestamp=${new Date().getTime()}`;
                      
                      const img = e.currentTarget;
                      img.src = fallbackUrl;
                      img.onload = () => {
                        console.log(`Feature ${index} fallback URL worked:`, fallbackUrl);
                      };
                      img.onerror = () => {
                        console.log(`Feature ${index} all URLs failed, hiding image`);
                        const container = e.currentTarget.closest('.mb-4');
                        if (container) {
                          container.style.display = 'none';
                        }
                      };
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

      {/* Election Carousel Section */}
      {landingContent.callToAction.enabled && (
        <section 
          className="text-white py-16 px-6 relative overflow-hidden"
          style={{
            backgroundColor: landingContent.callToAction?.bgColor || '#1e3a8a',
            color: landingContent.callToAction?.textColor || '#ffffff'
          }}
        >
          <div className="container mx-auto max-w-7xl">
            {/* Header */}
            <div className="text-center mb-8">
              <h2 
                className="text-4xl font-bold mb-4"
                style={{ color: landingContent.callToAction?.textColor || '#ffffff' }}
              >
                {landingContent.callToAction.title}
              </h2>
              <p 
                className="text-xl mb-6"
                style={{ color: landingContent.callToAction?.textColor || '#ffffff' }}
              >
                {landingContent.callToAction.subtitle}
              </p>
              
              {/* Status Tabs */}
              <div className="flex justify-center space-x-4 mb-6">
                {['ongoing', 'upcoming', 'completed'].map((status) => {
                  const config = getStatusConfig(status);
                  const isActive = currentStatus === status;
                  const statusElections = getElectionsByStatus(status);
                  return (
                    <button
                      key={status}
                      onClick={() => {
                        setCurrentStatus(status);
                        setCurrentElectionIndex(0);
                      }}
                      className={`flex items-center px-4 py-2 rounded-full border-2 transition-all ${
                        isActive 
                          ? `${config.bgColor} ${config.textColor} ${config.borderColor} border-opacity-100` 
                          : 'bg-white bg-opacity-20 text-white border-white border-opacity-30 hover:bg-opacity-30'
                      }`}
                    >
                      {config.icon}
                      <span className="ml-2 font-medium text-black">{config.label}</span>
                      <span className="ml-2 text-xs bg-black bg-opacity-20 text-black px-2 py-1 rounded-full">
                        {statusElections.length}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Election Display */}
            {(() => {
              const currentElection = getCurrentElection();
              const currentElections = getElectionsByStatus(currentStatus);
              
              if (!currentElection || currentElections.length === 0) {
                return (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🗳️</div>
                    <h3 className="text-2xl font-bold mb-2 text-black">No Elections Available</h3>
                    <p className="text-lg opacity-80 text-black">
                      {currentStatus === 'ongoing' && 'No ongoing elections at the moment.'}
                      {currentStatus === 'upcoming' && 'No upcoming elections scheduled.'}
                      {currentStatus === 'completed' && 'No completed elections to display.'}
                    </p>
                  </div>
                );
              }

              const statusConfig = getStatusConfig(currentStatus);
              const candidateImages = getCandidateImages(currentElection);
              const timeRemaining = getTimeRemaining(currentElection);

              return (
                <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-2xl p-8 relative">
                  {/* Status Badge */}
                  <div className="flex items-center justify-between mb-6">
                    <div className={`flex items-center px-4 py-2 rounded-full ${statusConfig.bgColor} ${statusConfig.textColor} border ${statusConfig.borderColor}`}>
                      {statusConfig.icon}
                      <span className="ml-2 font-semibold">{statusConfig.label}</span>
                    </div>
                    
                    {/* Controls */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          console.log('Manual refresh triggered');
                          fetchElections();
                        }}
                        className="p-2 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-all"
                        title="Refresh Elections"
                      >
                        <RefreshCw className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="p-2 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-all"
                        title={isPlaying ? "Pause Auto-rotation" : "Resume Auto-rotation"}
                      >
                        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Election Details */}
                  <div className="grid lg:grid-cols-2 gap-8">
                    {/* Left Side - Election Info */}
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-3xl font-bold mb-2 text-black">
                          {currentElection.title}
                        </h3>
                        <p className="text-lg text-black text-opacity-90 mb-4">
                          {currentElection.description}
                        </p>
                      </div>

                      {/* Time Status */}
                      <div className="bg-white bg-opacity-20 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-semibold text-black">Time Status</span>
                          <span className="text-lg text-black">{timeRemaining}</span>
                        </div>
                      </div>

                      {/* Election Stats */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white bg-opacity-20 rounded-lg p-4 text-center">
                          <Users className="w-8 h-8 mx-auto mb-2 text-black" />
                          <div className="text-2xl font-bold text-black">{currentElection.voter_count || 0}</div>
                          <div className="text-sm text-black text-opacity-80">Eligible Voters</div>
                        </div>
                        <div className="bg-white bg-opacity-20 rounded-lg p-4 text-center">
                          <Vote className="w-8 h-8 mx-auto mb-2 text-black" />
                          <div className="text-2xl font-bold text-black">{currentElection.vote_count || 0}</div>
                          <div className="text-sm text-black text-opacity-80">Votes Cast</div>
                        </div>
                      </div>

                      {/* Election Period */}
                      <div className="bg-white bg-opacity-20 rounded-lg p-4">
                        <h4 className="text-lg font-semibold text-black mb-3">Election Period</h4>
                        <div className="space-y-2 text-black text-opacity-90">
                          <div className="flex justify-between">
                            <span>Starts:</span>
                            <span>{new Date(currentElection.date_from).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Ends:</span>
                            <span>{new Date(currentElection.date_to).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Side - Candidate Images */}
                    {candidateImages.length > 0 && (
                      <div>
                        <h4 className="text-xl font-semibold text-black mb-4 text-center">Candidates</h4>
                        <div className="grid grid-cols-4 gap-3">
                          {candidateImages.map((candidate, index) => (
                            <div key={index} className="relative group">
                              <div className="aspect-square rounded-lg overflow-hidden bg-white bg-opacity-20">
                                <Image
                                  src={formatImageUrl(candidate.url) || '/placeholder-candidate.jpg'}
                                  alt={candidate.name}
                                  width={100}
                                  height={100}
                                  className="w-full h-full object-cover"
                                  unoptimized={true}
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              </div>
                              {/* Hover tooltip */}
                              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white text-xs p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="font-semibold">{candidate.name}</div>
                                <div className="text-opacity-80">{candidate.position}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Navigation Controls */}
                  <div className="flex items-center justify-between mt-8">
                    <button
                      onClick={prevStatus}
                      className="flex items-center px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-all text-black"
                    >
                      <ChevronLeft className="w-5 h-5 mr-2" />
                      <span className="text-black">Previous Status</span>
                    </button>

                    <div className="flex items-center space-x-2">
                      {/* Status Dots */}
                      {['ongoing', 'upcoming', 'completed'].map((status, index) => (
                        <button
                          key={status}
                          onClick={() => {
                            setCurrentStatus(status);
                            setCurrentElectionIndex(0);
                          }}
                          className={`w-3 h-3 rounded-full transition-all ${
                            currentStatus === status 
                              ? 'bg-white' 
                              : 'bg-white bg-opacity-30 hover:bg-opacity-50'
                          }`}
                        />
                      ))}
                    </div>

                    <button
                      onClick={nextStatus}
                      className="flex items-center px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-all text-black"
                    >
                      <span className="text-black">Next Status</span>
                      <ChevronRight className="w-5 h-5 ml-2" />
                    </button>
                  </div>

                  {/* Election Counter */}
                  {currentElections.length > 1 && (
                    <div className="text-center mt-4 text-black text-opacity-80">
                      Election {currentElectionIndex + 1} of {currentElections.length} in {statusConfig.label}
                    </div>
                  )}
                                
                </div>
              );
            })()}
          </div>
        </section>
      )}

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