import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('q') || '';
  
  const [creators, setCreators] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalResults, setTotalResults] = useState(0);
  const [error, setError] = useState('');

  const creatorsPerPage = 20;

  const fetchCreators = useCallback(async (page = 1, searchQuery = query) => {
    if (!searchQuery.trim()) {
      setCreators([]);
      setTotalPages(0);
      setTotalResults(0);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `/api/search/creators?q=${encodeURIComponent(searchQuery)}&page=${page}&limit=${creatorsPerPage}`
      );
      const data = await response.json();

      if (data.success) {
        setCreators(data.creators || []);
        setTotalPages(data.totalPages || 0);
        setTotalResults(data.total || 0);
        setCurrentPage(data.currentPage || page);
      } else {
        setError(data.error || 'Failed to fetch creators');
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to fetch creators. Please try again.');
      setCreators([]);
      setTotalPages(0);
      setTotalResults(0);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    if (query) {
      fetchCreators(1, query);
    }
  }, [query, fetchCreators]);

  const handlePageChange = useCallback((newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      fetchCreators(newPage, query);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [totalPages, query, fetchCreators]);

  const handleCreatorClick = useCallback((creatorId) => {
    navigate(`/creator/${creatorId}`);
  }, [navigate]);

  const getPaginationNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Search Results for "{query}"
              </h1>
              {totalResults > 0 && (
                <p className="mt-1 text-sm text-gray-600">
                  {totalResults.toLocaleString()} creator{totalResults !== 1 ? 's' : ''} found
                </p>
              )}
            </div>
            <button
              onClick={() => navigate('/')}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              ← Back to Home
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading creators...</span>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <div className="text-red-600 text-lg font-medium mb-2">Error</div>
            <p className="text-gray-600">{error}</p>
            <button
              onClick={() => fetchCreators(currentPage, query)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : creators.length === 0 && query ? (
          <div className="text-center py-20">
            <div className="text-gray-400 text-lg font-medium mb-2">No creators found</div>
            <p className="text-gray-600">
              Try searching with different keywords or check spelling
            </p>
          </div>
        ) : (
          <>
            {/* Results Grid - Left aligned */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-start">
              {creators.map((creator, index) => (
                <motion.div
                  key={creator._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  onClick={() => handleCreatorClick(creator._id)}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer max-w-sm w-full"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <img
                      src={creator.profilePicture || '/default-avatar.png'}
                      alt={creator.displayName}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">
                        {creator.displayName}
                      </h3>
                      <p className="text-sm text-gray-500 truncate">@{creator.handle}</p>
                    </div>
                  </div>
                  
                  {creator.bio && (
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                      {creator.bio}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                    <span>{(creator.totalFollowers || 0).toLocaleString()} followers</span>
                    <span>{(creator.averageEngagement || 0).toFixed(1)}% engagement</span>
                  </div>
                  
                  {creator.niches && creator.niches.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {creator.niches.slice(0, 3).map((niche, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                        >
                          {niche}
                        </span>
                      ))}
                      {creator.niches.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                          +{creator.niches.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-12 flex items-center justify-center">
                <div className="flex items-center gap-2">
                  {/* Previous Button */}
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>

                  {/* Page Numbers */}
                  {getPaginationNumbers().map((pageNum) => (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        pageNum === currentPage
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}

                  {/* Next Button */}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SearchResults;
