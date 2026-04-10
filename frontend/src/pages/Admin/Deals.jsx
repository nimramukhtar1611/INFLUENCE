import React, { useState } from 'react';
import { Handshake, RefreshCw, DollarSign, Clock, CheckCircle, AlertTriangle, Download, XCircle, Eye } from 'lucide-react';
import { useAdminData } from '../../hooks/useAdminData';
import { useTheme } from '../../hooks/useTheme';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { getStatusColor, getStatusIconColor } from '../../utils/colorScheme';
import Button from '../../components/UI/Button';
import StatsCard from '../../components/Common/StatsCard';
import Modal from '../../components/Common/Modal';

const AdminDeals = () => {
  const { deals, refreshing, refreshData, stats } = useAdminData();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [filteredDeals, setFilteredDeals] = useState(deals || []);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const handleExport = () => {
    // Generate CSV for deals data
    const csvContent = [
      ['Deal ID', 'Campaign', 'Brand', 'Creator', 'Status', 'Budget', 'Created'].join(','),
      ...filteredDeals.map(deal => [
        deal._id?.slice(-8) || '',
        `"${deal.campaignId?.title || ''}"`,
        `"${deal.brandId?.brandName || ''}"`,
        `"${deal.creatorId?.displayName || deal.creatorId?.fullName || ''}"`,
        deal.status,
        deal.budget || 0,
        deal.createdAt ? new Date(deal.createdAt).toISOString().split('T')[0] : ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deals-export-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const completedDeals = Number(stats.completedDeals || deals.filter((deal) => deal.status === 'completed').length || 0);
  const pendingDeals = Number(
    stats.pendingDeals ||
    deals.filter((deal) => ['pending', 'in_progress', 'in-progress'].includes(String(deal.status || '').toLowerCase())).length ||
    0
  );
  const totalValue = Number(stats.totalDealValue || deals.reduce((sum, deal) => sum + Number(deal.budget || 0), 0) || 0);

  // ==================== HANDLE VIEW DETAILS ====================
  const handleViewDetails = (deal) => {
    setSelectedDeal(deal);
    setShowDetailsModal(true);
  };

  return (
    <div className={`space-y-6 ${isDark ? 'bg-gray-900' : 'bg-slate-100'}`}>
      {/* Header */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-xl ${isDark ? 'bg-gray-900/90 backdrop-blur-sm border border-gray-700/50 shadow-sm' : 'bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-sm'}`}>
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Deal Management</h1>
          <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>Review active and completed deals across the platform</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            onClick={refreshData}
            loading={refreshing}
          >
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={Download}
            onClick={handleExport}
          >
            Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatsCard
          title="Total Deals"
          value={String(stats.totalDeals || deals.length || 0)}
          icon={Handshake}
          color="bg-indigo-500"
        />
        <StatsCard
          title="Completed"
          value={String(completedDeals)}
          icon={CheckCircle}
          color="bg-green-500"
        />
        <StatsCard
          title="Pending"
          value={String(pendingDeals)}
          icon={Clock}
          color="bg-yellow-500"
        />
        <StatsCard
          title="Deal Value"
          value={formatCurrency(totalValue)}
          icon={DollarSign}
          color="bg-blue-500"
        />
      </div>

      <div className={`rounded-xl shadow-sm overflow-hidden ${isDark ? 'bg-gray-900/90 border border-gray-700/50' : 'bg-white border-gray-200/50'}`}>
        <div className="overflow-x-auto">
          <table className={`min-w-full divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
            <thead className={isDark ? 'bg-gray-800' : 'bg-gray-50'}>
              <tr>
                <th className={`px-1 sm:px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'} min-w-[80px] sm:min-w-[120px]`}>Campaign</th>
                <th className={`hidden sm:table-cell px-1 sm:px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'} min-w-[60px] sm:min-w-[80px]`}>Brand</th>
                <th className={`hidden sm:table-cell px-1 sm:px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'} min-w-[60px] sm:min-w-[80px]`}>Creator</th>
                <th className={`hidden md:table-cell px-1 sm:px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'} min-w-[60px]`}>Budget</th>
                <th className={`px-1 sm:px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'} min-w-[50px]`}>Status</th>
                <th className={`hidden lg:table-cell px-1 sm:px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'} min-w-[60px]`}>Created</th>
              </tr>
            </thead>
            <tbody className={`${isDark ? 'bg-gray-900' : 'bg-white'} divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
              {deals.length === 0 ? (
                <tr>
                  <td colSpan="6" className={`px-2 sm:px-4 py-8 sm:py-12 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    No deals available yet.
                  </td>
                </tr>
              ) : (
                deals.map((deal) => {
                  const status = String(deal.status || 'unknown').toLowerCase();
                  const statusClass = getStatusColor(status, 'deal');
                  
                  const getStatusIcon = (status) => {
                    switch(status) {
                      case 'completed': return CheckCircle;
                      case 'cancelled':
                      case 'canceled': return XCircle;
                      case 'in-progress': return Clock;
                      default: return AlertTriangle;
                    }
                  };
                  
                  const StatusIcon = getStatusIcon(status);
                  const iconColor = getStatusIconColor(status);

                  return (
                    <tr 
                      key={deal._id || `${deal.campaignId?._id || 'campaign'}-${deal.creatorId?._id || 'creator'}`} 
                      className={`${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-50'} cursor-pointer`}
                      onClick={() => handleViewDetails(deal)}
                    >
                      <td className="px-1 sm:px-3 py-2">
                        <div className={`text-xs sm:text-sm ${isDark ? 'text-gray-100' : 'text-gray-900'} truncate max-w-[80px] sm:max-w-[120px]`}>
                          {deal.campaignId?.title || 'Untitled Campaign'}
                        </div>
                        <div className={`hidden sm:block text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                          {deal.brandId?.brandName || deal.brandId?.fullName || 'Unknown brand'}
                        </div>
                      </td>
                      <td className={`hidden sm:table-cell px-1 sm:px-3 py-2 text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} truncate max-w-[60px] sm:max-w-[80px]`}>
                        {deal.brandId?.brandName || deal.brandId?.fullName || 'Unknown brand'}
                      </td>
                      <td className={`hidden sm:table-cell px-1 sm:px-3 py-2 text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} truncate max-w-[60px] sm:max-w-[80px]`}>
                        {deal.creatorId?.fullName || deal.creatorId?.displayName || 'Unknown creator'}
                      </td>
                      <td className={`hidden md:table-cell px-1 sm:px-3 py-2 text-xs sm:text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                        {formatCurrency(deal.budget || 0)}
                      </td>
                      <td className="px-1 sm:px-3 py-2 text-xs">
                        <span className={`px-1 py-1 text-xs rounded-full inline-flex items-center gap-1 ${statusClass}`}>
                          <StatusIcon className={`w-2 h-2 sm:w-2 sm:h-2 ${iconColor}`} />
                          <span className="hidden sm:inline">{status}</span>
                          <span className="sm:hidden">{status === 'completed' ? '✓' : status === 'cancelled' || status === 'canceled' ? '✗' : status === 'in-progress' || status === 'in_progress' ? '⏳' : '?'}</span>
                        </span>
                      </td>
                      <td className={`hidden lg:table-cell px-1 sm:px-3 py-2 text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {formatDate(deal.createdAt)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Deal Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title="Deal Details"
        size="lg"
      >
        {selectedDeal && (
          <div className="space-y-6">
            <div>
              <h3 className={`text-xl font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{selectedDeal.campaignId?.title || 'Untitled Campaign'}</h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                Deal ID: {selectedDeal._id?.slice(-8)} • Status: {selectedDeal.status}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-1`}>Budget</p>
                <p className={`text-lg sm:text-xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{formatCurrency(selectedDeal.budget || 0)}</p>
              </div>
              <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-1`}>Status</p>
                <span className={`px-2 py-1 text-xs rounded-full inline-flex items-center gap-1 ${getStatusColor(String(selectedDeal.status || 'unknown').toLowerCase(), 'deal')}`}>
                  {(() => {
                    const status = String(selectedDeal.status || 'unknown').toLowerCase();
                    const StatusIcon = status === 'completed' ? CheckCircle : status === 'cancelled' || status === 'canceled' ? XCircle : status === 'in-progress' || status === 'in_progress' ? Clock : AlertTriangle;
                    const iconColor = getStatusIconColor(status);
                    return <StatusIcon className={`w-3 h-3 ${iconColor}`} />;
                  })()}
                  {selectedDeal.status}
                </span>
              </div>
              <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-1`}>Brand</p>
                <p className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{selectedDeal.brandId?.brandName || selectedDeal.brandId?.fullName || 'Unknown brand'}</p>
              </div>
              <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-1`}>Creator</p>
                <p className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{selectedDeal.creatorId?.fullName || selectedDeal.creatorId?.displayName || 'Unknown creator'}</p>
              </div>
            </div>

            <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-2`}>Created Date</p>
              <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{formatDate(selectedDeal.createdAt)}</p>
            </div>

            {selectedDeal.updatedAt && (
              <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-2`}>Last Updated</p>
                <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{formatDate(selectedDeal.updatedAt)}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminDeals;
