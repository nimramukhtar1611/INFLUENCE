// components/Common/Loader.js - COMPLETE FIXED VERSION
import React from 'react';

const Loader = ({ 
  size = 'medium', 
  fullScreen = false,
  color = 'indigo',
  type = 'spinner',
  text,
  className = ''
}) => {
  // ==================== SIZES ====================
  const sizes = {
    xs: {
      spinner: 'w-4 h-4',
      dots: 'w-1.5 h-1.5',
      pulse: 'w-6 h-6',
      bar: 'h-0.5'
    },
    small: {
      spinner: 'w-6 h-6',
      dots: 'w-2 h-2',
      pulse: 'w-8 h-8',
      bar: 'h-1'
    },
    medium: {
      spinner: 'w-10 h-10',
      dots: 'w-3 h-3',
      pulse: 'w-12 h-12',
      bar: 'h-1.5'
    },
    large: {
      spinner: 'w-14 h-14',
      dots: 'w-4 h-4',
      pulse: 'w-16 h-16',
      bar: 'h-2'
    },
    xl: {
      spinner: 'w-20 h-20',
      dots: 'w-5 h-5',
      pulse: 'w-24 h-24',
      bar: 'h-2.5'
    }
  };

  // ==================== COLORS ====================
  const colors = {
    indigo: {
      spinner: 'border-indigo-600 border-t-transparent',
      dots: 'bg-indigo-600',
      pulse: 'bg-indigo-600',
      bar: 'bg-indigo-600'
    },
    blue: {
      spinner: 'border-blue-600 border-t-transparent',
      dots: 'bg-blue-600',
      pulse: 'bg-blue-600',
      bar: 'bg-blue-600'
    },
    green: {
      spinner: 'border-green-600 border-t-transparent',
      dots: 'bg-green-600',
      pulse: 'bg-green-600',
      bar: 'bg-green-600'
    },
    red: {
      spinner: 'border-red-600 border-t-transparent',
      dots: 'bg-red-600',
      pulse: 'bg-red-600',
      bar: 'bg-red-600'
    },
    purple: {
      spinner: 'border-purple-600 border-t-transparent',
      dots: 'bg-purple-600',
      pulse: 'bg-purple-600',
      bar: 'bg-purple-600'
    },
    gray: {
      spinner: 'border-gray-600 border-t-transparent',
      dots: 'bg-gray-600',
      pulse: 'bg-gray-600',
      bar: 'bg-gray-600'
    },
    white: {
      spinner: 'border-white border-t-transparent',
      dots: 'bg-white',
      pulse: 'bg-white',
      bar: 'bg-white'
    }
  };

  // ==================== SPINNER LOADER ====================
  const SpinnerLoader = () => (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={`
          ${sizes[size]?.spinner} 
          border-4 
          rounded-full 
          animate-spin
          ${colors[color]?.spinner || colors.indigo.spinner}
        `}
      />
      {text && <p className="text-sm text-gray-600">{text}</p>}
    </div>
  );

  // ==================== DOTS LOADER ====================
  const DotsLoader = () => (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="flex space-x-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`
              ${sizes[size]?.dots}
              rounded-full
              animate-bounce
              ${colors[color]?.dots || colors.indigo.dots}
            `}
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
      {text && <p className="text-sm text-gray-600">{text}</p>}
    </div>
  );

  // ==================== PULSE LOADER ====================
  const PulseLoader = () => (
    <div className="flex flex-col items-center justify-center gap-4">
      <div
        className={`
          ${sizes[size]?.pulse}
          rounded-full
          animate-ping
          ${colors[color]?.pulse || colors.indigo.pulse}
          opacity-75
        `}
      />
      {text && <p className="text-sm text-gray-600">{text}</p>}
    </div>
  );

  // ==================== BAR LOADER ====================
  const BarLoader = () => (
    <div className="flex flex-col items-center justify-center gap-3 w-full max-w-md">
      <div className="w-full bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`
            ${sizes[size]?.bar}
            ${colors[color]?.bar || colors.indigo.bar}
            rounded-full
            animate-loading-bar
          `}
          style={{ width: '100%' }}
        />
      </div>
      {text && <p className="text-sm text-gray-600">{text}</p>}
    </div>
  );

  // ==================== SKELETON LOADER ====================
  const SkeletonLoader = () => (
    <div className="space-y-3 w-full max-w-md">
      <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
      <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
      <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6"></div>
      <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3"></div>
    </div>
  );

  // ==================== TABLE SKELETON ====================
  const TableSkeleton = ({ rows = 5, columns = 4 }) => (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex gap-4">
        {[...Array(columns)].map((_, i) => (
          <div key={i} className="h-8 bg-gray-200 rounded animate-pulse flex-1"></div>
        ))}
      </div>
      
      {/* Rows */}
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex gap-4">
          {[...Array(columns)].map((_, j) => (
            <div key={j} className="h-12 bg-gray-100 rounded animate-pulse flex-1"></div>
          ))}
        </div>
      ))}
    </div>
  );

  // ==================== CARD SKELETON ====================
  const CardSkeleton = () => (
    <div className="bg-white p-6 rounded-xl shadow-sm space-y-4">
      <div className="h-12 w-12 bg-gray-200 rounded-lg animate-pulse"></div>
      <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
      <div className="h-8 bg-gray-200 rounded animate-pulse w-3/4"></div>
      <div className="h-4 bg-gray-200 rounded animate-pulse w-1/3"></div>
    </div>
  );

  // ==================== PROFILE SKELETON ====================
  const ProfileSkeleton = () => (
    <div className="space-y-6">
      <div className="h-32 bg-gray-200 rounded-t-xl animate-pulse"></div>
      <div className="px-8 pb-8">
        <div className="flex items-end -mt-12 mb-6">
          <div className="w-24 h-24 bg-gray-200 rounded-full border-4 border-white animate-pulse"></div>
          <div className="ml-6 flex-1">
            <div className="h-8 bg-gray-200 rounded animate-pulse w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-1/4"></div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    </div>
  );

  // ==================== RENDER BASED ON TYPE ====================
  const renderLoader = () => {
    switch(type) {
      case 'dots':
        return <DotsLoader />;
      case 'pulse':
        return <PulseLoader />;
      case 'bar':
        return <BarLoader />;
      case 'skeleton':
        return <SkeletonLoader />;
      case 'table':
        return <TableSkeleton />;
      case 'card':
        return <CardSkeleton />;
      case 'profile':
        return <ProfileSkeleton />;
      default:
        return <SpinnerLoader />;
    }
  };

  // ==================== FULL SCREEN LOADER ====================
  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-80 z-50 flex items-center justify-center">
        <div className={`${className}`}>
          {renderLoader()}
        </div>
      </div>
    );
  }

  // ==================== NORMAL LOADER ====================
  return (
    <div className={`flex items-center justify-center ${className}`}>
      {renderLoader()}
    </div>
  );
};

// ==================== PAGE LOADER ====================
export const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <Loader size="large" />
  </div>
);

// ==================== SECTION LOADER ====================
export const SectionLoader = () => (
  <div className="py-12 flex items-center justify-center">
    <Loader size="medium" />
  </div>
);

// ==================== BUTTON LOADER ====================
export const ButtonLoader = ({ color = 'white' }) => (
  <Loader size="xs" color={color} type="spinner" />
);

// ==================== EXPORT ====================
export default Loader;