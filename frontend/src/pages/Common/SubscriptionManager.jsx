import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { CheckCircle, History, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { useSubscription } from '../../context/SubscriptionContext';

const formatCurrency = (value, currency = 'usd') => {
  const numeric = Number(value || 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: (currency || 'usd').toUpperCase(),
    minimumFractionDigits: 2
  }).format(numeric);
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString();
};

const formatLimitValue = (value) => {
  const numeric = Number(value);
  if (numeric === -1) return 'Infinite';
  return Number.isFinite(numeric) ? String(numeric) : '-';
};

const normalizePlanId = (value) => {
  if (value === null || value === undefined) return '';

  if (typeof value === 'string') {
    return value.trim().toLowerCase();
  }

  if (typeof value === 'object') {
    if (typeof value.planId === 'string') return value.planId.trim().toLowerCase();
    if (typeof value.id === 'string') return value.id.trim().toLowerCase();
    if (typeof value._id === 'string') return value._id.trim().toLowerCase();
  }

  return String(value).trim().toLowerCase();
};

const ROLE_PLAN_COPY = {
  brand: {
    starter: {
      description: 'For early-stage brands launching creator campaigns',
      features: [
        'Campaign launch workflows for small teams',
        'Advanced creator search and filtering',
        'Basic collaboration and deal tracking',
        'Performance visibility for active deals'
      ]
    },
    professional: {
      description: 'For scaling brand teams running performance campaigns',
      features: [
        'AI Creator Matching Engine with campaign context',
        'Priority support and faster campaign operations',
        'Higher collaboration limits for growing teams',
        'Advanced ROI and performance intelligence'
      ]
    },
    enterprise: {
      description: 'For enterprise brands and agencies with complex operations',
      features: [
        'AI Counter Dealing for negotiation automation',
        'High-volume workflow support for large portfolios',
        'Advanced account controls and service guarantees',
        'Custom integrations and enterprise-scale operations'
      ]
    }
  },
  creator: {
    free: {
      description: 'Perfect for getting started as a creator',
      features: [
        'Completed deals cap: 2 total',
        'Basic creator visibility',
        'Core deal collaboration tools',
        'Standard support'
      ]
    },
    starter: {
      description: 'For creators building paid-collab momentum',
      features: [
        'Completed deals cap: 10 total',
        'More active deals and collaboration capacity',
        'Improved campaign visibility and discoverability',
        'Better performance tracking for ongoing work',
        'Core tools to grow recurring brand partnerships'
      ]
    },
    professional: {
      description: 'For creators focused on predictable growth and premium deals',
      features: [
        'Completed deals cap: 30 total',
        'Creator Growth OS access for strategic content direction',
        'Deeper performance insights to optimize outcomes',
        'Priority support for faster issue resolution',
        'Expanded professional toolkit for higher-value partnerships'
      ]
    },
    enterprise: {
      description: 'For top creators and teams running at scale',
      features: [
        'Completed deals cap: Infinite',
        'AI Counter Dealing for enterprise negotiation workflows',
        'Maximum collaboration scale and workflow headroom',
        'Enterprise-level support and reliability',
        'Advanced controls for high-volume campaign execution'
      ]
    }
  }
};

const getRoleSpecificPlanCopy = ({ userType, planId, fallbackDescription, fallbackFeatures }) => {
  const role = String(userType || '').toLowerCase();
  const normalizedPlanId = normalizePlanId(planId);
  const roleCopy = ROLE_PLAN_COPY[role]?.[normalizedPlanId];

  if (!roleCopy) {
    return {
      description: fallbackDescription,
      features: fallbackFeatures
    };
  }

  return {
    description: roleCopy.description || fallbackDescription,
    features: Array.isArray(roleCopy.features) && roleCopy.features.length
      ? roleCopy.features
      : fallbackFeatures
  };
};

const SubscriptionManager = () => {
  const location = useLocation();
  const { user } = useAuth();
  const {
    plans,
    currentSubscription,
    invoices,
    upcomingInvoice,
    limits,
    usage,
    loading,
    busy,
    isSubscriptionUser,
    refreshAll,
    startCheckout,
    startPlanChange,
    openBillingPortal,
    downloadInvoice
  } = useSubscription();

  const [interval, setInterval] = useState('month');
  const [selectedPlanId, setSelectedPlanId] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const requestedPlan = params.get('plan');
    const requestedInterval = params.get('interval');
    const checkoutStatus = params.get('checkout');

    if (requestedPlan) setSelectedPlanId(requestedPlan);
    if (requestedInterval === 'year' || requestedInterval === 'month') {
      setInterval(requestedInterval);
    }

    if (checkoutStatus === 'success') {
      toast.success('Stripe checkout completed. Refreshing subscription status...');
      refreshAll();
      window.history.replaceState({}, '', window.location.pathname);
    }

    if (checkoutStatus === 'cancel') {
      toast('Stripe checkout was canceled.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [location.search, refreshAll]);

  const selectedPlan = useMemo(
    () => plans.find((plan) => normalizePlanId(plan.id) === normalizePlanId(selectedPlanId)) || null,
    [plans, selectedPlanId]
  );

  const activePlanId = useMemo(() => {
    if (!currentSubscription) return null;

    const planIdCandidates = [
      currentSubscription.planDetails?.planId,
      currentSubscription.planDetails?.id,
      currentSubscription.planId?.planId,
      currentSubscription.planId,
      currentSubscription.planDetails?._id,
      currentSubscription.planId?._id
    ];

    for (const candidate of planIdCandidates) {
      const normalized = normalizePlanId(candidate);
      if (normalized) {
        return normalized;
      }
    }

    const currentPlanName = String(currentSubscription.planDetails?.name || '').trim().toLowerCase();
    if (currentPlanName) {
      const matchedPlan = plans.find((plan) => String(plan.name || '').trim().toLowerCase() === currentPlanName);
      if (matchedPlan?.id) {
        return normalizePlanId(matchedPlan.id);
      }
    }

    return null;
  }, [currentSubscription, plans]);

  useEffect(() => {
    if (plans.length === 0) return;

    const selectedExists = plans.some((plan) => normalizePlanId(plan.id) === normalizePlanId(selectedPlanId));

    if (selectedExists && normalizePlanId(selectedPlanId) !== 'free') {
      return;
    }

    if (activePlanId) {
      const activePlan = plans.find((plan) => normalizePlanId(plan.id) === activePlanId);
      if (activePlan?.id) {
        setSelectedPlanId(activePlan.id);
        return;
      }
    }

    const firstPaidPlan = plans.find((plan) => normalizePlanId(plan.id) !== 'free');
    setSelectedPlanId(firstPaidPlan?.id || plans[0].id);
  }, [plans, selectedPlanId, activePlanId]);

  const hasActiveStripeSubscription = Boolean(currentSubscription?.stripeSubscriptionId)
    && ['active', 'trialing', 'past_due'].includes(currentSubscription?.status);

  const canManageBilling = Boolean(currentSubscription?.stripeSubscriptionId);

  const selectedPlanIdNormalized = normalizePlanId(selectedPlan?.id || selectedPlanId);
  const isSelectedPlanFree = selectedPlanIdNormalized === 'free';

  const handleSubscribeOrChange = async () => {
    if (!selectedPlan) return;

    if (normalizePlanId(selectedPlan.id) === 'free') {
      toast('Free plan is included by default and cannot be subscribed through Stripe.');
      return;
    }

    const selectedId = normalizePlanId(selectedPlan.id);

    if (hasActiveStripeSubscription) {
      if (selectedId !== activePlanId) {
        await startPlanChange({
          planId: selectedPlan.id,
          interval
        });
        return;
      }

      await openBillingPortal();
      return;
    }

    await startCheckout({
      planId: selectedPlan.id,
      interval
    });
  };

  if (!isSubscriptionUser) {
    return (
      <div className="p-6 bg-white rounded-xl border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900">Subscription</h1>
        <p className="mt-2 text-gray-600">Subscriptions are available for brand and creator accounts.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subscription & Billing</h1>
          <p className="text-gray-600">Manage plans, invoices, and billing through Stripe Checkout.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={refreshAll}
            disabled={loading || busy}
            className="inline-flex items-center px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {currentSubscription ? (
            <button
              type="button"
              onClick={openBillingPortal}
              disabled={busy || !canManageBilling}
              className="inline-flex items-center px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-black disabled:opacity-60"
            >
              Manage Billing
            </button>
          ) : null}
        </div>
      </div>

      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-lg font-semibold text-gray-900">Current Subscription</h2>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
            {currentSubscription?.status || 'none'}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="p-4 rounded-lg bg-gray-50">
            <p className="text-gray-500">Plan</p>
            <p className="text-gray-900 font-semibold mt-1">{currentSubscription?.planDetails?.name || 'No active plan'}</p>
          </div>
          <div className="p-4 rounded-lg bg-gray-50">
            <p className="text-gray-500">Billing Period Ends</p>
            <p className="text-gray-900 font-semibold mt-1">{formatDate(currentSubscription?.billingPeriod?.end)}</p>
          </div>
          <div className="p-4 rounded-lg bg-gray-50">
            <p className="text-gray-500">Upcoming Invoice</p>
            <p className="text-gray-900 font-semibold mt-1">
              {upcomingInvoice ? formatCurrency(upcomingInvoice.amount, upcomingInvoice.currency) : '-'}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openBillingPortal}
            disabled={!canManageBilling || busy}
            className="px-4 py-2 rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
          >
            Manage Billing in Stripe
          </button>
        </div>
      </section>

      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Choose Plan</h2>
          <div className="inline-flex bg-gray-100 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setInterval('month')}
              className={`px-3 py-1.5 rounded-md text-sm ${interval === 'month' ? 'bg-white shadow text-gray-900' : 'text-gray-600'}`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setInterval('year')}
              className={`px-3 py-1.5 rounded-md text-sm ${interval === 'year' ? 'bg-white shadow text-gray-900' : 'text-gray-600'}`}
            >
              Yearly
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const planId = normalizePlanId(plan.id);
            const isSelected = selectedPlanIdNormalized === planId;
            const isActive = activePlanId === planId;
            const isFreePlan = planId === 'free';
            const displayPrice = interval === 'year' ? Number(plan.price || 0) * 12 : Number(plan.price || 0);
            const fallbackFeatures = Array.isArray(plan.features)
              ? plan.features.slice(0, 4)
              : (typeof plan.features === 'string' && plan.features ? [plan.features] : []);
            const roleCopy = getRoleSpecificPlanCopy({
              userType: user?.userType,
              planId,
              fallbackDescription: plan.description,
              fallbackFeatures
            });

            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => {
                  if (!isFreePlan) {
                    setSelectedPlanId(plan.id);
                  }
                }}
                disabled={isFreePlan}
                className={`text-left p-4 rounded-xl border transition ${
                  isActive
                    ? 'border-blue-500 bg-blue-50'
                    : isSelected
                      ? 'border-indigo-500 bg-indigo-50'
                      : isFreePlan
                        ? 'border-gray-200 bg-gray-50'
                        : 'border-gray-200 hover:border-gray-300'
                } ${isFreePlan ? 'cursor-not-allowed opacity-80' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                  <div className="flex items-center gap-2">
                    {isFreePlan ? (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">Included</span>
                    ) : null}
                    {isActive ? <CheckCircle className="w-5 h-5 text-blue-600" /> : null}
                  </div>
                </div>
                <p className="mt-1 text-sm text-gray-600">{roleCopy.description}</p>
                <p className="mt-3 text-xl font-bold text-gray-900">{formatCurrency(displayPrice, plan.currency)}</p>
                <p className="text-xs text-gray-500">per {interval}</p>
                <ul className="mt-3 space-y-1 text-sm text-gray-700">
                  {roleCopy.features.map((feature) => (
                    <li key={String(feature)} className="flex items-start">
                      <ShieldCheck className="w-4 h-4 text-indigo-600 mr-2 mt-0.5" />
                      <span>{typeof feature === 'string' ? feature : feature?.name || 'Feature'}</span>
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleSubscribeOrChange}
            disabled={!selectedPlan || busy || isSelectedPlanFree}
            className="inline-flex items-center px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {isSelectedPlanFree
              ? 'Free Plan Included'
              : hasActiveStripeSubscription
                ? (normalizePlanId(selectedPlan?.id) !== activePlanId ? 'Change Plan in Stripe' : 'Manage Billing in Stripe')
              : 'Subscribe via Stripe'}
          </button>
        </div>

        <div className="mt-4 p-4 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-900">
          Stripe Checkout handles all billing details and payment methods securely. No card information is collected in-app.
        </div>
      </section>

      <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <History className="w-5 h-5 mr-2" />
            Invoices
          </h2>

          <div className="mt-4 space-y-2">
            {invoices.length === 0 ? (
              <p className="text-sm text-gray-500">No invoices available.</p>
            ) : (
              invoices.map((invoice) => (
                <div key={invoice.id || invoice._id} className="p-3 rounded-lg bg-gray-50 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{invoice.number || invoice.id || invoice._id}</p>
                    <p className="text-xs text-gray-500">{formatDate(invoice.date || invoice.createdAt)} - {formatCurrency(invoice.amount, invoice.currency)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => downloadInvoice(invoice.id || invoice._id)}
                    className="text-xs px-3 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-100"
                  >
                    Download
                  </button>
                </div>
              ))
            )}
          </div>
      </section>

      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-lg font-semibold text-gray-900">Plan Usage</h2>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          {user?.userType === 'brand' && (
          <>
          <div className="p-3 rounded bg-gray-50">
            <p className="text-gray-500">Campaigns</p>
            <p className="font-semibold text-gray-900 mt-1">{usage?.campaignsUsed ?? 0} / {formatLimitValue(limits?.campaigns)}</p>
          </div>
          <div className="p-3 rounded bg-gray-50">
            <p className="text-gray-500">Team Members</p>
            <p className="font-semibold text-gray-900 mt-1">{usage?.teamMembersUsed ?? 0} / {formatLimitValue(limits?.teamMembers)}</p>
          </div>
          <div className="p-3 rounded bg-gray-50">
            <p className="text-gray-500">Active Deals</p>
            <p className="font-semibold text-gray-900 mt-1">{usage?.activeDealsUsed ?? 0} / {formatLimitValue(limits?.activeDeals)}</p>
          </div>
          </>
          )}
          {user?.userType === 'creator' && (
          <>
          <div className="p-3 rounded bg-gray-50">
            <p className="text-gray-500">Active Deals</p>
            <p className="font-semibold text-gray-900 mt-1">{usage?.activeDealsUsed ?? 0} / {formatLimitValue(limits?.activeDeals)}</p>
          </div>
          <div className="p-3 rounded bg-gray-50">
            <p className="text-gray-500">Completed Deals</p>
            <p className="font-semibold text-gray-900 mt-1">{usage?.completedDealsUsed ?? 0} / {formatLimitValue(limits?.completedDeals)}</p>
          </div>
          </>
          )}
        </div>
      </section>

      {loading ? (
        <div className="fixed bottom-5 right-5 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm shadow-lg inline-flex items-center">
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Loading subscription data...
        </div>
      ) : null}

      <p className="text-xs text-gray-500">Signed in as {user?.email}</p>
    </div>
  );
};

export default SubscriptionManager;
