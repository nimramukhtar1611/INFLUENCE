import React, { useCallback, useEffect, useState } from 'react';
import {
  Wallet,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  Loader,
  RefreshCw,
  TrendingUp,
  Link2
} from 'lucide-react';
import { useEarnings } from '../../hooks/useEarnings';
import { useAuth } from '../../hooks/useAuth';
import { formatCurrency, formatDate } from '../../utils/helpers';
import Button from '../../components/UI/Button';
import Modal from '../../components/Common/Modal';
import StatsCard from '../../components/Common/StatsCard';
import paymentService from '../../services/paymentService';
import toast from 'react-hot-toast';

const Withdrawals = () => {
  const { refreshUser } = useAuth();
  const {
    loading,
    balance,
    pendingBalance,
    withdrawals,
    fetchWithdrawals,
    fetchBalance,
    requestWithdrawal
  } = useEarnings();

  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [payoutAccount, setPayoutAccount] = useState({
    loading: true,
    connected: false,
    status: 'not_connected',
    payoutsEnabled: false,
    detailsSubmitted: false,
    currentlyDue: []
  });

  const loadPayoutAccountStatus = useCallback(async () => {
    setPayoutAccount((prev) => ({ ...prev, loading: true }));
    const response = await paymentService.getPayoutAccountStatus();

    if (response?.success) {
      setPayoutAccount({
        loading: false,
        connected: Boolean(response.connected),
        status: response.status || 'pending',
        payoutsEnabled: Boolean(response.payoutsEnabled),
        detailsSubmitted: Boolean(response.detailsSubmitted),
        currentlyDue: response.currentlyDue || []
      });
      return;
    }

    setPayoutAccount((prev) => ({ ...prev, loading: false }));
  }, []);

  const handleConnectStripe = useCallback(async () => {
    setConnectingStripe(true);
    const response = await paymentService.createPayoutOnboardingLink();
    setConnectingStripe(false);

    if (!response?.success || !response?.url) {
      toast.error(response?.error || 'Failed to open Stripe onboarding');
      return;
    }

    window.location.assign(response.url);
  }, []);

  useEffect(() => {
    loadPayoutAccountStatus();
  }, [loadPayoutAccountStatus]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stripeConnectState = params.get('stripe_connect');
    if (!stripeConnectState) return;

    if (stripeConnectState === 'return') {
      toast.success('Stripe payout account details updated.');
      loadPayoutAccountStatus();
      refreshUser?.();
    } else if (stripeConnectState === 'refresh') {
      toast('Stripe onboarding was not finished. Complete it to receive payouts.');
    }

    window.history.replaceState({}, '', window.location.pathname);
  }, [loadPayoutAccountStatus, refreshUser]);

  const handleRefresh = async () => {
    await Promise.all([fetchWithdrawals(), fetchBalance()]);
    toast.success('Refreshed');
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount) {
      toast.error('Please enter an amount');
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
    const result = await requestWithdrawal(amount);
    setSubmitting(false);

    if (result?.success) {
      setShowWithdrawModal(false);
      setWithdrawAmount('');
    }
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

  if (loading && withdrawals.length === 0) {
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

  const payoutStatusText = payoutAccount.connected
    ? 'Connected'
    : payoutAccount.status === 'pending'
      ? 'Action Required'
      : 'Not Connected';

  const payoutStatusClass = payoutAccount.connected
    ? 'bg-green-100 text-green-800'
    : payoutAccount.status === 'pending'
      ? 'bg-yellow-100 text-yellow-800'
      : 'bg-gray-100 text-gray-700';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Withdrawals</h1>
          <p className="text-gray-600">Stripe-only payouts with admin approval</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" icon={RefreshCw} onClick={handleRefresh}>
            Refresh
          </Button>
          <Button
            variant="primary"
            icon={Wallet}
            onClick={() => setShowWithdrawModal(true)}
            disabled={balance < 50}
          >
            Request Withdrawal
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

      <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">How It Works</h2>
        <p className="text-sm text-gray-600">
          Withdrawal requests are submitted as pending and reviewed by an admin. After approval, payout is processed to your Stripe-connected account.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${payoutStatusClass}`}>
            Stripe: {payoutStatusText}
          </span>
          <Button
            variant="outline"
            size="sm"
            icon={Link2}
            onClick={handleConnectStripe}
            loading={connectingStripe || payoutAccount.loading}
          >
            {payoutAccount.connected ? 'Update Stripe Account' : 'Connect Stripe Account'}
          </Button>
        </div>
        {!payoutAccount.connected ? (
          <p className="text-xs text-blue-700 mt-2">
            You can still request withdrawals now, but admin cannot approve payout until Stripe onboarding is completed.
          </p>
        ) : null}
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
                      {withdrawal.transactionId || '-'}
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Stripe</td>
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

      <Modal
        isOpen={showWithdrawModal}
        onClose={() => setShowWithdrawModal(false)}
        title="Request Withdrawal"
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
              Available: {formatCurrency(balance)} - Minimum: $50
            </p>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              Your request will remain pending until an admin approves it, then payout is sent via Stripe.
            </p>
          </div>

          {!payoutAccount.connected ? (
            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
              <p className="text-sm text-amber-900">
                Stripe payout account is not connected yet. You can submit this request, then connect Stripe before admin approval.
              </p>
            </div>
          ) : null}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowWithdrawModal(false)}>Cancel</Button>
          <Button
            variant="primary"
            onClick={handleWithdraw}
            loading={submitting}
            disabled={!withdrawAmount || parseFloat(withdrawAmount) < 50 || parseFloat(withdrawAmount) > balance}
          >
            Submit Request
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default Withdrawals;