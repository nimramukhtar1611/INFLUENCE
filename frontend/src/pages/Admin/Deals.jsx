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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campaign</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Creator</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Budget</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {deals.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
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
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleViewDetails(deal)}
                    >
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {deal.campaignId?.title || 'Untitled Campaign'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {deal.brandId?.brandName || deal.brandId?.fullName || 'Unknown brand'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {deal.creatorId?.fullName || deal.creatorId?.displayName || 'Unknown creator'}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {formatCurrency(deal.budget || 0)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 text-xs rounded-full inline-flex items-center gap-1 ${statusClass}`}>
                          <StatusIcon className={`w-3 h-3 ${iconColor}`} />
                          {status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
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
              <h3 className="text-xl font-semibold text-gray-900">{selectedDeal.campaignId?.title || 'Untitled Campaign'}</h3>
              <p className="text-sm text-gray-500 mt-1">
                Deal ID: {selectedDeal._id?.slice(-8)} • Status: {selectedDeal.status}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Budget</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(selectedDeal.budget || 0)}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Status</p>
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
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Brand</p>
                <p className="font-medium">{selectedDeal.brandId?.brandName || selectedDeal.brandId?.fullName || 'Unknown brand'}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Creator</p>
                <p className="font-medium">{selectedDeal.creatorId?.fullName || selectedDeal.creatorId?.displayName || 'Unknown creator'}</p>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500 mb-2">Created Date</p>
              <p className="text-gray-700">{formatDate(selectedDeal.createdAt)}</p>
            </div>

            {selectedDeal.updatedAt && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-2">Last Updated</p>
                <p className="text-gray-700">{formatDate(selectedDeal.updatedAt)}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminDeals;
