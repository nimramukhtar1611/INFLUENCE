// pages/Brand/Contracts.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Download,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
  MoreVertical,
  Search,
  Filter,
  Calendar,
  User,
  DollarSign,
  Shield,
  XCircle,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import dealService from '../../services/dealService'; // assuming this has getUserContracts
import { formatCurrency, formatDate, timeAgo } from '../../utils/helpers';
import Button from '../../components/UI/Button';
import Modal from '../../components/Common/Modal';
import toast from 'react-hot-toast';

const Contracts = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState([]);
  const [filteredContracts, setFilteredContracts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedContract, setSelectedContract] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetchContracts();
  }, []);

  useEffect(() => {
    if (contracts) {
      let filtered = [...contracts];
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(c =>
          c.contractNumber?.toLowerCase().includes(query) ||
          c.brandId?.brandName?.toLowerCase().includes(query) ||
          c.creatorId?.displayName?.toLowerCase().includes(query) ||
          c.campaignId?.title?.toLowerCase().includes(query)
        );
      }
      if (statusFilter !== 'all') {
        filtered = filtered.filter(c => c.status === statusFilter);
      }
      setFilteredContracts(filtered);
    }
  }, [contracts, searchQuery, statusFilter]);

  const fetchContracts = async () => {
    setLoading(true);
    try {
      // Assume dealService.getUserContracts() exists
      const res = await dealService.getUserContracts();
      if (res?.success) {
        setContracts(res.contracts || []);
      } else {
        toast.error(res?.error || 'Failed to load contracts');
      }
    } catch (error) {
      console.error('Fetch contracts error:', error);
      toast.error('Failed to load contracts');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (contract) => {
    setDownloading(true);
    try {
      // Assume contract has a pdfUrl or we call an endpoint
      if (contract.pdfUrl) {
        window.open(contract.pdfUrl, '_blank');
      } else {
        // fallback: request PDF generation
        const res = await dealService.downloadContract(contract._id);
        if (res?.success) {
          // handle blob download
        } else {
          toast.error('Failed to download contract');
        }
      }
    } catch (error) {
      toast.error('Download failed');
    } finally {
      setDownloading(false);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'signed':
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'expired':
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'signed':
      case 'active':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending':
      case 'draft':
        return <Clock className="w-4 h-4" />;
      case 'expired':
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contracts</h1>
          <p className="text-gray-600">View and manage all your agreements</p>
        </div>
        <Button variant="primary" icon={FileText}>
          Create New Contract
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <p className="text-2xl font-bold text-gray-900">{contracts.filter(c => c.status === 'active').length}</p>
          <p className="text-sm text-gray-600">Active Contracts</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <p className="text-2xl font-bold text-gray-900">{contracts.filter(c => c.status === 'pending').length}</p>
          <p className="text-sm text-gray-600">Pending Signatures</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <p className="text-2xl font-bold text-gray-900">{contracts.filter(c => c.status === 'completed').length}</p>
          <p className="text-sm text-gray-600">Completed</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(contracts.reduce((sum, c) => sum + (c.paymentTerms?.total || 0), 0))}
          </p>
          <p className="text-sm text-gray-600">Total Value</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by contract number, brand, or creator..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="draft">Draft</option>
            </select>
            
            <button className="px-4 py-2 border border-gray-300 rounded-lg flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filter
            </button>
          </div>
        </div>
      </div>

      {/* Contracts List */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {filteredContracts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contract</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Parties</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Signed</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expiry</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredContracts.map((contract) => {
                  const isBrand = contract.brandId?._id === user?._id;
                  const otherParty = isBrand ? contract.creatorId : contract.brandId;
                  return (
                    <tr key={contract._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {contract.contractNumber}
                        </div>
                        <div className="text-sm text-gray-500">
                          {contract.campaignId?.title || 'Campaign'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {isBrand ? otherParty?.displayName : otherParty?.brandName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {isBrand ? 'Creator' : 'Brand'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900">
                        {formatCurrency(contract.paymentTerms?.total || 0)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full inline-flex items-center gap-1 ${getStatusColor(contract.status)}`}>
                          {getStatusIcon(contract.status)}
                          {contract.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {contract.signedAt ? formatDate(contract.signedAt) : 'Not signed'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {contract.expiresAt ? formatDate(contract.expiresAt) : '—'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedContract(contract);
                              setShowPreviewModal(true);
                            }}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDownload(contract)}
                            disabled={downloading}
                            className="text-gray-400 hover:text-gray-600"
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button className="text-gray-400 hover:text-gray-600">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No contracts found</h3>
            <p className="text-gray-500">Contracts will appear here once deals are created.</p>
          </div>
        )}
      </div>

      {/* Contract Preview Modal */}
      <Modal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        title="Contract Details"
        size="lg"
      >
        {selectedContract && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">{selectedContract.contractNumber}</h3>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedContract.status)}`}>
                {selectedContract.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Brand</p>
                <p className="font-medium">{selectedContract.brandId?.brandName}</p>
                <p className="text-xs text-gray-500">{selectedContract.brandId?.email}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Creator</p>
                <p className="font-medium">{selectedContract.creatorId?.displayName}</p>
                <p className="text-xs text-gray-500">{selectedContract.creatorId?.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Campaign</p>
                <p className="font-medium">{selectedContract.campaignId?.title || '—'}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Value</p>
                <p className="text-xl font-bold text-indigo-600">
                  {formatCurrency(selectedContract.paymentTerms?.total || 0)}
                </p>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">Terms & Conditions</h4>
              <div className="bg-gray-50 p-4 rounded-lg max-h-60 overflow-y-auto">
                <p className="text-sm text-gray-700 whitespace-pre-line">
                  {selectedContract.content || 'No terms provided.'}
                </p>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">Deliverables</h4>
              <div className="space-y-2">
                {selectedContract.deliverables?.map((del, i) => (
                  <div key={i} className="bg-gray-50 p-3 rounded-lg">
                    <p className="font-medium capitalize">{del.type} on {del.platform}</p>
                    {del.description && <p className="text-sm text-gray-600">{del.description}</p>}
                    {del.requirements && <p className="text-xs text-gray-500 mt-1">Requirements: {del.requirements}</p>}
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <h4 className="font-medium text-gray-900 mb-3">Signature Status</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-green-600" />
                    <span className="text-sm">Brand</span>
                  </div>
                  {selectedContract.signedByBrand ? (
                    <span className="text-sm text-green-600 flex items-center">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Signed {selectedContract.signatures?.find(s => s.userType === 'brand')?.signedAt ? formatDate(selectedContract.signatures.find(s => s.userType === 'brand').signedAt) : ''}
                    </span>
                  ) : (
                    <span className="text-sm text-yellow-600 flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      Pending
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-purple-600" />
                    <span className="text-sm">Creator</span>
                  </div>
                  {selectedContract.signedByCreator ? (
                    <span className="text-sm text-green-600 flex items-center">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Signed {selectedContract.signatures?.find(s => s.userType === 'creator')?.signedAt ? formatDate(selectedContract.signatures.find(s => s.userType === 'creator').signedAt) : ''}
                    </span>
                  ) : (
                    <span className="text-sm text-yellow-600 flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      Pending
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button variant="secondary" onClick={() => setShowPreviewModal(false)}>
                Close
              </Button>
              <Button variant="primary" icon={Download} onClick={() => handleDownload(selectedContract)}>
                Download PDF
              </Button>
              {selectedContract.status === 'pending' && selectedContract.signedByBrand !== selectedContract.signedByCreator && (
                <Button variant="success" icon={CheckCircle}>
                  Sign Contract
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Contracts;