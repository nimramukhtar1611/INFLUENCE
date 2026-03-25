import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useCampaign } from '../../hooks/useCampaign';
import { useDeal } from '../../hooks/useDeal';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
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
    if (!formData.budget || formData.budget < 10) newErrors.budget = 'Budget must be at least $10';
    if (!formData.deadline) newErrors.deadline = 'Deadline is required';
    else if (new Date(formData.deadline) <= new Date()) newErrors.deadline = 'Deadline must be in the future';

    formData.deliverables.forEach((d, i) => {
      if (d.quantity < 1) newErrors[`deliverable_${i}_quantity`] = 'Quantity must be at least 1';
    });

    setErrors(newErrors);
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

        {/* Budget */}
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
          <Button type="submit" variant="primary" loading={dealLoading}>
            Send Deal Offer
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateDeal;