import React, { useMemo, useState } from 'react';
import { Eye, RefreshCw, CheckCircle, AlertCircle, Download, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../components/UI/Button';
import Modal from '../../components/Common/Modal';
import Loader from '../../components/Common/Loader';
import { useAdminData } from '../../hooks/useAdminData';
import { useTheme } from '../../hooks/useTheme';
import { formatDate, timeAgo } from '../../utils/helpers';
import { getStatusColor, getStatusIconColor } from '../../utils/colorScheme';

const RESOLUTION_TYPES = [
  { value: 'refund_brand', label: 'Refund Brand' },
  { value: 'release_payment', label: 'Release Payment' },
  { value: 'split_funds', label: 'Split Funds' },
  { value: 'cancel_contract', label: 'Cancel Contract' },
  { value: 'no_action', label: 'No Action' },
];

const AdminDisputes = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { disputes, loading, refreshData, resolveDispute } = useAdminData();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolution, setResolution] = useState({
    type: 'no_action',
    amount: '',
    details: '',
  });

  const filteredDisputes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return disputes.filter((dispute) => {
      if (statusFilter !== 'all' && dispute.status !== statusFilter) {
        return false;
      }

      if (!query) return true;

      const raisedBy = dispute?.raised_by?.user_id?.fullName || dispute?.raised_by?.user_id?.email || '';
      const against = dispute?.raised_against?.user_id?.fullName || dispute?.raised_against?.user_id?.email || '';

      return [
        dispute.dispute_id,
        dispute.title,
        dispute.description,
        dispute.dispute_type,
        raisedBy,
        against,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [disputes, searchQuery, statusFilter]);

  const openDetails = (dispute) => {
    setSelectedDispute(dispute);
    setShowDetailsModal(true);
  };

  const openResolve = (dispute) => {
    setSelectedDispute(dispute);
    setResolution({ type: 'no_action', amount: '', details: '' });
    setShowResolveModal(true);
  };

  const handleResolve = async () => {
    if (!selectedDispute?._id) return;

    const payload = {
      type: resolution.type,
      details: resolution.details,
    };

    if (resolution.amount !== '') {
      payload.amount = Number(resolution.amount);
    }

    const success = await resolveDispute(selectedDispute._id, payload);
    if (success) {
      setShowResolveModal(false);
      setSelectedDispute(null);
      setResolution({ type: 'no_action', amount: '', details: '' });
      await refreshData();
    }
  };

  const handleExport = () => {
    // Generate CSV for disputes data
    const csvContent = [
      ['Dispute ID', 'Title', 'Type', 'Status', 'Raised By', 'Against', 'Amount', 'Created'].join(','),
      ...filteredDisputes.map(dispute => [
        dispute.dispute_id || dispute._id?.slice(-8) || '',
        `"${dispute.title}"`,
        dispute.dispute_type,
        dispute.status,
        `"${dispute.raised_by?.user_id?.fullName || dispute.raised_by?.user_id?.email || ''}"`,
        `"${dispute.raised_against?.user_id?.fullName || dispute.raised_against?.user_id?.email || ''}"`,
        dispute.amount || 0,
        dispute.createdAt ? new Date(dispute.createdAt).toISOString().split('T')[0] : ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `disputes-export-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Disputes data exported successfully');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader size="large" color="purple" />
      </div>
    );
  }

  const openCount = filteredDisputes.filter((d) => d.status === 'open').length;
  const investigatingCount = filteredDisputes.filter((d) => d.status === 'investigating').length;
  const resolvedCount = filteredDisputes.filter((d) => d.status === 'resolved').length;

  return (
    <div className={`space-y-6 ${isDark ? 'bg-gray-900' : 'bg-slate-100'}`}>
      {/* Header */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-xl ${isDark ? 'bg-gray-900/90 backdrop-blur-sm border border-gray-700/50 shadow-sm' : 'bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-sm'}`}>
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Dispute Management</h1>
          <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>Review and resolve disputes raised on the platform</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" icon={RefreshCw} onClick={refreshData}>
            Refresh
          </Button>
          <Button variant="outline" icon={Download} onClick={handleExport}>
            Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <div className={`rounded-xl shadow-sm p-3 sm:p-4 ${isDark ? 'bg-gray-900/90 border border-gray-700/50' : 'bg-white border-gray-200/50'}`}>
          <p className={`text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Open</p>
          <p className="text-xl sm:text-2xl font-bold text-red-600">{openCount}</p>
        </div>
        <div className={`rounded-xl shadow-sm p-3 sm:p-4 ${isDark ? 'bg-gray-900/90 border border-gray-700/50' : 'bg-white border-gray-200/50'}`}>
          <p className={`text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Investigating</p>
          <p className="text-xl sm:text-2xl font-bold text-yellow-600">{investigatingCount}</p>
        </div>
        <div className={`rounded-xl shadow-sm p-3 sm:p-4 ${isDark ? 'bg-gray-900/90 border border-gray-700/50' : 'bg-white border-gray-200/50'}`}>
          <p className={`text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Resolved</p>
          <p className="text-xl sm:text-2xl font-bold text-green-600">{resolvedCount}</p>
        </div>
      </div>

      <div className={`p-3 sm:p-4 rounded-xl shadow-sm ${isDark ? 'bg-gray-900/90 border border-gray-700/50' : 'bg-white border-gray-200/50'}`}>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`flex-1 px-3 py-2 border rounded-lg text-sm ${
              isDark 
                ? 'bg-gray-800/50 border-gray-700/50 text-gray-100 placeholder:text-gray-500'
                : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400'
            }`}
            placeholder="Search disputes by ID, title, party, or type..."
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`px-3 py-2 border rounded-lg text-sm ${
              isDark 
                ? 'bg-gray-800/50 border-gray-700/50 text-gray-100'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      <div className={`rounded-xl shadow-sm overflow-hidden ${isDark ? 'bg-gray-900/90 border border-gray-700/50' : 'bg-white border-gray-200/50'}`}>
        <div className="overflow-x-auto">
          <table className={`min-w-full divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
            <thead className={isDark ? 'bg-gray-800' : 'bg-gray-50'}>
              <tr>
                <th className={`px-1 sm:px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'} min-w-[80px] sm:min-w-[120px]`}>Dispute</th>
                <th className={`hidden sm:table-cell px-1 sm:px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'} min-w-[60px]`}>Type</th>
                <th className={`hidden md:table-cell px-1 sm:px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'} min-w-[60px]`}>Raised By</th>
                <th className={`px-1 sm:px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'} min-w-[50px]`}>Status</th>
              </tr>
            </thead>
            <tbody className={`${isDark ? 'bg-gray-900' : 'bg-white'} divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
              {filteredDisputes.length > 0 ? (
                filteredDisputes.map((dispute) => {
                  const raisedBy = dispute?.raised_by?.user_id?.fullName || dispute?.raised_by?.user_id?.email || 'Unknown';
                  const status = dispute.status || 'open';
                  const statusClass = getStatusColor(status, 'status');
                  
                  const getStatusIcon = (status) => {
                    switch(status?.toLowerCase()) {
                      case 'resolved': return CheckCircle;
                      case 'open': return AlertCircle;
                      default: return AlertCircle;
                    }
                  };
                  
                  const StatusIcon = getStatusIcon(status);
                  const iconColor = getStatusIconColor(status);

                  return (
                    <tr 
                      key={dispute._id} 
                      className={`${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-50'} cursor-pointer`}
                      onClick={() => openDetails(dispute)}
                    >
                      <td className="px-1 sm:px-3 py-2">
                        <p className={`text-xs sm:text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'} truncate max-w-[80px] sm:max-w-[120px]`}>{dispute.title || dispute.dispute_id || 'Untitled dispute'}</p>
                        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} truncate max-w-[80px] sm:max-w-[120px]`}>ID: {dispute.dispute_id || dispute._id}</p>
                      </td>
                      <td className={`hidden sm:table-cell px-1 sm:px-3 py-2 text-xs sm:text-sm capitalize ${isDark ? 'text-gray-300' : 'text-gray-700'} truncate`}>{(dispute.dispute_type || 'unknown').replace(/_/g, ' ')}</td>
                      <td className={`hidden md:table-cell px-1 sm:px-3 py-2 text-xs sm:text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'} truncate`}>{raisedBy}</td>
                      <td className="px-1 sm:px-3 py-2">
                        <span className={`px-1 py-1 text-xs rounded-full inline-flex items-center gap-1 ${statusClass}`}>
                          <StatusIcon className={`w-2 h-2 sm:w-2 sm:h-2 ${iconColor}`} />
                          <span className="hidden sm:inline">{status}</span>
                          <span className="sm:hidden">{status === 'resolved' ? '✓' : status === 'open' ? '!' : '?'}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="4" className={`px-2 sm:px-4 py-8 sm:py-12 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No disputes found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedDispute(null);
        }}
        title="Dispute Details"
        size="lg"
        className="modal-scrollable"
      >
        {selectedDispute && (
          <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-2">
            <div>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Title</p>
              <p className={`font-semibold text-sm ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{selectedDispute.title || 'Untitled'}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className={`rounded-lg p-3 ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Type</p>
                <p className={`font-medium text-sm capitalize ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{(selectedDispute.dispute_type || 'unknown').replace(/_/g, ' ')}</p>
              </div>
              <div className={`rounded-lg p-3 ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Priority</p>
                <p className={`font-medium text-sm capitalize ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{selectedDispute.priority || 'normal'}</p>
              </div>
            </div>

            <div className={`rounded-lg p-3 ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Description</p>
              <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'} whitespace-pre-wrap`}>{selectedDispute.description || 'No description provided.'}</p>
            </div>

            {selectedDispute.resolution && (
              <div className={`rounded-lg p-3 ${isDark ? 'bg-green-900/30 border border-green-700/30' : 'bg-green-50 border border-green-200'}`}>
                <p className={`text-sm font-semibold mb-1 ${isDark ? 'text-green-300' : 'text-green-700'}`}>Resolution</p>
                <p className={`text-sm ${isDark ? 'text-green-400' : 'text-green-700'} capitalize`}>Type: {(selectedDispute.resolution.type || 'n/a').replace(/_/g, ' ')}</p>
                {selectedDispute.resolution.amount > 0 && (
                  <p className={`text-sm ${isDark ? 'text-green-400' : 'text-green-700'}`}>Amount: ${selectedDispute.resolution.amount}</p>
                )}
                {selectedDispute.resolution.details && (
                  <p className={`text-sm ${isDark ? 'text-green-400' : 'text-green-700'}`}>Details: {selectedDispute.resolution.details}</p>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showResolveModal}
        onClose={() => {
          setShowResolveModal(false);
          setSelectedDispute(null);
        }}
        title="Resolve Dispute"
      >
        {selectedDispute && (
          <div className="space-y-4">
            <div className={`rounded-lg p-3 flex gap-2 ${isDark ? 'bg-yellow-900/30 border border-yellow-700/30' : 'bg-yellow-50 border border-yellow-200'}`}>
              <AlertCircle className={`w-3 h-3 sm:w-4 sm:h-4 text-yellow-700 mt-0.5`} />
              <p className={`text-sm ${isDark ? 'text-yellow-400' : 'text-yellow-800'}`}>
                This action resolves the dispute and updates related payment/deal state where applicable.
              </p>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Resolution Type</label>
              <select
                value={resolution.type}
                onChange={(e) => setResolution((prev) => ({ ...prev, type: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg text-sm ${
                  isDark 
                    ? 'bg-gray-800/50 border-gray-700/50 text-gray-100'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                {RESOLUTION_TYPES.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Amount (Optional)</label>
              <input
                type="number"
                value={resolution.amount}
                onChange={(e) => setResolution((prev) => ({ ...prev, amount: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg text-sm ${
                  isDark 
                    ? 'bg-gray-800/50 border-gray-700/50 text-gray-100'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                placeholder="0.00"
                step="0.01"
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Details</label>
              <textarea
                rows="3"
                value={resolution.details}
                onChange={(e) => setResolution((prev) => ({ ...prev, details: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg text-sm ${
                  isDark 
                    ? 'bg-gray-800/50 border-gray-700/50 text-gray-100 placeholder:text-gray-500'
                    : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400'
                }`}
                placeholder="Add notes for this resolution..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setShowResolveModal(false)}>
                Cancel
              </Button>
              <Button variant="success" onClick={handleResolve}>
                Resolve
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminDisputes;
