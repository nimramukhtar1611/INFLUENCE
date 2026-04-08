// Unified Color Scheme for Professional Look
// Consistent colors across all dashboards (Admin, Creator, Brand)

export const statusColors = {
  // Standardized status colors - Same background, different icon colors
  active: {
    light: 'bg-gray-50 text-gray-700 border-gray-200',
    dark: 'bg-gray-800/50 text-gray-300 border-gray-700/50'
  },
  pending: {
    light: 'bg-gray-50 text-gray-700 border-gray-200',
    dark: 'bg-gray-800/50 text-gray-300 border-gray-700/50'
  },
  suspended: {
    light: 'bg-gray-50 text-gray-700 border-gray-200',
    dark: 'bg-gray-800/50 text-gray-300 border-gray-700/50'
  },
  inactive: {
    light: 'bg-gray-50 text-gray-700 border-gray-200',
    dark: 'bg-gray-800/50 text-gray-300 border-gray-700/50'
  },
  completed: {
    light: 'bg-gray-50 text-gray-700 border-gray-200',
    dark: 'bg-gray-800/50 text-gray-300 border-gray-700/50'
  },
  processing: {
    light: 'bg-gray-50 text-gray-700 border-gray-200',
    dark: 'bg-gray-800/50 text-gray-300 border-gray-700/50'
  },
  failed: {
    light: 'bg-gray-50 text-gray-700 border-gray-200',
    dark: 'bg-gray-800/50 text-gray-300 border-gray-700/50'
  },
  verified: {
    light: 'bg-gray-50 text-gray-700 border-gray-200',
    dark: 'bg-gray-800/50 text-gray-300 border-gray-700/50'
  },
  unverified: {
    light: 'bg-gray-50 text-gray-700 border-gray-200',
    dark: 'bg-gray-800/50 text-gray-300 border-gray-700/50'
  }
};

// Icon colors for different statuses
export const statusIconColors = {
  active: 'text-emerald-600',
  pending: 'text-amber-600',
  suspended: 'text-rose-600',
  inactive: 'text-slate-600',
  completed: 'text-emerald-600',
  processing: 'text-blue-600',
  failed: 'text-rose-600',
  verified: 'text-emerald-600',
  unverified: 'text-amber-600',
  cancelled: 'text-slate-600',
  rejected: 'text-rose-600',
  'in-progress': 'text-blue-600',
  'in-escrow': 'text-purple-600',
  revision: 'text-orange-600',
  submitted: 'text-blue-600',
  approved: 'text-emerald-600',
  negotiating: 'text-amber-600'
};

export const userTypeColors = {
  brand: {
    light: 'bg-gradient-to-r from-[#667eea]/10 to-[#764ba2]/10 text-[#667eea] border-[#667eea]/20',
    dark: 'bg-gradient-to-r from-[#667eea]/20 to-[#764ba2]/20 text-[#667eea] border-[#667eea]/30'
  },
  creator: {
    light: 'bg-purple-50 text-purple-700 border-purple-200',
    dark: 'bg-purple-900/30 text-purple-400 border-purple-700/50'
  },
  admin: {
    light: 'bg-slate-50 text-slate-700 border-slate-200',
    dark: 'bg-slate-800/50 text-slate-400 border-slate-700/50'
  }
};

export const dealStatusColors = {
  pending: {
    light: 'bg-gray-50 text-gray-700 border-gray-200',
    dark: 'bg-gray-800/50 text-gray-300 border-gray-700/50'
  },
  accepted: {
    light: 'bg-gray-50 text-gray-700 border-gray-200',
    dark: 'bg-gray-800/50 text-gray-300 border-gray-700/50'
  },
  'in-progress': {
    light: 'bg-gray-50 text-gray-700 border-gray-200',
    dark: 'bg-gray-800/50 text-gray-300 border-gray-700/50'
  },
  completed: {
    light: 'bg-gray-50 text-gray-700 border-gray-200',
    dark: 'bg-gray-800/50 text-gray-300 border-gray-700/50'
  },
  rejected: {
    light: 'bg-gray-50 text-gray-700 border-gray-200',
    dark: 'bg-gray-800/50 text-gray-300 border-gray-700/50'
  },
  cancelled: {
    light: 'bg-gray-50 text-gray-700 border-gray-200',
    dark: 'bg-gray-800/50 text-gray-300 border-gray-700/50'
  }
};

export const paymentStatusColors = {
  completed: {
    light: 'bg-gray-50 text-gray-700 border-gray-200',
    dark: 'bg-gray-800/50 text-gray-300 border-gray-700/50'
  },
  released: {
    light: 'bg-gray-50 text-gray-700 border-gray-200',
    dark: 'bg-gray-800/50 text-gray-300 border-gray-700/50'
  },
  pending: {
    light: 'bg-gray-50 text-gray-700 border-gray-200',
    dark: 'bg-gray-800/50 text-gray-300 border-gray-700/50'
  },
  processing: {
    light: 'bg-gray-50 text-gray-700 border-gray-200',
    dark: 'bg-gray-800/50 text-gray-300 border-gray-700/50'
  },
  failed: {
    light: 'bg-gray-50 text-gray-700 border-gray-200',
    dark: 'bg-gray-800/50 text-gray-300 border-gray-700/50'
  },
  'in-escrow': {
    light: 'bg-gray-50 text-gray-700 border-gray-200',
    dark: 'bg-gray-800/50 text-gray-300 border-gray-700/50'
  }
};

export const deliverableStatusColors = {
  approved: {
    light: 'bg-gray-50 text-gray-700 border-gray-200',
    dark: 'bg-gray-800/50 text-gray-300 border-gray-700/50'
  },
  submitted: {
    light: 'bg-gray-50 text-gray-700 border-gray-200',
    dark: 'bg-gray-800/50 text-gray-300 border-gray-700/50'
  },
  'in-progress': {
    light: 'bg-gray-50 text-gray-700 border-gray-200',
    dark: 'bg-gray-800/50 text-gray-300 border-gray-700/50'
  },
  revision: {
    light: 'bg-gray-50 text-gray-700 border-gray-200',
    dark: 'bg-gray-800/50 text-gray-300 border-gray-700/50'
  },
  pending: {
    light: 'bg-gray-50 text-gray-700 border-gray-200',
    dark: 'bg-gray-800/50 text-gray-300 border-gray-700/50'
  }
};

// Helper function to get color classes based on theme
export const getStatusColor = (status, type = 'status', isDark = false) => {
  const colorMap = {
    status: statusColors,
    userType: userTypeColors,
    deal: dealStatusColors,
    payment: paymentStatusColors,
    deliverable: deliverableStatusColors
  };
  
  const colors = colorMap[type] || statusColors;
  const colorKey = status?.toLowerCase() || 'pending';
  
  if (colors[colorKey]) {
    return isDark ? colors[colorKey].dark : colors[colorKey].light;
  }
  
  // Fallback to pending color
  return isDark ? statusColors.pending.dark : statusColors.pending.light;
};

// Helper function to get icon color for status
export const getStatusIconColor = (status) => {
  return statusIconColors[status?.toLowerCase()] || 'text-gray-600';
};

// For backward compatibility - simple light mode colors (now standardized)
export const getSimpleStatusColor = (status) => {
  return 'bg-gray-50 text-gray-700 border-gray-200';
};
