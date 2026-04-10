import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Eye, RefreshCw, ShieldCheck, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../components/UI/Button';
import Modal from '../../components/Common/Modal';
import Loader from '../../components/Common/Loader';
import adminService from '../../services/adminService';
import { useTheme } from '../../hooks/useTheme';
import { formatDate, timeAgo } from '../../utils/helpers';
import { getStatusColor, getStatusIconColor } from '../../utils/colorScheme';

const queueOptions = [
  { value: 'manual_review', label: 'Manual Review' },
  { value: 'high_risk', label: 'High Risk' },
  { value: 'all_flagged', label: 'All Flagged' },
];

const getRiskClass = (riskLevel) => {
  return getStatusColor(riskLevel || 'low', 'status');
};

const AdminFraudReview = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [queue, setQueue] = useState('manual_review');
  const [riskLevel, setRiskLevel] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [creators, setCreators] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [selectedCreator, setSelectedCreator] = useState(null);

  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewPayload, setReviewPayload] = useState({
    creatorId: '',
    displayName: '',
    action: 'clear_hold',
    notes: '',
  });

  const fetchQueue = useCallback(async (showToast = false) => {
    try {
      if (showToast) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await adminService.getFraudReviewQueue({
        page,
        limit: 20,
        queue,
        riskLevel: riskLevel || undefined,
      });

      if (response.success) {
        setCreators(response.creators || []);
        setPagination(response.pagination || { page: 1, limit: 20, total: 0, pages: 1 });
      }

      if (showToast) {
        toast.success('Fraud review queue refreshed');
      }
    } catch (error) {
      toast.error(error?.error || 'Failed to load fraud review queue');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, queue, riskLevel]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const filteredCreators = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return creators;

    return creators.filter((creator) => {
      const values = [
        creator.displayName,
        creator.handle,
        creator.fraudDetection?.holdReason,
        creator.fraudDetection?.riskLevel,
      ];

      return values
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [creators, searchQuery]);

  const openDetails = async (creatorId) => {
    setDetailsOpen(true);
    setDetailsLoading(true);
    setSelectedCreator(null);

    try {
      const response = await adminService.getFraudCreatorDetails(creatorId);
      if (response.success) {
        setSelectedCreator(response.creator);
      }
    } catch (error) {
      toast.error(error?.error || 'Failed to load creator fraud details');
      setDetailsOpen(false);
    } finally {
      setDetailsLoading(false);
    }
  };

  const openReviewAction = (creator, action) => {
    setReviewPayload({
      creatorId: creator._id,
      displayName: creator.displayName || creator.handle || 'Creator',
      action,
      notes: '',
    });
    setReviewOpen(true);
  };

  const submitReviewAction = async () => {
    try {
      setReviewSubmitting(true);

      const response = await adminService.updateFraudReviewStatus(
        reviewPayload.creatorId,
        reviewPayload.action,
        reviewPayload.notes
      );

      if (response.success) {
        toast.success(response.message || 'Fraud review status updated');
        setReviewOpen(false);

        if (selectedCreator?._id === reviewPayload.creatorId) {
          const detailsResponse = await adminService.getFraudCreatorDetails(reviewPayload.creatorId);
          if (detailsResponse.success) {
            setSelectedCreator(detailsResponse.creator);
          }
        }

        await fetchQueue();
      }
    } catch (error) {
      toast.error(error?.error || 'Failed to update fraud review status');
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader size="large" color="purple" />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${isDark ? 'bg-gray-900' : 'bg-slate-100'}`}>
      {/* Header */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-xl ${isDark ? 'bg-gray-900/90 backdrop-blur-sm border border-gray-700/50 shadow-sm' : 'bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-sm'}`}>
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Fraud Review Queue</h1>
          <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>Review creators flagged by fraud detection and manage manual holds.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            loading={refreshing}
            onClick={() => fetchQueue(true)}
          >
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className={`rounded-xl shadow-sm p-3 sm:p-4 ${isDark ? 'bg-gray-900/90 border border-gray-700/50' : 'bg-white border-gray-200/50'}`}>
          <p className={`text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Flagged Creators</p>
          <p className={`text-xl sm:text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{pagination.total || 0}</p>
        </div>
        <div className={`rounded-xl shadow-sm p-3 sm:p-4 ${isDark ? 'bg-gray-900/90 border border-gray-700/50' : 'bg-white border-gray-200/50'}`}>
          <p className={`text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Manual Holds</p>
          <p className="text-xl sm:text-2xl font-bold text-yellow-700">
            {creators.filter((c) => c.fraudDetection?.manualReviewRequired).length}
          </p>
        </div>
        <div className={`rounded-xl shadow-sm p-3 sm:p-4 ${isDark ? 'bg-gray-900/90 border border-gray-700/50' : 'bg-white border-gray-200/50'}`}>
          <p className={`text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>High Risk</p>
          <p className="text-xl sm:text-2xl font-bold text-red-700">
            {creators.filter((c) => c.fraudDetection?.riskLevel === 'high').length}
          </p>
        </div>
        <div className={`rounded-xl shadow-sm p-3 sm:p-4 ${isDark ? 'bg-gray-900/90 border border-gray-700/50' : 'bg-white border-gray-200/50'}`}>
          <p className={`text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Current Queue</p>
          <p className="text-sm sm:text-lg font-semibold capitalize" style={{color: '#667eea'}}>{queue.replace('_', ' ')}</p>
        </div>
      </div>

      <div className={`p-3 sm:p-4 rounded-xl shadow-sm ${isDark ? 'bg-gray-900/90 border border-gray-700/50' : 'bg-white border-gray-200/50'}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, handle, risk, hold reason..."
            className={`px-3 py-2 border rounded-lg text-sm ${
              isDark 
                ? 'bg-gray-800/50 border-gray-700/50 text-gray-100 placeholder:text-gray-500'
                : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400'
            }`}
          />

          <select
            value={queue}
            onChange={(e) => {
              setQueue(e.target.value);
              setPage(1);
            }}
            className={`px-3 py-2 border rounded-lg text-sm ${
              isDark 
                ? 'bg-gray-800/50 border-gray-700/50 text-gray-100'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            {queueOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>

          <select
            value={riskLevel}
            onChange={(e) => {
              setRiskLevel(e.target.value);
              setPage(1);
            }}
            className={`px-3 py-2 border rounded-lg text-sm ${
              isDark 
                ? 'bg-gray-800/50 border-gray-700/50 text-gray-100'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            <option value="">All Risk Levels</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>

          <div className={`text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} flex items-center`}>
            <span className="hidden sm:inline">Page {pagination.page || 1} of {pagination.pages || 1}</span>
            <span className="sm:hidden">{pagination.page || 1}/{pagination.pages || 1}</span>
          </div>
        </div>
      </div>

      <div className={`rounded-xl shadow-sm overflow-hidden ${isDark ? 'bg-gray-900/90 border border-gray-700/50' : 'bg-white border-gray-200/50'}`}>
        <div className="overflow-x-auto">
          <table className={`w-full divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
            <thead className={isDark ? 'bg-gray-800' : 'bg-gray-50'}>
              <tr>
                <th className={`px-1 sm:px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'} min-w-[80px] sm:min-w-[120px]`}>Creator</th>
                <th className={`hidden sm:table-cell px-1 sm:px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'} min-w-[60px]`}>Followers</th>
                <th className={`hidden sm:table-cell px-1 sm:px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'} min-w-[60px]`}>Engagement</th>
                <th className={`px-1 sm:px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'} min-w-[50px]`}>Risk</th>
                <th className={`hidden md:table-cell px-1 sm:px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'} min-w-[60px]`}>Manual Review</th>
                <th className={`hidden lg:table-cell px-1 sm:px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'} min-w-[60px]`}>Last Evaluated</th>
                <th className={`px-1 sm:px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'} min-w-[60px]`}>Action</th>
              </tr>
            </thead>
            <tbody className={`${isDark ? 'bg-gray-900' : 'bg-white'} divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
              {filteredCreators.length > 0 ? (
                filteredCreators.map((creator) => {
                  const risk = creator.fraudDetection || {};
                  const manualReviewRequired = Boolean(risk.manualReviewRequired);

                  return (
                    <tr 
                      key={creator._id} 
                      className={`${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-50'} cursor-pointer`}
                      onClick={() => openDetails(creator._id)}
                    >
                      <td className="px-1 sm:px-3 py-2">
                        <p className={`text-xs sm:text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'} truncate max-w-[80px] sm:max-w-[120px]`}>{creator.displayName || 'Unnamed creator'}</p>
                        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} truncate max-w-[80px] sm:max-w-[120px]`}>{creator.handle || 'No handle'}</p>
                        {risk.holdReason ? (
                          <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-1 truncate max-w-[80px] sm:max-w-[120px]`}>Hold: {risk.holdReason}</p>
                        ) : null}
                      </td>
                      <td className={`hidden sm:table-cell px-1 sm:px-3 py-2 text-xs sm:text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'} truncate`}>{Number(creator.totalFollowers || 0).toLocaleString()}</td>
                      <td className={`hidden sm:table-cell px-1 sm:px-3 py-2 text-xs sm:text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'} truncate`}>{Number(creator.averageEngagement || 0).toFixed(2)}%</td>
                      <td className="px-1 sm:px-3 py-2">
                        <div className="flex flex-col gap-1">
                          <span className={`px-1 py-1 text-xs rounded-full capitalize inline-flex items-center gap-1 ${getRiskClass(risk.riskLevel)}`}>
                            <AlertTriangle className={`w-2 h-2 sm:w-2 sm:h-2 ${getStatusIconColor(risk.riskLevel || 'low')}`} />
                            <span className="hidden sm:inline">{risk.riskLevel || 'low'}</span>
                            <span className="sm:hidden">{risk.riskLevel === 'high' ? 'H' : risk.riskLevel === 'medium' ? 'M' : 'L'}</span>
                          </span>
                          <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{Number(risk.riskScore || 0)}/100</span>
                        </div>
                      </td>
                      <td className={`hidden md:table-cell px-1 sm:px-3 py-2`}>
                        <span className={`px-1 py-1 text-xs rounded-full inline-flex items-center gap-1 ${getStatusColor(manualReviewRequired ? 'pending' : 'completed', 'status')}`}>
                          <AlertTriangle className={`w-2 h-2 sm:w-2 sm:h-2 ${getStatusIconColor(manualReviewRequired ? 'pending' : 'completed')}`} />
                          <span className="hidden sm:inline">{manualReviewRequired ? 'Required' : 'Not Required'}</span>
                          <span className="sm:hidden">{manualReviewRequired ? '✓' : '—'}</span>
                        </span>
                      </td>
                      <td className={`hidden lg:table-cell px-1 sm:px-3 py-2 text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {risk.lastEvaluatedAt ? (
                          <div>
                            <p className="text-xs truncate">{formatDate(risk.lastEvaluatedAt)}</p>
                            <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'} truncate`}>{timeAgo(risk.lastEvaluatedAt)}</p>
                          </div>
                        ) : (
                          <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Not evaluated</span>
                        )}
                      </td>
                      <td className="px-1 sm:px-3 py-2">
                        <div className="flex flex-col sm:flex-row gap-1">
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDetails(creator._id);
                            }}
                            className="text-xs"
                          >
                            <Eye className="w-2 h-2 sm:w-2 sm:h-2" />
                            <span className="hidden sm:inline ml-1">View</span>
                          </Button>
                          <Button
                            size="xs"
                            variant={manualReviewRequired ? "success" : "warning"}
                            onClick={(e) => {
                              e.stopPropagation();
                              openReviewAction(creator, manualReviewRequired ? 'clear_hold' : 'mark_review');
                            }}
                            className="text-xs"
                          >
                            <span className="hidden sm:inline">{manualReviewRequired ? 'Clear' : 'Mark'}</span>
                            <span className="sm:hidden">{manualReviewRequired ? '✓' : '!'}</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" className={`px-2 sm:px-4 py-8 sm:py-12 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No creators in this queue.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={detailsOpen}
        onClose={() => {
          setDetailsOpen(false);
          setSelectedCreator(null);
        }}
        title="Fraud Assessment Details"
        size="2xl"
        className="modal-scrollable"
      >
        {detailsLoading ? (
          <div className="py-10 text-center text-gray-500">Loading details...</div>
        ) : selectedCreator ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className={`rounded-lg p-3 ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Creator</p>
                <p className={`font-semibold text-sm ${isDark ? 'text-gray-100' : 'text-gray-900'} truncate`}>{selectedCreator.displayName || 'Unnamed creator'}</p>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{selectedCreator.handle || 'No handle'}</p>
              </div>
              <div className={`rounded-lg p-3 ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Risk Score</p>
                <p className={`font-semibold text-sm ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{Number(selectedCreator.fraudDetection?.riskScore || 0)}/100</p>
              </div>
              <div className={`rounded-lg p-3 ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Risk Level</p>
                <p className={`font-semibold text-sm capitalize ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{selectedCreator.fraudDetection?.riskLevel || 'low'}</p>
              </div>
            </div>

            <div className={`rounded-lg p-3 ${isDark ? 'bg-yellow-900/30 border border-yellow-700/30' : 'bg-yellow-50 border border-yellow-200'}`}>
              <div className="flex items-start gap-2">
                <AlertTriangle className={`w-3 h-3 sm:w-4 sm:h-4 text-yellow-700 mt-0.5`} />
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold ${isDark ? 'text-yellow-300' : 'text-yellow-700'}`}>Manual Review Status</p>
                  <p className={`text-sm ${isDark ? 'text-yellow-400' : 'text-yellow-800'}`}>
                    {selectedCreator.fraudDetection?.manualReviewRequired ? 'Manual review required.' : 'No manual hold currently applied.'}
                  </p>
                  {selectedCreator.fraudDetection?.holdReason ? (
                    <p className={`text-sm ${isDark ? 'text-yellow-400' : 'text-yellow-800'} mt-1 truncate`}>Reason: {selectedCreator.fraudDetection.holdReason}</p>
                  ) : null}
                </div>
              </div>
            </div>

            <div>
              <p className={`text-sm font-semibold mb-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Signals</p>
              <div className="space-y-2">
                {(selectedCreator.fraudDetection?.signals || []).length > 0 ? (
                  selectedCreator.fraudDetection.signals.map((signal, index) => (
                    <div key={`${signal.type}-${index}`} className={`border rounded-lg p-3 ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm font-medium capitalize ${isDark ? 'text-gray-100' : 'text-gray-900'} truncate`}>{(signal.type || 'unknown').replace(/_/g, ' ')}</span>
                        <span className={`px-1 sm:px-2 py-1 text-xs rounded-full capitalize inline-flex items-center gap-1 ${getRiskClass(signal.severity)}`}>
                          <AlertTriangle className={`w-2 h-2 sm:w-3 sm:h-3 ${getStatusIconColor(signal.severity || 'low')}`} />
                          <span className="hidden sm:inline">{signal.severity || 'low'}</span>
                          <span className="sm:hidden">{signal.severity === 'high' ? 'H' : signal.severity === 'medium' ? 'M' : 'L'}</span>
                        </span>
                      </div>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Platform: {signal.platform || 'n/a'} • Weight: {signal.weight || 0}</p>
                      <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'} mt-1`}>{signal.reason || 'No signal reason provided.'}</p>
                    </div>
                  ))
                ) : (
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No fraud signals recorded.</p>
                )}
              </div>
            </div>

            <div>
              <p className={`text-sm font-semibold mb-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Recent Social History</p>
              <div className="space-y-2">
                {(selectedCreator.fraudDetection?.history || []).slice(-5).reverse().map((entry, index) => (
                  <div key={`${entry.platform}-${entry.capturedAt}-${index}`} className={`border rounded-lg p-2 text-sm ${isDark ? 'border-gray-700 bg-gray-800 text-gray-300' : 'border-gray-200 bg-white text-gray-700'}`}>
                    <p className={`font-medium capitalize ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{entry.platform || 'unknown'} • {Number(entry.followers || 0).toLocaleString()} followers</p>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Engagement: {Number(entry.engagement || 0).toFixed(2)}% • Captured: {formatDate(entry.capturedAt)}</p>
                  </div>
                ))}
                {(selectedCreator.fraudDetection?.history || []).length === 0 ? (
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No historical snapshots available.</p>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-10 text-center text-gray-500">No details found for this creator.</div>
        )}
      </Modal>

      <Modal
        isOpen={reviewOpen}
        onClose={() => {
          setReviewOpen(false);
          setReviewPayload({ creatorId: '', displayName: '', action: 'clear_hold', notes: '' });
        }}
        title={reviewPayload.action === 'clear_hold' ? 'Clear Fraud Hold' : 'Mark For Manual Review'}
      >
        <div className="space-y-4">
          <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            {reviewPayload.action === 'clear_hold'
              ? `Clear manual fraud hold for ${reviewPayload.displayName}?`
              : `Mark ${reviewPayload.displayName} for manual fraud review?`}
          </p>

          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Notes (optional)</label>
            <textarea
              rows="4"
              value={reviewPayload.notes}
              onChange={(e) => setReviewPayload((prev) => ({ ...prev, notes: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-lg text-sm ${
                isDark 
                  ? 'bg-gray-800/50 border-gray-700/50 text-gray-100 placeholder:text-gray-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400'
              }`}
              placeholder="Add reviewer notes..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setReviewOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={reviewPayload.action === 'clear_hold' ? 'success' : 'warning'}
              loading={reviewSubmitting}
              onClick={submitReviewAction}
            >
              {reviewPayload.action === 'clear_hold' ? 'Clear Hold' : 'Mark Review'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminFraudReview;