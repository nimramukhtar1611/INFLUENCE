import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Download,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
  Search,
  Filter,
  MoreVertical,
  Shield,
  Calendar,
  User,
  DollarSign
} from 'lucide-react';
import Button from '../../components/UI/Button';
import Modal from '../../components/Common/Modal';
import { getStatusColor, getStatusIconColor } from '../../utils/colorScheme';

const Contracts = () => {
  const [selectedContract, setSelectedContract] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const contracts = [
    {
      id: 1,
      title: 'Nike - Summer Collection Campaign',
      brand: 'Nike',
      creator: 'Sarah Johnson',
      type: 'Content Creation',
      value: '$450',
      status: 'active',
      signedBy: 'Both Parties',
      signedDate: '2024-06-10',
      expiryDate: '2024-07-15',
      file: 'contract-nike-summer.pdf',
      terms: [
        '2 Instagram posts featuring Nike products',
        '3 Instagram stories',
        'Content must be approved before posting',
        'Exclusive content for 30 days',
        'Payment released upon approval'
      ]
    },
    {
      id: 2,
      title: 'Sephora - Beauty Launch',
      brand: 'Sephora',
      creator: 'Alex Rivera',
      type: 'Video Review',
      value: '$600',
      status: 'pending',
      signedBy: 'Brand Only',
      signedDate: '2024-06-12',
      expiryDate: '2024-06-30',
      file: 'contract-sephora-beauty.pdf',
      terms: [
        '1 YouTube video review',
        '2 Instagram posts',
        'Must use provided products',
        'Include affiliate links',
        'Rights to repurpose content'
      ]
    },
    {
      id: 3,
      title: 'Apple - Tech Review',
      brand: 'Apple',
      creator: 'Mike Chen',
      type: 'Product Review',
      value: '$800',
      status: 'completed',
      signedBy: 'Both Parties',
      signedDate: '2024-06-01',
      expiryDate: '2024-06-14',
      file: 'contract-apple-tech.pdf',
      terms: [
        '1 YouTube video review',
        '2 Instagram posts',
        'Exclusive content for 60 days',
        'Product must be returned',
        'NDA applies'
      ]
    },
    {
      id: 4,
      title: 'Adidas - Fitness Campaign',
      brand: 'Adidas',
      creator: 'Emma Watson',
      type: 'Social Media',
      value: '$350',
      status: 'draft',
      signedBy: 'None',
      signedDate: null,
      expiryDate: '2024-07-01',
      file: 'contract-adidas-fitness.pdf',
      terms: [
        '2 TikTok videos',
        '3 Instagram stories',
        'Must show product in use',
        'Weekly progress reports',
        'Usage rights for 1 year'
      ]
    }
  ];

  const getStandardizedStatusColor = (status) => {
    return getStatusColor(status, 'status', false);
  };

  const getStatusIcon = (status) => {
    switch(status?.toLowerCase()) {
      case 'active': 
      case 'completed': return CheckCircle;
      case 'pending': return Clock;
      case 'draft': return AlertCircle;
      case 'expired': return AlertCircle;
      default: return AlertCircle;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contracts</h1>
          <p className="text-gray-600">View and manage all your agreements</p>
        </div>
        <Button
          variant="primary"
          icon={FileText}
        >
          Create New Contract
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">12</p>
          <p className="text-sm text-gray-600">Active Contracts</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <p className="text-2xl font-bold text-gray-900">5</p>
          <p className="text-sm text-gray-600">Pending Signatures</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <p className="text-2xl font-bold text-gray-900">24</p>
          <p className="text-sm text-gray-600">Completed</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <p className="text-2xl font-bold text-gray-900">$12,450</p>
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
              placeholder="Search contracts by title, brand, or creator..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-indigo-500"
            />
          </div>
          
          <div className="flex gap-2">
            <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-indigo-500">
              <option>All Status</option>
              <option>Active</option>
              <option>Pending</option>
              <option>Completed</option>
              <option>Draft</option>
            </select>
            
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </button>
          </div>
        </div>
      </div>

      {/* Contracts List */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contract</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Parties</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Signed</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {contracts.map((contract) => (
                <tr key={contract.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <FileText className="w-5 h-5 text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{contract.title}</div>
                        <div className="text-sm text-gray-500">{contract.type}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{contract.brand}</div>
                    <div className="text-sm text-gray-500">{contract.creator}</div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {contract.value}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full flex items-center w-fit gap-1 ${getStandardizedStatusColor(contract.status)}`}>
                      {React.createElement(getStatusIcon(contract.status), { className: `w-3 h-3 ${getStatusIconColor(contract.status)}` })}
                      {contract.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {contract.signedDate || 'Not signed'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => {
                        setSelectedContract(contract);
                        setShowPreviewModal(true);
                      }}
                      className="text-indigo-600 hover:text-indigo-900 mr-3"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="text-gray-400 hover:text-gray-600 mr-3">
                      <Download className="w-4 h-4" />
                    </button>
                    <button className="text-gray-400 hover:text-gray-600">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">{selectedContract.title}</h3>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStandardizedStatusColor(selectedContract.status)}`}>
                {React.createElement(getStatusIcon(selectedContract.status), { className: `w-3 h-3 ${getStatusIconColor(selectedContract.status)}` })}
                {selectedContract.status}
              </span>
            </div>

            {/* Contract Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                  <User className="w-4 h-4" />
                  Brand
                </div>
                <p className="font-medium">{selectedContract.brand}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                  <User className="w-4 h-4" />
                  Creator
                </div>
                <p className="font-medium">{selectedContract.creator}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                  <DollarSign className="w-4 h-4" />
                  Value
                </div>
                <p className="font-medium">{selectedContract.value}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                  <Calendar className="w-4 h-4" />
                  Expiry
                </div>
                <p className="font-medium">{selectedContract.expiryDate}</p>
              </div>
            </div>

            {/* Terms */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Terms & Conditions</h4>
              <ul className="space-y-2">
                {selectedContract.terms.map((term, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    {term}
                  </li>
                ))}
              </ul>
            </div>

            {/* Signature Status */}
            <div className="border-t border-gray-200 pt-4">
              <h4 className="font-medium text-gray-900 mb-3">Signature Status</h4>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-gray-600">Signed by: {selectedContract.signedBy}</span>
                </div>
                {selectedContract.signedDate && (
                  <span className="text-sm text-gray-500">on {selectedContract.signedDate}</span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button
                variant="secondary"
                icon={Download}
              >
                Download PDF
              </Button>
              {selectedContract.status === 'pending' && (
                <Button
                  variant="primary"
                  icon={CheckCircle}
                >
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