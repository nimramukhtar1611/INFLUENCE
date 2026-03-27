import React, { useMemo, useState } from 'react';
import { Eye, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../components/UI/Button';
import Modal from '../../components/Common/Modal';
import { useAdminData } from '../../hooks/useAdminData';
import { formatDate, timeAgo } from '../../utils/helpers';

const RESOLUTION_TYPES = [
  { value: 'refund_brand', label: 'Refund Brand' },
  { value: 'release_payment', label: 'Release Payment' },
  { value: 'split_funds', label: 'Split Funds' },
  { value: 'cancel_contract', label: 'Cancel Contract' },
  { value: 'no_action', label: 'No Action' },
];

const AdminDisputes = () => {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const openCount = filteredDisputes.filter((d) => d.status === 'open').length;
  const investigatingCount = filteredDisputes.filter((d) => d.status === 'investigating').length;
  const resolvedCount = filteredDisputes.filter((d) => d.status === 'resolved').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dispute Management</h1>
          <p className="text-gray-600">Review and resolve disputes raised on the platform</p>
        </div>
        <Button variant="outline" icon={RefreshCw} onClick={refreshData}>
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-500">Open</p>
          <p className="text-2xl font-bold text-red-600">{openCount}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-500">Investigating</p>
          <p className="text-2xl font-bold text-yellow-600">{investigatingCount}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-500">Resolved</p>
          <p className="text-2xl font-bold text-green-600">{resolvedCount}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
            placeholder="Search disputes by ID, title, party, or type..."
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dispute</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Raised By</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDisputes.length > 0 ? (
                filteredDisputes.map((dispute) => {
                  const raisedBy = dispute?.raised_by?.user_id?.fullName || dispute?.raised_by?.user_id?.email || 'Unknown';

                  return (
                    <tr key={dispute._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-gray-900">{dispute.title || dispute.dispute_id || 'Untitled dispute'}</p>
                        <p className="text-xs text-gray-500">ID: {dispute.dispute_id || dispute._id}</p>
                      </td>
                      <td className="px-6 py-4 text-sm capitalize text-gray-700">{(dispute.dispute_type || 'unknown').replace(/_/g, ' ')}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{raisedBy}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          dispute.status === 'resolved'
                            ? 'bg-green-100 text-green-700'
                            : dispute.status === 'open'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {dispute.status || 'open'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <p>{formatDate(dispute.createdAt)}</p>
                        <p className="text-xs text-gray-400">{timeAgo(dispute.createdAt)}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openDetails(dispute)}
                            className="text-indigo-600 hover:text-indigo-800"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {dispute.status !== 'resolved' && dispute.status !== 'closed' && (
                            <button
                              onClick={() => openResolve(dispute)}
                              className="text-green-600 hover:text-green-800"
                              title="Resolve Dispute"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">No disputes found</td>
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
      >
        {selectedDispute && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Title</p>
              <p className="font-semibold text-gray-900">{selectedDispute.title || 'Untitled'}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Type</p>
                <p className="font-medium capitalize">{(selectedDispute.dispute_type || 'unknown').replace(/_/g, ' ')}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Priority</p>
                <p className="font-medium capitalize">{selectedDispute.priority || 'normal'}</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Description</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedDispute.description || 'No description provided.'}</p>
            </div>

            {selectedDispute.resolution && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm font-semibold text-green-700 mb-1">Resolution</p>
                <p className="text-sm text-green-700 capitalize">Type: {(selectedDispute.resolution.type || 'n/a').replace(/_/g, ' ')}</p>
                {selectedDispute.resolution.amount > 0 && (
                  <p className="text-sm text-green-700">Amount: ${selectedDispute.resolution.amount}</p>
                )}
                {selectedDispute.resolution.details && (
                  <p className="text-sm text-green-700">Details: {selectedDispute.resolution.details}</p>
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
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-700 mt-0.5" />
              <p className="text-sm text-yellow-800">
                This action resolves the dispute and updates related payment/deal state where applicable.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Resolution Type</label>
              <select
                value={resolution.type}
                onChange={(e) => setResolution((prev) => ({ ...prev, type: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                {RESOLUTION_TYPES.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Amount (Optional)</label>
              <input
                type="number"
                value={resolution.amount}
                onChange={(e) => setResolution((prev) => ({ ...prev, amount: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="0.00"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Details</label>
              <textarea
                rows="3"
                value={resolution.details}
                onChange={(e) => setResolution((prev) => ({ ...prev, details: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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
