import React from 'react';
import { Link } from 'react-router-dom';
import { Handshake, RefreshCw, DollarSign, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { useAdminData } from '../../hooks/useAdminData';
import { formatCurrency, formatDate } from '../../utils/helpers';
import Button from '../../components/UI/Button';
import StatsCard from '../../components/Common/StatsCard';

const AdminDeals = () => {
  const { deals, refreshing, refreshData, stats } = useAdminData();

  const completedDeals = deals.filter((deal) => deal.status === 'completed').length;
  const pendingDeals = deals.filter((deal) => ['pending', 'in_progress', 'in-progress'].includes(String(deal.status || '').toLowerCase())).length;
  const totalValue = deals.reduce((sum, deal) => sum + Number(deal.budget || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deal Management</h1>
          <p className="text-gray-600">Review active and completed deals across the platform</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          icon={RefreshCw}
          onClick={refreshData}
          loading={refreshing}
        >
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatsCard
          title="Total Deals"
          value={String(stats.totalCampaigns || deals.length || 0)}
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
                  const statusClass = status === 'completed'
                    ? 'bg-green-100 text-green-800'
                    : status === 'cancelled' || status === 'canceled'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-yellow-100 text-yellow-800';

                  return (
                    <tr key={deal._id || `${deal.campaignId?._id || 'campaign'}-${deal.creatorId?._id || 'creator'}`} className="hover:bg-gray-50">
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
                        <span className={`px-2 py-1 text-xs rounded-full ${statusClass}`}>
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

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
        <p className="text-sm text-blue-800">
          This view is currently powered by the latest dashboard dataset. Open
          <Link to="/admin/dashboard" className="font-medium underline ml-1">Dashboard</Link>
          and click refresh to pull the newest deal activity.
        </p>
      </div>
    </div>
  );
};

export default AdminDeals;
