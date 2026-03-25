// pages/Brand/Disputes.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  Calendar,
  Filter,
  Search,
  Plus,
  ChevronRight,
  User,
  Flag,
  ThumbsUp,
  X
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import disputeService from '../../services/disputeService'; // assume exists
import Button from '../../components/UI/Button';
import Modal from '../../components/Common/Modal';
import Input from '../../components/UI/Input';
import { formatDate, timeAgo } from '../../utils/helpers';
import toast from 'react-hot-toast';

const Disputes = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [disputes, setDisputes] = useState([]);
  const [filteredDisputes, setFilteredDisputes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showNewDisputeModal, setShowNewDisputeModal] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [newDisputeData, setNewDisputeData] = useState({
    dealId: '',
    type: 'deliverables',
    title: '',
    description: '',
    evidence: []
  });

  useEffect(() => {
    fetchDisputes();
  }, []);

  useEffect(() => {
    if (disputes) {
      let filtered = [...disputes];
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(d =>
          d.title?.toLowerCase().includes(query) ||
          d.campaignId?.title?.toLowerCase().includes(query) ||
          d.raisedBy?.userId?.fullName?.toLowerCase().includes(query)
        );
      }
      if (statusFilter !== 'all') {
        filtered = filtered.filter(d => d.status === statusFilter);
      }
      if (priorityFilter !== 'all') {
        filtered = filtered.filter(d => d.priority === priorityFilter);
      }
      setFilteredDisputes(filtered);
    }
  }, [disputes, searchQuery, statusFilter, priorityFilter]);

  const fetchDisputes = async () => {
    setLoading(true);
    try {
      const res = await disputeService.getUserDisputes(); // assume endpoint
      if (res?.success) {
        setDisputes(res.disputes || []);
      } else {
        toast.error(res?.error || 'Failed to load disputes');
      }
    } catch (error) {
      console.error('Fetch disputes error:', error);
      toast.error('Failed to load disputes');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMessage = async () => {
    if (!messageInput.trim() || !selectedDispute) return;
    setSendingMessage(true);
    try {
      const res = await disputeService.addMessage(selectedDispute._id, messageInput);
      if (res?.success) {
        setMessageInput('');
        // update selected dispute with new message
        const updated = { ...selectedDispute, messages: [...(selectedDispute.messages || []), res.message] };
        setSelectedDispute(updated);
        // also update list
        setDisputes(prev => prev.map(d => d._id === updated._id ? updated : d));
        toast.success('Message added');
      } else {
        toast.error(res?.error || 'Failed to send message');
      }
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleCreateDispute = async () => {
    if (!newDisputeData.title || !newDisputeData.description) {
      toast.error('Please fill required fields');
      return;
    }
    try {
      const res = await disputeService.createDispute(newDisputeData);
      if (res?.success) {
        toast.success('Dispute raised successfully');
        setShowNewDisputeModal(false);
        setNewDisputeData({
          dealId: '',
          type: 'deliverables',
          title: '',
          description: '',
          evidence: []
        });
        fetchDisputes();
      } else {
        toast.error(res?.error || 'Failed to raise dispute');
      }
    } catch (error) {
      toast.error('Failed to raise dispute');
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'open': return 'bg-red-100 text-red-800';
      case 'in-progress': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getTypeIcon = (type) => {
    switch(type) {
      case 'deliverables': return FileText;
      case 'payment': return AlertCircle;
      case 'contract': return FileText;
      case 'communication': return MessageSquare;
      default: return AlertCircle;
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
          <h1 className="text-2xl font-bold text-gray-900">Disputes & Resolution</h1>
          <p className="text-gray-600">Manage and resolve disputes between parties</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setShowNewDisputeModal(true)}>
          Raise Dispute
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <p className="text-2xl font-bold text-gray-900">{disputes.filter(d => d.status === 'open').length}</p>
          <p className="text-sm text-gray-600">Open Disputes</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <p className="text-2xl font-bold text-yellow-600">{disputes.filter(d => d.status === 'in-progress').length}</p>
          <p className="text-sm text-gray-600">In Progress</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <p className="text-2xl font-bold text-green-600">{disputes.filter(d => d.status === 'resolved').length}</p>
          <p className="text-sm text-gray-600">Resolved</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <p className="text-2xl font-bold text-gray-900">
            {disputes.filter(d => d.priority === 'high').length}
          </p>
          <p className="text-sm text-gray-600">High Priority</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search disputes..."
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
              <option value="open">Open</option>
              <option value="in-progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
            
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Priority</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 border rounded-lg flex items-center gap-2 ${
                showFilters ? 'bg-indigo-50 border-indigo-600 text-indigo-600' : 'border-gray-300'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filter
            </button>
          </div>
        </div>
      </div>

      {/* Disputes List */}
      <div className="space-y-4">
        {filteredDisputes.length > 0 ? (
          filteredDisputes.map((dispute) => {
            const TypeIcon = getTypeIcon(dispute.type);
            return (
              <div
                key={dispute._id}
                className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 cursor-pointer"
                onClick={() => {
                  setSelectedDispute(dispute);
                  setShowDetailsModal(true);
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${
                      dispute.type === 'deliverables' ? 'bg-orange-100' :
                      dispute.type === 'payment' ? 'bg-red-100' :
                      'bg-blue-100'
                    }`}>
                      <TypeIcon className={`w-6 h-6 ${
                        dispute.type === 'deliverables' ? 'text-orange-600' :
                        dispute.type === 'payment' ? 'text-red-600' :
                        'text-blue-600'
                      }`} />
                    </div>
                    
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">{dispute.title}</h3>
                      <p className="text-sm text-gray-600 mb-2">{dispute.campaignId?.title || 'Campaign'}</p>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-gray-500 flex items-center">
                          <User className="w-4 h-4 mr-1" />
                          {dispute.raisedBy?.userId?.fullName || 'You'}
                        </span>
                        <span className="text-gray-500">vs</span>
                        <span className="text-gray-500 flex items-center">
                          <User className="w-4 h-4 mr-1" />
                          {dispute.against?.userId?.fullName || 'Other'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(dispute.status)}`}>
                      {dispute.status}
                    </span>
                    <p className={`text-xs mt-2 font-medium ${getPriorityColor(dispute.priority)}`}>
                      {dispute.priority} priority
                    </p>
                  </div>
                </div>

                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{dispute.description}</p>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center text-gray-500">
                      <Calendar className="w-4 h-4 mr-1" />
                      {formatDate(dispute.createdAt)}
                    </span>
                    <span className="flex items-center text-gray-500">
                      <MessageSquare className="w-4 h-4 mr-1" />
                      {dispute.messages?.length || 0} messages
                    </span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm">
            <Flag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No disputes found</h3>
            <p className="text-gray-500">If you have any issues with a deal, you can raise a dispute.</p>
          </div>
        )}
      </div>

      {/* New Dispute Modal */}
      <Modal
        isOpen={showNewDisputeModal}
        onClose={() => setShowNewDisputeModal(false)}
        title="Raise a Dispute"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Related Deal <span className="text-red-500">*</span>
            </label>
            <select
              value={newDisputeData.dealId}
              onChange={(e) => setNewDisputeData({...newDisputeData, dealId: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select a deal</option>
              {/* Options would come from user's deals */}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dispute Type <span className="text-red-500">*</span>
            </label>
            <select
              value={newDisputeData.type}
              onChange={(e) => setNewDisputeData({...newDisputeData, type: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="deliverables">Deliverables Issue</option>
              <option value="payment">Payment Issue</option>
              <option value="contract">Contract Disagreement</option>
              <option value="communication">Communication Issue</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          <Input
            label="Dispute Title *"
            placeholder="Brief title for the dispute"
            value={newDisputeData.title}
            onChange={(e) => setNewDisputeData({...newDisputeData, title: e.target.value})}
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              rows="5"
              value={newDisputeData.description}
              onChange={(e) => setNewDisputeData({...newDisputeData, description: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Describe the issue in detail..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attachments (Optional)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input type="file" multiple className="hidden" id="dispute-files" />
              <label htmlFor="dispute-files" className="cursor-pointer">
                <p className="text-sm text-gray-600">
                  Drag and drop files here, or <span className="text-indigo-600">browse</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Upload screenshots, contracts, or other evidence
                </p>
              </label>
            </div>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> The other party will be notified and an admin will review your dispute within 24 hours.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowNewDisputeModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleCreateDispute}>
            Submit Dispute
          </Button>
        </div>
      </Modal>

      {/* Dispute Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title="Dispute Details"
        size="xl"
      >
        {selectedDispute && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">{selectedDispute.title}</h3>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedDispute.status)}`}>
                {selectedDispute.status}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500">Campaign</p>
                <p className="text-sm font-medium">{selectedDispute.campaignId?.title || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Raised By</p>
                <p className="text-sm font-medium">{selectedDispute.raisedBy?.userId?.fullName || 'You'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Against</p>
                <p className="text-sm font-medium">{selectedDispute.against?.userId?.fullName || 'Other'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Created</p>
                <p className="text-sm font-medium">{formatDate(selectedDispute.createdAt)}</p>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-700">{selectedDispute.description}</p>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-4">Discussion</h4>
              <div className="space-y-4 max-h-60 overflow-y-auto">
                {selectedDispute.messages?.length > 0 ? (
                  selectedDispute.messages.map((msg) => (
                    <div key={msg._id} className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">{msg.senderId?.fullName || 'Admin'}</span>
                        <span className="text-xs text-gray-500">{timeAgo(msg.createdAt)}</span>
                      </div>
                      <p className="text-sm text-gray-700">{msg.content}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No messages yet</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Add Message
              </label>
              <textarea
                rows="3"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Type your message..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>
                Close
              </Button>
              <Button variant="primary" onClick={handleAddMessage} loading={sendingMessage}>
                Send Message
              </Button>
              {selectedDispute.status !== 'resolved' && selectedDispute.status !== 'closed' && (
                <Button variant="danger">
                  Escalate
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Disputes;