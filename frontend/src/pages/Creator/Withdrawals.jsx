// pages/Creator/Withdrawals.jsx
import React, { useState, useEffect } from 'react';
import {
  Wallet,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  CreditCard,
  Building2,
  Trash2,
  Edit,
  Loader,
  RefreshCw,
  AlertCircle,
  TrendingUp
} from 'lucide-react';
import { useEarnings } from '../../hooks/useEarnings';
import { formatCurrency, formatDate, timeAgo } from '../../utils/helpers';
import Button from '../../components/UI/Button';
import Modal from '../../components/Common/Modal';
import StatsCard from '../../components/Common/StatsCard';
import toast from 'react-hot-toast';

const Withdrawals = () => {
  const {
    loading,
    balance,
    pendingBalance,
    withdrawals,
    paymentMethods,
    summary,
    fetchWithdrawals,
    fetchPaymentMethods,
    fetchBalance,
    requestWithdrawal,
    addPaymentMethod,
    setDefaultMethod,
    deletePaymentMethod
  } = useEarnings();

  const [showAddMethodModal, setShowAddMethodModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [selectedMethodId, setSelectedMethodId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [newMethod, setNewMethod] = useState({
    type: 'paypal',
    paypalEmail: '',
    bankName: '',
    accountNumber: '',
    routingNumber: '',
    accountHolderName: ''
  });

  const handleRefresh = async () => {
    await Promise.all([fetchWithdrawals(), fetchPaymentMethods(), fetchBalance()]);
    toast.success('Refreshed');
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || !selectedMethodId) {
      toast.error('Please fill all fields');
      return;
    }
    if (amount < 50) {
      toast.error('Minimum withdrawal is $50');
      return;
    }
    if (amount > balance) {
      toast.error('Insufficient balance');
      return;
    }

    setSubmitting(true);
    const result = await requestWithdrawal(amount, selectedMethodId);
    setSubmitting(false);

    if (result?.success) {
      setShowWithdrawModal(false);
      setWithdrawAmount('');
      setSelectedMethodId('');
    }
  };

  const handleAddMethod = async () => {
    if (newMethod.type === 'paypal' && !newMethod.paypalEmail) {
      toast.error('PayPal email is required');
      return;
    }
    if (newMethod.type === 'bank_account' && (!newMethod.accountNumber || !newMethod.routingNumber)) {
      toast.error('Bank account details are required');
      return;
    }

    setSubmitting(true);
    const result = await addPaymentMethod(newMethod);
    setSubmitting(false);

    if (result?.success) {
      setShowAddMethodModal(false);
      setNewMethod({
        type: 'paypal',
        paypalEmail: '',
        bankName: '',
        accountNumber: '',
        routingNumber: '',
        accountHolderName: ''
      });
    }
  };

  const handleDeleteMethod = async (methodId) => {
    if (!window.confirm('Remove this payment method?')) return;
    await deletePaymentMethod(methodId);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'pending':   return 'bg-yellow-100 text-yellow-800';
      case 'failed':    return 'bg-red-100 text-red-800';
      default:          return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'processing':
      case 'pending':   return <Clock className="w-4 h-4" />;
      case 'failed':    return <XCircle className="w-4 h-4" />;
      default:          return null;
    }
  };

  if (loading && withdrawals.length === 0 && paymentMethods.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-10 h-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  const totalWithdrawn = withdrawals
    .filter(w => w.status === 'completed')
    .reduce((sum, w) => sum + (w.amount || 0), 0);

  const pendingWithdrawals = withdrawals
    .filter(w => w.status === 'pending' || w.status === 'processing')
    .reduce((sum, w) => sum + (w.amount || 0), 0);

  const thisMonthWithdrawals = withdrawals
    .filter(w => {
      const d = new Date(w.createdAt);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, w) => sum + (w.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Withdrawals</h1>
          <p className="text-gray-600">Manage your payouts and payment methods</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" icon={RefreshCw} onClick={handleRefresh}>
            Refresh
          </Button>
          <Button
            variant="outline"
            icon={CreditCard}
            onClick={() => setShowAddMethodModal(true)}
          >
            Add Payment Method
          </Button>
          <Button
            variant="primary"
            icon={Wallet}
            onClick={() => setShowWithdrawModal(true)}
            disabled={balance < 50}
          >
            Withdraw Funds
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-6 rounded-xl shadow-lg text-white">
          <p className="text-sm opacity-90 mb-1">Available Balance</p>
          <p className="text-3xl font-bold">{formatCurrency(balance)}</p>
          {pendingBalance > 0 && (
            <p className="text-sm opacity-75 mt-1">+{formatCurrency(pendingBalance)} pending</p>
          )}
        </div>
        <StatsCard
          title="Total Withdrawn"
          value={formatCurrency(totalWithdrawn)}
          icon={DollarSign}
          color="green"
        />
        <StatsCard
          title="Pending"
          value={formatCurrency(pendingWithdrawals)}
          icon={Clock}
          color="yellow"
        />
        <StatsCard
          title="This Month"
          value={formatCurrency(thisMonthWithdrawals)}
          icon={TrendingUp}
          color="blue"
        />
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Methods</h2>

        {paymentMethods.length > 0 ? (
          <div className="space-y-4">
            {paymentMethods.map((method) => (
              <div key={method._id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  {method.type === 'paypal' ? (
                    <CreditCard className="w-6 h-6 text-blue-600" />
                  ) : (
                    <Building2 className="w-6 h-6 text-gray-600" />
                  )}
                  <div>
                    <p className="font-medium text-gray-900">
                      {method.type === 'paypal'
                        ? `PayPal — ${method.paypalEmail}`
                        : `${method.bankName || 'Bank'} — ****${method.accountNumber?.slice(-4)}`}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">{method.type.replace('_', ' ')}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {method.isDefault && (
                    <span className="px-2 py-1 text-xs bg-indigo-100 text-indigo-800 rounded-full">
                      Default
                    </span>
                  )}
                  {!method.isDefault && (
                    <button
                      onClick={() => setDefaultMethod(method._id)}
                      className="text-sm text-indigo-600 hover:text-indigo-700"
                    >
                      Set Default
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteMethod(method._id)}
                    className="text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            <button
              onClick={() => setShowAddMethodModal(true)}
              className="w-full mt-2 text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center justify-center py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-400 transition-colors"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add New Payment Method
            </button>
          </div>
        ) : (
          <div className="text-center py-8">
            <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">No payment methods added yet</p>
            <Button variant="outline" icon={Plus} onClick={() => setShowAddMethodModal(true)}>
              Add Payment Method
            </Button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Withdrawal History</h2>
        </div>

        {withdrawals.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {withdrawals.map((withdrawal) => (
                  <tr key={withdrawal._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                      {withdrawal.transactionId || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(withdrawal.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                      {formatCurrency(withdrawal.amount || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(withdrawal.fee || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                      {formatCurrency(withdrawal.netAmount || withdrawal.amount || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                      {withdrawal.paymentMethod?.type?.replace('_', ' ') || 'Bank Transfer'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full inline-flex items-center gap-1 ${getStatusColor(withdrawal.status)}`}>
                        {getStatusIcon(withdrawal.status)}
                        {withdrawal.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No withdrawals yet</p>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Payout Schedule</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-600">Processing Time</span>
            <span className="font-medium">2–3 business days</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-600">Minimum Withdrawal</span>
            <span className="font-medium">$50</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-600">Withdrawal Fee</span>
            <span className="font-medium text-green-600">Free</span>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showAddMethodModal}
        onClose={() => setShowAddMethodModal(false)}
        title="Add Payment Method"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method Type</label>
            <select
              value={newMethod.type}
              onChange={(e) => setNewMethod({ ...newMethod, type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="paypal">PayPal</option>
              <option value="bank_account">Bank Account (US Only)</option>
            </select>
          </div>

          {newMethod.type === 'paypal' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">PayPal Email</label>
              <input
                type="email"
                value={newMethod.paypalEmail}
                onChange={(e) => setNewMethod({ ...newMethod, paypalEmail: e.target.value })}
                placeholder="your@email.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Account Holder Name</label>
                <input
                  type="text"
                  value={newMethod.accountHolderName}
                  onChange={(e) => setNewMethod({ ...newMethod, accountHolderName: e.target.value })}
                  placeholder="John Doe"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bank Name</label>
                <input
                  type="text"
                  value={newMethod.bankName}
                  onChange={(e) => setNewMethod({ ...newMethod, bankName: e.target.value })}
                  placeholder="Chase, Wells Fargo, etc."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Routing Number</label>
                <input
                  type="text"
                  value={newMethod.routingNumber}
                  onChange={(e) => setNewMethod({ ...newMethod, routingNumber: e.target.value })}
                  placeholder="9-digit routing number"
                  maxLength={9}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Account Number</label>
                <input
                  type="text"
                  value={newMethod.accountNumber}
                  onChange={(e) => setNewMethod({ ...newMethod, accountNumber: e.target.value })}
                  placeholder="Account number"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </>
          )}

          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="text-sm text-yellow-800">
              Your payment method will be verified within 1–2 business days.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowAddMethodModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleAddMethod} loading={submitting}>
            Add Payment Method
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={showWithdrawModal}
        onClose={() => setShowWithdrawModal(false)}
        title="Withdraw Funds"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Amount to Withdraw</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="0.00"
                min="50"
                max={balance}
                step="0.01"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Available: {formatCurrency(balance)} — Minimum: $50
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
            {paymentMethods.length > 0 ? (
              <select
                value={selectedMethodId}
                onChange={(e) => setSelectedMethodId(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select a method</option>
                {paymentMethods.map(m => (
                  <option key={m._id} value={m._id}>
                    {m.type === 'paypal'
                      ? `PayPal — ${m.paypalEmail}`
                      : `${m.bankName || 'Bank'} — ****${m.accountNumber?.slice(-4)}`}
                    {m.isDefault ? ' (Default)' : ''}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                <p className="text-sm text-yellow-800">
                  No payment methods added.{' '}
                  <button
                    onClick={() => { setShowWithdrawModal(false); setShowAddMethodModal(true); }}
                    className="underline font-medium"
                  >
                    Add one first.
                  </button>
                </p>
              </div>
            )}
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              Withdrawals typically take 2–3 business days to process.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowWithdrawModal(false)}>Cancel</Button>
          <Button
            variant="primary"
            onClick={handleWithdraw}
            loading={submitting}
            disabled={
              !withdrawAmount ||
              !selectedMethodId ||
              parseFloat(withdrawAmount) < 50 ||
              parseFloat(withdrawAmount) > balance
            }
          >
            Confirm Withdrawal
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default Withdrawals;