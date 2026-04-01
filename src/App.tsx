/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Image as ImageIcon, Car, Mountain, Building2, Leaf, Palette, Download, X, Maximize2, Heart, Star, Clock } from 'lucide-react';
import Fuse from 'fuse.js';

// --- Types ---
interface Wallpaper {
  id: string;
  url: string;
  thumbnail: string;
  category: string;
  title: string;
  ratings: number[];
  averageRating: number;
}

interface Category {
  id: string;
  name: string;
  icon: React.ReactNode;
  seed: string;
}

// --- Constants ---
const CATEGORIES: Category[] = [
  { id: 'all', name: 'All', icon: <ImageIcon size={18} />, seed: 'wallpaper' },
  { id: 'cars', name: 'Cars', icon: <Car size={18} />, seed: 'supercar' },
  { id: 'landscapes', name: 'Landscapes', icon: <Mountain size={18} />, seed: 'landscape' },
  { id: 'architecture', name: 'Architecture', icon: <Building2 size={18} />, seed: 'architecture' },
  { id: 'nature', name: 'Nature', icon: <Leaf size={18} />, seed: 'nature' },
  { id: 'abstract', name: 'Abstract', icon: <Palette size={18} />, seed: 'abstract' },
];

// --- Helper Functions ---
const generateWallpapers = (category: string, count: number): Wallpaper[] => {
  return Array.from({ length: count }).map((_, i) => {
    const id = `${category}-${i}`;
    const seed = CATEGORIES.find(c => c.id === category)?.seed || 'wallpaper';
    const initialRatings = Array.from({ length: 3 + Math.floor(Math.random() * 5) }).map(() => 3 + Math.floor(Math.random() * 3));
    return {
      id,
      url: `https://picsum.photos/seed/${id}/1920/1080`,
      thumbnail: `https://picsum.photos/seed/${id}/600/400`,
      category,
      title: `${category.charAt(0).toUpperCase() + category.slice(1)} View ${i + 1}`,
      ratings: initialRatings,
      averageRating: initialRatings.reduce((a, b) => a + b, 0) / initialRatings.length,
    };
  });
};

export default function App() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWallpaper, setSelectedWallpaper] = useState<Wallpaper | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Initialize wallpapers
  useEffect(() => {
    const allWallpapers = CATEGORIES.slice(1).flatMap(cat => 
      generateWallpapers(cat.id, cat.id === 'cars' ? 16 : 8)
    );
    setWallpapers(allWallpapers);
  }, []);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fuse.js configuration for fuzzy matching
  const fuse = useMemo(() => {
    return new Fuse(wallpapers, {
      keys: ['title', 'category'],
      threshold: 0.4,
      includeMatches: true,
    });
  }, [wallpapers]);

  const suggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return fuse.search(searchQuery).slice(0, 5).map(result => result.item);
  }, [fuse, searchQuery]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const newWallpaper: Wallpaper = {
        id: `user-${Date.now()}`,
        url: dataUrl,
        thumbnail: dataUrl,
        category: activeCategory === 'all' ? 'abstract' : activeCategory,
        title: `My Upload: ${file.name.split('.')[0]}`,
        ratings: [5],
        averageRating: 5,
      };
      setWallpapers(prev => [newWallpaper, ...prev]);
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleRate = (id: string, rating: number) => {
    setWallpapers(prev => prev.map(wp => {
      if (wp.id === id) {
        const newRatings = [...wp.ratings, rating];
        return {
          ...wp,
          ratings: newRatings,
          averageRating: newRatings.reduce((a, b) => a + b, 0) / newRatings.length,
        };
      }
      return wp;
    }));
    
    // Update selected wallpaper if it's the one being rated
    if (selectedWallpaper?.id === id) {
      setSelectedWallpaper(prev => {
        if (!prev) return null;
        const newRatings = [...prev.ratings, rating];
        return {
          ...prev,
          ratings: newRatings,
          averageRating: newRatings.reduce((a, b) => a + b, 0) / newRatings.length,
        };
      });
    }
  };

  const filteredWallpapers = useMemo(() => {
    let results = wallpapers;
    
    if (activeCategory !== 'all') {
      results = results.filter(wp => wp.category === activeCategory);
    }
    
    if (searchQuery.trim()) {
      const searchResults = fuse.search(searchQuery);
      results = searchResults.map(res => res.item);
      
      // If we're in a specific category, filter the search results by that category too
      if (activeCategory !== 'all') {
        results = results.filter(wp => wp.category === activeCategory);
      }
    }
    
    return results;
  }, [wallpapers, activeCategory, searchQuery, fuse]);

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(fav => fav !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#1a1a1a] font-sans selection:bg-blue-100">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
              <ImageIcon size={24} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">WallVista</h1>
          </div>

          <div className="flex items-center gap-3 flex-1 max-w-xl">
            <div className="relative flex-1" ref={searchRef}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search wallpapers..."
                className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-full focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
              />
              
              {/* Auto-suggestions Dropdown */}
              <AnimatePresence>
                {isSearchFocused && searchQuery.trim() && suggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50"
                  >
                    <div className="p-2">
                      <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Suggestions</div>
                      {suggestions.map((wp) => (
                        <button
                          key={wp.id}
                          onClick={() => {
                            setSearchQuery(wp.title);
                            setIsSearchFocused(false);
                            setSelectedWallpaper(wp);
                          }}
                          className="w-full flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl transition-colors text-left group"
                        >
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                            <img src={wp.thumbnail} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">{wp.title}</div>
                            <div className="text-[10px] text-gray-400 uppercase tracking-wide">{wp.category}</div>
                          </div>
                          <Clock size={14} className="text-gray-300" />
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-full cursor-pointer hover:bg-blue-700 transition-colors shadow-md shadow-blue-200 shrink-0">
              <Download size={18} className="rotate-180" />
              <span className="text-sm font-semibold hidden sm:inline">Upload</span>
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleFileUpload}
                disabled={isUploading}
              />
            </label>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Categories */}
        <div className="flex items-center gap-3 overflow-x-auto pb-4 no-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full whitespace-nowrap transition-all ${
                activeCategory === cat.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {cat.icon}
              <span className="font-medium text-sm">{cat.name}</span>
            </button>
          ))}
        </div>

        {/* Grid */}
        <motion.div 
          layout
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-8"
        >
          <AnimatePresence mode="popLayout">
            {filteredWallpapers.map((wp) => (
              <motion.div
                key={wp.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileHover={{ y: -4 }}
                className="group relative aspect-[4/3] bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all cursor-pointer border border-gray-100"
                onClick={() => setSelectedWallpaper(wp)}
              >
                <img
                  src={wp.thumbnail}
                  alt={wp.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                />
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <h3 className="text-white font-medium truncate pr-2">{wp.title}</h3>
                      <div className="flex items-center gap-1 text-yellow-400 text-xs">
                        <Star size={10} fill="currentColor" />
                        <span>{wp.averageRating.toFixed(1)}</span>
                        <span className="text-white/60">({wp.ratings.length})</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={(e) => toggleFavorite(wp.id, e)}
                        className={`p-2 rounded-full backdrop-blur-md transition-colors ${
                          favorites.includes(wp.id) ? 'bg-red-500 text-white' : 'bg-white/20 text-white hover:bg-white/40'
                        }`}
                      >
                        <Heart size={16} fill={favorites.includes(wp.id) ? "currentColor" : "none"} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {filteredWallpapers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <ImageIcon size={48} className="mb-4 opacity-20" />
            <p className="text-lg">No wallpapers found for your search.</p>
          </div>
        )}
      </main>

      {/* Preview Modal */}
      <AnimatePresence>
        {selectedWallpaper && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-black/90 backdrop-blur-sm"
            onClick={() => setSelectedWallpaper(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-6xl w-full h-full max-h-[90vh] bg-[#151619] rounded-3xl overflow-hidden shadow-2xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                    <ImageIcon size={16} />
                  </div>
                  <div>
                    <h2 className="text-white font-semibold leading-tight">{selectedWallpaper.title}</h2>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 uppercase tracking-wider">{selectedWallpaper.category}</span>
                      <div className="w-1 h-1 bg-gray-600 rounded-full" />
                      <div className="flex items-center gap-1 text-yellow-400 text-xs">
                        <Star size={12} fill="currentColor" />
                        <span className="font-bold">{selectedWallpaper.averageRating.toFixed(1)}</span>
                        <span className="text-gray-500">({selectedWallpaper.ratings.length} ratings)</span>
                      </div>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedWallpaper(null)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Image Container */}
              <div className="flex-1 relative overflow-hidden bg-black flex items-center justify-center group">
                <img
                  src={selectedWallpaper.url}
                  alt={selectedWallpaper.title}
                  className="max-w-full max-h-full object-contain"
                  referrerPolicy="no-referrer"
                />
                
                {/* Image Actions */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 px-6 py-3 bg-white/10 backdrop-blur-xl rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <button 
                    onClick={() => window.open(selectedWallpaper.url, '_blank')}
                    className="flex items-center gap-2 text-white hover:text-blue-400 transition-colors"
                  >
                    <Maximize2 size={18} />
                    <span className="text-sm font-medium">Full View</span>
                  </button>
                  <div className="w-px h-4 bg-white/20" />
                  <button 
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = selectedWallpaper.url;
                      link.download = `${selectedWallpaper.title}.jpg`;
                      link.click();
                    }}
                    className="flex items-center gap-2 text-white hover:text-blue-400 transition-colors"
                  >
                    <Download size={18} />
                    <span className="text-sm font-medium">Download</span>
                  </button>
                  <div className="w-px h-4 bg-white/20" />
                  <button 
                    onClick={(e) => toggleFavorite(selectedWallpaper.id, e)}
                    className={`flex items-center gap-2 transition-colors ${
                      favorites.includes(selectedWallpaper.id) ? 'text-red-500' : 'text-white hover:text-red-400'
                    }`}
                  >
                    <Heart size={18} fill={favorites.includes(selectedWallpaper.id) ? "currentColor" : "none"} />
                    <span className="text-sm font-medium">Favorite</span>
                  </button>
                </div>
              </div>

              {/* Rating Footer */}
              <div className="p-6 bg-white/5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-white text-sm font-medium">Rate this wallpaper:</div>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => handleRate(selectedWallpaper.id, star)}
                      className="p-2 text-gray-500 hover:text-yellow-400 transition-all hover:scale-125"
                    >
                      <Star size={24} fill={star <= Math.round(selectedWallpaper.averageRating) ? "currentColor" : "none"} />
                    </button>
                  ))}
                </div>
                <div className="text-xs text-gray-500 italic">Your rating helps others find the best wallpapers!</div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-gray-200 mt-12 text-center">
        <p className="text-gray-400 text-sm">
          WallVista • High Quality Wallpapers for Your Devices
        </p>
        <p className="text-blue-600 font-semibold mt-2">Made By Tirth</p>
        <div className="flex justify-center gap-6 mt-4">
          <a href="#" className="text-xs text-gray-400 hover:text-blue-600 uppercase tracking-widest font-semibold">Privacy</a>
          <a href="#" className="text-xs text-gray-400 hover:text-blue-600 uppercase tracking-widest font-semibold">Terms</a>
          <a href="#" className="text-xs text-gray-400 hover:text-blue-600 uppercase tracking-widest font-semibold">Contact</a>
        </div>
      </footer>
    </div>
  );
}
