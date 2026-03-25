import React, { useState } from 'react';
import {
  AlertCircle,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  User,
  Calendar,
  Filter,
  Search,
  Plus,
  ChevronRight
} from 'lucide-react';
import Button from '../../components/UI/Button';
import Modal from '../../components/Common/Modal';
import Input from '../../components/UI/Input';
import Select from '../../components/UI/Select';

const Disputes = () => {
  const [showNewDisputeModal, setShowNewDisputeModal] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const disputes = [
    {
      id: 1,
      title: 'Deliverables not as agreed',
      campaign: 'Nike Summer Collection',
      raisedBy: 'Nike (Brand)',
      against: 'Sarah Johnson',
      type: 'deliverables',
      status: 'open',
      priority: 'high',
      created: '2024-06-10',
      lastUpdated: '2024-06-12',
      description: 'The content submitted does not match the requirements specified in the contract. Images are low resolution and don\'t showcase the products properly.',
      messages: [
        {
          id: 1,
          from: 'Nike',
          message: 'The images are too dark and don\'t show the product details clearly.',
          time: '2024-06-10 14:30',
          attachments: []
        },
        {
          id: 2,
          from: 'Sarah Johnson',
          message: 'I can reshoot with better lighting. Please confirm if you want me to proceed.',
          time: '2024-06-11 09:15',
          attachments: []
        },
        {
          id: 3,
          from: 'Admin',
          message: 'We\'re reviewing the case. Please provide the original requirements.',
          time: '2024-06-12 11:00',
          attachments: []
        }
      ]
    },
    {
      id: 2,
      title: 'Payment delayed',
      campaign: 'Sephora Beauty Launch',
      raisedBy: 'Alex Rivera',
      against: 'Sephora',
      type: 'payment',
      status: 'in-progress',
      priority: 'medium',
      created: '2024-06-05',
      lastUpdated: '2024-06-08',
      description: 'Payment has been pending for 5 days after approval. Multiple follow-ups but no response.',
      messages: []
    },
    {
      id: 3,
      title: 'Contract terms dispute',
      campaign: 'Apple Tech Review',
      raisedBy: 'Apple',
      against: 'Mike Chen',
      type: 'contract',
      status: 'resolved',
      priority: 'low',
      created: '2024-05-20',
      lastUpdated: '2024-05-25',
      description: 'Disagreement over content usage rights.',
      messages: []
    }
  ];

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Disputes & Resolution</h1>
          <p className="text-gray-600">Manage and resolve disputes between parties</p>
        </div>
        <Button
          variant="primary"
          icon={Plus}
          onClick={() => setShowNewDisputeModal(true)}
        >
          Raise Dispute
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">3</p>
          <p className="text-sm text-gray-600">Open Disputes</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <p className="text-2xl font-bold text-gray-900">2</p>
          <p className="text-sm text-gray-600">In Progress</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <p className="text-2xl font-bold text-gray-900">15</p>
          <p className="text-sm text-gray-600">Resolved</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <p className="text-2xl font-bold text-gray-900">2.5</p>
          <p className="text-sm text-gray-600">Avg. Resolution Days</p>
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
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-indigo-500"
            />
          </div>
          
          <div className="flex gap-2">
            <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-indigo-500">
              <option>All Status</option>
              <option>Open</option>
              <option>In Progress</option>
              <option>Resolved</option>
            </select>
            
            <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-indigo-500">
              <option>All Priority</option>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
            
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </button>
          </div>
        </div>
      </div>

      {/* Disputes List */}
      <div className="space-y-4">
        {disputes.map((dispute) => {
          const TypeIcon = getTypeIcon(dispute.type);
          
          return (
            <div
              key={dispute.id}
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
                    <p className="text-sm text-gray-600 mb-2">{dispute.campaign}</p>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-500">Raised by: {dispute.raisedBy}</span>
                      <span className="text-gray-500">vs {dispute.against}</span>
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
                    {dispute.created}
                  </span>
                  <span className="flex items-center text-gray-500">
                    <MessageSquare className="w-4 h-4 mr-1" />
                    {dispute.messages.length} messages
                  </span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </div>
          );
        })}
      </div>

      {/* New Dispute Modal */}
      <Modal
        isOpen={showNewDisputeModal}
        onClose={() => setShowNewDisputeModal(false)}
        title="Raise a Dispute"
        size="lg"
      >
        <div className="space-y-4">
          <Select
            label="Related Campaign"
            options={[
              { value: 'nike', label: 'Nike Summer Collection' },
              { value: 'sephora', label: 'Sephora Beauty Launch' },
              { value: 'apple', label: 'Apple Tech Review' }
            ]}
            placeholder="Select campaign"
          />
          
          <Select
            label="Dispute Type"
            options={[
              { value: 'deliverables', label: 'Deliverables Issue' },
              { value: 'payment', label: 'Payment Issue' },
              { value: 'contract', label: 'Contract Disagreement' },
              { value: 'communication', label: 'Communication Issue' },
              { value: 'other', label: 'Other' }
            ]}
            placeholder="Select dispute type"
          />
          
          <Input
            label="Dispute Title"
            placeholder="Brief title for the dispute"
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              rows="5"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-indigo-500"
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
          <Button
            variant="secondary"
            onClick={() => setShowNewDisputeModal(false)}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
          >
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
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">{selectedDispute.title}</h3>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedDispute.status)}`}>
                {selectedDispute.status}
              </span>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500">Campaign</p>
                <p className="text-sm font-medium">{selectedDispute.campaign}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Raised By</p>
                <p className="text-sm font-medium">{selectedDispute.raisedBy}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Against</p>
                <p className="text-sm font-medium">{selectedDispute.against}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Created</p>
                <p className="text-sm font-medium">{selectedDispute.created}</p>
              </div>
            </div>

            {/* Description */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-700">{selectedDispute.description}</p>
            </div>

            {/* Messages */}
            <div>
              <h4 className="font-medium text-gray-900 mb-4">Discussion</h4>
              <div className="space-y-4">
                {selectedDispute.messages.map((msg) => (
                  <div key={msg.id} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">{msg.from}</span>
                      <span className="text-xs text-gray-500">{msg.time}</span>
                    </div>
                    <p className="text-sm text-gray-700">{msg.message}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Add Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Add Message
              </label>
              <textarea
                rows="3"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-indigo-500"
                placeholder="Type your message..."
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              {selectedDispute.status !== 'resolved' && (
                <>
                  <Button
                    variant="danger"
                  >
                    Escalate
                  </Button>
                  <Button
                    variant="success"
                  >
                    Mark as Resolved
                  </Button>
                </>
              )}
              <Button
                variant="primary"
              >
                Send Message
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Disputes;