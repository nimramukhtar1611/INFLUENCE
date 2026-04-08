// components/Common/StatsCard.js - COMPLETE FIXED VERSION
import React, { useState, useRef, useEffect } from 'react';
import { ArrowUpRight, ArrowDownRight, HelpCircle, Info } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../hooks/useTheme';

const StatsCard = ({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  color = 'indigo',
  trend = 'up',
  subtitle,
  tooltip,
  loading = false,
  onClick,
  className = '',
  valuePrefix = '',
  valueSuffix = '',
  decimals = 0
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef(null);
  const iconRef = useRef(null);

  // ==================== COLORS ====================
  const colors = {
    indigo: {
      bg: 'bg-indigo-100',
      text: 'text-indigo-600',
      gradient: 'from-indigo-600 to-purple-600'
    },
    blue: {
      bg: 'bg-blue-100',
      text: 'text-blue-600',
      gradient: 'from-blue-600 to-cyan-600'
    },
    green: {
      bg: 'bg-green-100',
      text: 'text-green-600',
      gradient: 'from-green-600 to-teal-600'
    },
    red: {
      bg: 'bg-red-100',
      text: 'text-red-600',
      gradient: 'from-red-600 to-pink-600'
    },
    yellow: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-600',
      gradient: 'from-yellow-600 to-orange-600'
    },
    purple: {
      bg: 'bg-purple-100',
      text: 'text-purple-600',
      gradient: 'from-purple-600 to-pink-600'
    },
    pink: {
      bg: 'bg-pink-100',
      text: 'text-pink-600',
      gradient: 'from-pink-600 to-rose-600'
    },
    orange: {
      bg: 'bg-orange-100',
      text: 'text-orange-600',
      gradient: 'from-orange-600 to-red-600'
    }
  };

  // ==================== FORMAT VALUE ====================
  const formatValue = () => {
    if (typeof value === 'number') {
      return value.toFixed(decimals);
    }
    return value;
  };

  // ==================== HANDLE TOOLTIP POSITION ====================
  useEffect(() => {
    if (showTooltip && iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      setTooltipPosition({
        top: rect.top - 40,
        left: rect.left + rect.width / 2
      });
    }
  }, [showTooltip]);

  // ==================== LOADING STATE ====================
  if (loading) {
    return (
      <div className={`p-6 rounded-xl shadow-sm animate-pulse ${
        isDark ? 'bg-gray-800' : 'bg-white'
      }`}>
        <div className={`h-12 w-12 rounded-lg mb-4 ${
          isDark ? 'bg-gray-700' : 'bg-gray-200'
        }`}></div>
        <div className={`h-4 rounded w-1/2 mb-2 ${
          isDark ? 'bg-gray-700' : 'bg-gray-200'
        }`}></div>
        <div className={`h-8 rounded w-3/4 ${
          isDark ? 'bg-gray-700' : 'bg-gray-200'
        }`}></div>
      </div>
    );
  }

  // ==================== GRADIENT CARD ====================
  if (color.startsWith('gradient-')) {
    const gradientColor = color.replace('gradient-', '');
    return (
      <div 
        className={`bg-gradient-to-br ${colors[gradientColor]?.gradient || colors.indigo.gradient} p-6 rounded-xl shadow-lg text-white cursor-pointer transition-transform hover:scale-105 min-h-[180px] flex flex-col justify-between ${className}`}
        onClick={onClick}
      >
        <div className="flex flex-col items-center justify-center text-center w-full overflow-hidden">
        <div className="flex items-center justify-center mb-3">
          {Icon && <Icon className="w-5 h-5 text-white opacity-90" />}
          {tooltip && (
            <div className="relative ml-2">
              <Info 
                ref={iconRef}
                className="w-4 h-4 text-white opacity-75 cursor-help"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
              />
            </div>
          )}
        </div>
        <p className="text-sm opacity-90 mb-2 font-medium text-center break-words px-2">{title}</p>
        <p className="text-2xl font-bold mb-2 break-words text-center px-2">{valuePrefix}{formatValue()}{valueSuffix}</p>
        {change && (
          <p className="text-sm opacity-90 flex items-center justify-center break-words max-w-full text-center px-2">
            {trend === 'up' ? <ArrowUpRight className="w-3 h-3 mr-1 flex-shrink-0" /> : <ArrowDownRight className="w-3 h-3 mr-1 flex-shrink-0" />}
            <span className="break-words">{change}</span>
          </p>
        )}
        {subtitle && <p className="text-xs opacity-75 mt-2 break-words text-center px-2">{subtitle}</p>}
        </div>
      </div>
    );
  }

  // ==================== REGULAR CARD ====================
  return (
    <div 
      className={`p-6 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer min-h-[180px] flex flex-col justify-between ${className} ${
        isDark ? 'bg-gray-800 hover:bg-gray-750' : 'bg-white hover:bg-gray-50'
      }`}
      onClick={onClick}
    >
      <div className="flex flex-col items-center justify-center text-center w-full overflow-hidden">
        <div className={`p-3 rounded-lg mb-3 ${colors[color]?.bg || colors.indigo.bg}`}>
          {Icon && <Icon className={`w-4 h-4 ${colors[color]?.text || colors.indigo.text}`} />}
        </div>
        
        <p className={`text-sm mb-2 font-medium text-center break-words px-2 ${
          isDark ? 'text-gray-400' : 'text-gray-600'
        }`}>{title}</p>
        <h3 className={`text-2xl font-bold break-words text-center px-2 ${
          isDark ? 'text-gray-100' : 'text-gray-900'
        }`}>{valuePrefix}{formatValue()}{valueSuffix}</h3>
        
        {change && (
          <span className={`text-sm font-medium flex items-center justify-center mt-2 break-words max-w-full text-center px-2 ${
            trend === 'up' ? 'text-green-600' : 'text-red-600'
          }`}>
            {trend === 'up' ? (
              <ArrowUpRight className="w-3 h-3 mr-1 flex-shrink-0" />
            ) : (
              <ArrowDownRight className="w-3 h-3 mr-1 flex-shrink-0" />
            )}
            <span className="break-words">{change}</span>
          </span>
        )}
        
        {subtitle && <p className={`text-xs mt-2 break-words text-center px-2 ${
          isDark ? 'text-gray-500' : 'text-gray-500'
        }`}>{subtitle}</p>}
        
        {tooltip && (
          <div className="relative mt-2">
            <HelpCircle 
              ref={iconRef}
              className={`w-4 h-4 cursor-help transition-colors ${
                isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'
              }`}
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            />
          </div>
        )}
      </div>

      {/* Tooltip Portal */}
      {showTooltip && tooltip && createPortal(
        <div
          ref={tooltipRef}
          className={`fixed z-50 px-3 py-2 text-sm rounded-lg shadow-lg ${
            isDark ? 'text-white bg-gray-900' : 'text-gray-900 bg-white'
          }`}
          style={{
            top: tooltipPosition.top,
            left: tooltipPosition.left,
            transform: 'translateX(-50%)'
          }}
        >
          {tooltip}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
            <div className="border-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

// ==================== STATS GROUP ====================
export const StatsGroup = ({ stats, columns = 4, className = '' }) => {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-5',
    6: 'grid-cols-1 md:grid-cols-3 lg:grid-cols-6'
  };

  return (
    <div className={`grid ${gridCols[columns] || gridCols[4]} gap-6 ${className}`}>
      {stats.map((stat, index) => (
        <StatsCard key={index} {...stat} />
      ))}
    </div>
  );
};

export default StatsCard;