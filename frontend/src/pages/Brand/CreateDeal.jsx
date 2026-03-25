import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useCampaign } from '../../hooks/useCampaign';
import { useDeal } from '../../hooks/useDeal';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import { DollarSign, BarChart3 } from 'lucide-react';
import dealService from '../../services/dealService';
import toast from 'react-hot-toast';

const CreateDeal = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { campaigns, fetchBrandCampaigns, loading: campaignsLoading } = useCampaign();
  const { createDeal, loading: dealLoading } = useDeal();

  // Get creator ID from query parameter
  const searchParams = new URLSearchParams(location.search);
  const creatorId = searchParams.get('creator');

  const [formData, setFormData] = useState({
    campaignId: '',
    budget: '',
    deadline: '',
    deliverables: [{ type: 'post', platform: 'instagram', description: '', quantity: 1 }],
    message: ''
  });

  // Performance deal state
  const [dealType, setDealType] = useState('fixed'); // 'fixed' or 'performance'
  const [paymentType, setPaymentType] = useState('cpe');
  const [perfMetrics, setPerfMetrics] = useState({
    targetEngagements: '',
    baseRate: '',
    bonusRate: '',
    targetConversions: '',
    commissionRate: '',
    targetImpressions: '',
    ratePerThousand: '',
    revenueSharePercent: '',
    minimumGuarantee: ''
  });
  const [perfSubmitting, setPerfSubmitting] = useState(false);

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!creatorId) {
      toast.error('No creator selected');
      navigate('/brand/search');
    }
    fetchBrandCampaigns('all', 1, 100);
  }, []);


  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleDeliverableChange = (index, field, value) => {
    const newDeliverables = [...formData.deliverables];
    newDeliverables[index] = { ...newDeliverables[index], [field]: value };
    setFormData(prev => ({ ...prev, deliverables: newDeliverables }));
  };

  const addDeliverable = () => {
    setFormData(prev => ({
      ...prev,
      deliverables: [...prev.deliverables, { type: 'post', platform: 'instagram', description: '', quantity: 1 }]
    }));
  };

  const removeDeliverable = (index) => {
    if (formData.deliverables.length > 1) {
      setFormData(prev => ({
        ...prev,
        deliverables: prev.deliverables.filter((_, i) => i !== index)
      }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.campaignId) newErrors.campaignId = 'Please select a campaign';

    // Budget is only required for fixed deals
    if (dealType === 'fixed') {
      if (!formData.budget || formData.budget < 10) newErrors.budget = 'Budget must be at least $10';
    }

    // Performance metrics validation
    if (dealType === 'performance') {
      if (paymentType === 'cpe' && !perfMetrics.targetEngagements) newErrors.perfMetrics = 'Target engagements required';
      if (paymentType === 'cpa' && !perfMetrics.targetConversions) newErrors.perfMetrics = 'Target conversions required';
      if (paymentType === 'cpm' && !perfMetrics.targetImpressions) newErrors.perfMetrics = 'Target impressions required';
      if (paymentType === 'revenue_share' && !perfMetrics.revenueSharePercent) newErrors.perfMetrics = 'Revenue share % required';
    }

    if (!formData.deadline) newErrors.deadline = 'Deadline is required';
    else if (new Date(formData.deadline) <= new Date()) newErrors.deadline = 'Deadline must be in the future';

    formData.deliverables.forEach((d, i) => {
      if (d.quantity < 1) newErrors[`deliverable_${i}_quantity`] = 'Quantity must be at least 1';
    });

    setErrors(newErrors);
    if (newErrors.perfMetrics) toast.error(newErrors.perfMetrics);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const dealData = {
      campaignId: formData.campaignId,
      creatorId,
      budget: parseFloat(formData.budget),
      deadline: formData.deadline,
      deliverables: formData.deliverables.map(d => ({
        type: d.type,
        platform: d.platform,
        quantity: d.quantity,
        description: d.description || ''
      })),
      message: formData.message
    };

    if (dealType === 'performance') {
      // Build performance deal payload
      const perfData = {
        ...dealData,
        paymentType,
        performanceMetrics: {}
      };

      if (paymentType === 'cpe') {
        perfData.performanceMetrics = {
          targetEngagements: parseInt(perfMetrics.targetEngagements) || 0,
          baseRate: parseFloat(perfMetrics.baseRate) || 0,
          bonusRate: parseFloat(perfMetrics.bonusRate) || 0
        };
      } else if (paymentType === 'cpa') {
        perfData.performanceMetrics = {
          targetConversions: parseInt(perfMetrics.targetConversions) || 0,
          commissionRate: parseFloat(perfMetrics.commissionRate) || 0
        };
      } else if (paymentType === 'cpm') {
        perfData.performanceMetrics = {
          targetImpressions: parseInt(perfMetrics.targetImpressions) || 0,
          ratePerThousand: parseFloat(perfMetrics.ratePerThousand) || 0
        };
      } else if (paymentType === 'revenue_share') {
        perfData.performanceMetrics = {
          revenueSharePercent: parseFloat(perfMetrics.revenueSharePercent) || 0,
          minimumGuarantee: parseFloat(perfMetrics.minimumGuarantee) || 0
        };
      }

      try {
        setPerfSubmitting(true);
        const result = await dealService.createPerformanceDeal(perfData);
        if (result?.success) {
          toast.success('Performance deal created successfully');
          navigate(`/brand/deals/${result.deal?._id || ''}`);
        } else {
          toast.error(result?.error || 'Failed to create performance deal');
        }
      } catch (error) {
        toast.error('Failed to create performance deal');
      } finally {
        setPerfSubmitting(false);
      }
      return;
    }

    // Fixed payment deal (original flow)
    const result = await createDeal(dealData);
    if (result) {
      toast.success('Deal offer sent successfully');
      navigate(`/brand/deals/${result._id}`);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Deal</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Deal Type Toggle */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Payment Type</label>
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            <button type="button" onClick={() => setDealType('fixed')} className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${dealType === 'fixed' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}><DollarSign className="w-4 h-4" /> Fixed Payment</button>
            <button type="button" onClick={() => setDealType('performance')} className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${dealType === 'performance' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}><BarChart3 className="w-4 h-4" /> Performance Based</button>
          </div>
        </div>

        {/* Campaign Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Campaign <span className="text-red-500">*</span>
          </label>
          <select
            name="campaignId"
            value={formData.campaignId}
            onChange={handleChange}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              errors.campaignId ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Select a campaign</option>
            {campaigns.map(campaign => (
              <option key={campaign._id} value={campaign._id}>
                {campaign.title} (Budget: ${campaign.budget})
              </option>
            ))}
          </select>
          {errors.campaignId && <p className="mt-1 text-sm text-red-600">{errors.campaignId}</p>}
        </div>

        {/* Budget (only for fixed) */}
        {dealType === 'fixed' && (
          <Input
            label="Budget ($)"
            name="budget"
            type="number"
            value={formData.budget}
            onChange={handleChange}
            placeholder="e.g., 500"
            error={errors.budget}
            min="10"
            required
          />
        )}

        {/* Performance Metrics (only for performance) */}
        {dealType === 'performance' && (
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-5 rounded-xl space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Performance Metrics</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
              <select value={paymentType} onChange={(e) => setPaymentType(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="cpe">CPE — Cost Per Engagement</option>
                <option value="cpa">CPA — Cost Per Acquisition</option>
                <option value="cpm">CPM — Cost Per Mille (1000 Impressions)</option>
                <option value="revenue_share">Revenue Share</option>
              </select>
            </div>

            {paymentType === 'cpe' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Engagements</label>
                  <input type="number" value={perfMetrics.targetEngagements} onChange={(e) => setPerfMetrics({ ...perfMetrics, targetEngagements: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g., 5000" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Base Rate ($)</label>
                  <input type="number" step="0.01" value={perfMetrics.baseRate} onChange={(e) => setPerfMetrics({ ...perfMetrics, baseRate: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g., 0.05" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bonus Rate ($)</label>
                  <input type="number" step="0.01" value={perfMetrics.bonusRate} onChange={(e) => setPerfMetrics({ ...perfMetrics, bonusRate: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g., 0.10" />
                </div>
              </div>
            )}

            {paymentType === 'cpa' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Conversions</label>
                  <input type="number" value={perfMetrics.targetConversions} onChange={(e) => setPerfMetrics({ ...perfMetrics, targetConversions: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g., 100" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Commission Rate (%)</label>
                  <input type="number" step="0.1" value={perfMetrics.commissionRate} onChange={(e) => setPerfMetrics({ ...perfMetrics, commissionRate: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g., 15" />
                </div>
              </div>
            )}

            {paymentType === 'cpm' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Impressions</label>
                  <input type="number" value={perfMetrics.targetImpressions} onChange={(e) => setPerfMetrics({ ...perfMetrics, targetImpressions: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g., 100000" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rate per 1000 ($)</label>
                  <input type="number" step="0.01" value={perfMetrics.ratePerThousand} onChange={(e) => setPerfMetrics({ ...perfMetrics, ratePerThousand: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g., 5.00" />
                </div>
              </div>
            )}

            {paymentType === 'revenue_share' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Revenue Share (%)</label>
                  <input type="number" step="0.1" value={perfMetrics.revenueSharePercent} onChange={(e) => setPerfMetrics({ ...perfMetrics, revenueSharePercent: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g., 20" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Guarantee ($)</label>
                  <input type="number" step="0.01" value={perfMetrics.minimumGuarantee} onChange={(e) => setPerfMetrics({ ...perfMetrics, minimumGuarantee: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g., 200" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Deadline */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Deadline <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            name="deadline"
            value={formData.deadline}
            onChange={handleChange}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              errors.deadline ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.deadline && <p className="mt-1 text-sm text-red-600">{errors.deadline}</p>}
        </div>

        {/* Deliverables */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Deliverables</h3>
          {formData.deliverables.map((del, index) => (
            <div key={index} className="bg-gray-50 p-4 rounded-lg mb-4 relative">
              {formData.deliverables.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeDeliverable(index)}
                  className="absolute top-2 right-2 text-gray-400 hover:text-red-600"
                >
                  ✕
                </button>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
                  <select
                    value={del.platform}
                    onChange={(e) => handleDeliverableChange(index, 'platform', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="instagram">Instagram</option>
                    <option value="youtube">YouTube</option>
                    <option value="tiktok">TikTok</option>
                    <option value="twitter">Twitter</option>
                    <option value="facebook">Facebook</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={del.type}
                    onChange={(e) => handleDeliverableChange(index, 'type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="post">Post</option>
                    <option value="story">Story</option>
                    <option value="reel">Reel</option>
                    <option value="video">Video</option>
                    <option value="blog">Blog</option>
                    <option value="review">Review</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    value={del.quantity}
                    onChange={(e) => handleDeliverableChange(index, 'quantity', parseInt(e.target.value))}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {errors[`deliverable_${index}_quantity`] && (
                    <p className="mt-1 text-xs text-red-600">{errors[`deliverable_${index}_quantity`]}</p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                  <input
                    type="text"
                    value={del.description}
                    onChange={(e) => handleDeliverableChange(index, 'description', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., 2 lifestyle photos"
                  />
                </div>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addDeliverable}
            className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
          >
            + Add Another Deliverable
          </button>
        </div>

        {/* Message to Creator */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Message to Creator (optional)</label>
          <textarea
            name="message"
            value={formData.message}
            onChange={handleChange}
            rows="4"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Tell the creator about your expectations..."
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => navigate('/brand/search')}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={dealLoading || perfSubmitting}>
            {dealType === 'performance' ? 'Create Performance Deal' : 'Send Deal Offer'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateDeal;