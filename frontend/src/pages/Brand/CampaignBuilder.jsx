import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Target,
  DollarSign,
  Image,
  Users,
  Globe,
  ChevronRight,
  ChevronLeft,
  Plus,
  X,
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Info,
  Loader,
  Instagram,
  Youtube,
  Twitter,
  Facebook,
  Linkedin,
  Globe2,
  Hash,
  MapPin,
  Users2,
} from 'lucide-react';
import { useCampaign } from '../../hooks/useCampaign';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import toast from 'react-hot-toast';
import api from '../../services/api';

const CampaignBuilder = () => {
  const navigate = useNavigate();
  const { createCampaign, loading } = useCampaign();
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    // Basic Info
    title: '',
    description: '',
    category: '',
    objectives: [],

    // Deliverables
    deliverables: [
      {
        type: 'post',
        platform: 'instagram',
        quantity: 1,
        description: '',
        requirements: '',
        budget: 0,
      },
    ],

    // Timeline
    startDate: '',
    endDate: '',
    submissionDeadline: '',

    // Budget
    budget: 0,
    budgetType: 'fixed',
    paymentTerms: 'escrow',

    // Target Audience
    targetAudience: {
      minFollowers: '',
      maxFollowers: '',
      minEngagement: '',
      locations: [],
      ages: [],
      genders: [],
      niches: [],
      platforms: ['instagram', 'youtube', 'tiktok'],
    },

    // Additional
    requirements: [],
    brandAssets: [],
  });

  const [newObjective, setNewObjective] = useState('');
  const [newRequirement, setNewRequirement] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [assets, setAssets] = useState([]);
  const [uploadingAssets, setUploadingAssets] = useState(false);

  // ==================== VALID CATEGORIES ====================
  const categories = [
    'Fashion', 'Beauty', 'Technology', 'Food & Beverage',
    'Fitness', 'Travel', 'Gaming', 'Lifestyle', 'Parenting',
    'Finance', 'Education', 'Entertainment', 'Sports', 'Other',
  ];

  const niches = [
    'Fashion', 'Beauty', 'Fitness', 'Travel', 'Food',
    'Tech', 'Gaming', 'Lifestyle', 'Parenting', 'Finance',
    'Education', 'Entertainment', 'Sports', 'Health', 'Wellness',
  ];

  const ageGroups = ['18-24', '25-34', '35-44', '45+'];
  const genders = ['male', 'female', 'all'];
  const platforms = ['instagram', 'youtube', 'tiktok', 'twitter', 'facebook'];

  const deliverableTypes = [
    { value: 'post', label: 'Post' },
    { value: 'story', label: 'Story' },
    { value: 'reel', label: 'Reel' },
    { value: 'video', label: 'Video' },
    { value: 'blog', label: 'Blog' },
    { value: 'review', label: 'Review' },
    { value: 'image', label: 'Image' },
  ];

  const platformIcons = {
    instagram: Instagram,
    youtube: Youtube,
    tiktok: Twitter,
    twitter: Twitter,
    facebook: Facebook,
  };

  // ==================== VALIDATION FUNCTIONS ====================
  const validateStep1 = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Campaign title is required';
    } else if (formData.title.length < 5) {
      newErrors.title = 'Title must be at least 5 characters';
    } else if (formData.title.length > 100) {
      newErrors.title = 'Title cannot exceed 100 characters';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Campaign description is required';
    } else if (formData.description.length < 20) {
      newErrors.description = 'Description must be at least 20 characters';
    } else if (formData.description.length > 2000) {
      newErrors.description = 'Description cannot exceed 2000 characters';
    }

    if (!formData.category) {
      newErrors.category = 'Please select a category';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};

    formData.deliverables.forEach((del, index) => {
      if (del.quantity < 1) {
        newErrors[`deliverable_${index}_quantity`] = 'Quantity must be at least 1';
      }
      if (del.quantity > 100) {
        newErrors[`deliverable_${index}_quantity`] = 'Quantity cannot exceed 100';
      }
      if (del.budget < 0) {
        newErrors[`deliverable_${index}_budget`] = 'Budget cannot be negative';
      }
    });

    // Check if total deliverables budget exceeds campaign budget
    const totalDeliverablesBudget = formData.deliverables.reduce(
      (sum, d) => sum + (d.budget * d.quantity),
      0
    );

    if (totalDeliverablesBudget > formData.budget && formData.budget > 0) {
      newErrors.budget = 'Total deliverables budget exceeds campaign budget';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    const newErrors = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    } else if (startDate < today) {
      newErrors.startDate = 'Start date must be in the future';
    }

    if (!formData.endDate) {
      newErrors.endDate = 'End date is required';
    } else if (formData.startDate && endDate <= startDate) {
      newErrors.endDate = 'End date must be after start date';
    }

    if (formData.submissionDeadline) {
      const submissionDate = new Date(formData.submissionDeadline);
      if (submissionDate >= endDate) {
        newErrors.submissionDeadline = 'Submission deadline must be before end date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep4 = () => {
    const newErrors = {};

    if (!formData.budget || formData.budget < 10) {
      newErrors.budget = 'Budget must be at least $10';
    } else if (formData.budget > 1000000) {
      newErrors.budget = 'Budget cannot exceed $1,000,000';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep5 = () => {
    // Target audience is optional, so always valid
    return true;
  };

  // ==================== STEP VALIDATION DISPATCH ====================
  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return validateStep1();
      case 2:
        return validateStep2();
      case 3:
        return validateStep3();
      case 4:
        return validateStep4();
      case 5:
        return validateStep5();
      default:
        return true;
    }
  };

  // ==================== STEP NAVIGATION ====================
  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep(currentStep + 1);
      window.scrollTo(0, 0);
    } else {
      toast.error('Please fix the errors before continuing');
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo(0, 0);
    }
  };

  // ==================== FORM SUBMISSION ====================
  const handleSubmit = async () => {
    if (!validateCurrentStep()) {
      toast.error('Please fix the errors before submitting');
      return;
    }

    try {
      setSubmitting(true);

      // Prepare data for API
      const campaignData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        objectives: formData.objectives,
        deliverables: formData.deliverables.map(d => ({
          type: d.type,
          platform: d.platform,
          quantity: parseInt(d.quantity),
          description: d.description || '',
          requirements: d.requirements || '',
          budget: parseFloat(d.budget || 0),
        })),
        startDate: formData.startDate,
        endDate: formData.endDate,
        submissionDeadline: formData.submissionDeadline || null,
        budget: parseFloat(formData.budget),
        budgetType: formData.budgetType,
        paymentTerms: formData.paymentTerms,
        targetAudience: {
          minFollowers: formData.targetAudience.minFollowers ? parseInt(formData.targetAudience.minFollowers) : null,
          maxFollowers: formData.targetAudience.maxFollowers ? parseInt(formData.targetAudience.maxFollowers) : null,
          minEngagement: formData.targetAudience.minEngagement ? parseFloat(formData.targetAudience.minEngagement) : null,
          locations: formData.targetAudience.locations,
          ages: formData.targetAudience.ages,
          genders: formData.targetAudience.genders,
          niches: formData.targetAudience.niches,
          platforms: formData.targetAudience.platforms,
        },
        requirements: formData.requirements,
      };

      const result = await createCampaign(campaignData);

      if (result) {
        toast.success('Campaign created successfully!');
        navigate(`/brand/campaigns/${result._id}`);
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast.error(error.message || 'Failed to create campaign');
    } finally {
      setSubmitting(false);
    }
  };

  // ==================== DELIVERABLE MANAGEMENT ====================
  const addDeliverable = () => {
    setFormData(prev => ({
      ...prev,
      deliverables: [
        ...prev.deliverables,
        {
          type: 'post',
          platform: 'instagram',
          quantity: 1,
          description: '',
          requirements: '',
          budget: 0,
        },
      ],
    }));
  };

  const removeDeliverable = (index) => {
    if (formData.deliverables.length > 1) {
      setFormData(prev => ({
        ...prev,
        deliverables: prev.deliverables.filter((_, i) => i !== index),
      }));
    } else {
      toast.error('At least one deliverable is required');
    }
  };

  const updateDeliverable = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      deliverables: prev.deliverables.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));

    // Clear error for this field
    if (errors[`deliverable_${index}_${field}`]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`deliverable_${index}_${field}`];
        return newErrors;
      });
    }
  };

  // ==================== OBJECTIVE MANAGEMENT ====================
  const addObjective = () => {
    if (newObjective.trim()) {
      setFormData(prev => ({
        ...prev,
        objectives: [...prev.objectives, newObjective.trim()],
      }));
      setNewObjective('');
    }
  };

  const removeObjective = (index) => {
    setFormData(prev => ({
      ...prev,
      objectives: prev.objectives.filter((_, i) => i !== index),
    }));
  };

  // ==================== REQUIREMENT MANAGEMENT ====================
  const addRequirement = () => {
    if (newRequirement.trim()) {
      setFormData(prev => ({
        ...prev,
        requirements: [...prev.requirements, newRequirement.trim()],
      }));
      setNewRequirement('');
    }
  };

  const removeRequirement = (index) => {
    setFormData(prev => ({
      ...prev,
      requirements: prev.requirements.filter((_, i) => i !== index),
    }));
  };

  // ==================== LOCATION MANAGEMENT ====================
  const addLocation = () => {
    if (newLocation.trim()) {
      setFormData(prev => ({
        ...prev,
        targetAudience: {
          ...prev.targetAudience,
          locations: [...prev.targetAudience.locations, newLocation.trim()],
        },
      }));
      setNewLocation('');
    }
  };

  const removeLocation = (index) => {
    setFormData(prev => ({
      ...prev,
      targetAudience: {
        ...prev.targetAudience,
        locations: prev.targetAudience.locations.filter((_, i) => i !== index),
      },
    }));
  };

  // ==================== NICHE MANAGEMENT ====================
  const toggleNiche = (niche) => {
    setFormData(prev => {
      const niches = prev.targetAudience.niches.includes(niche)
        ? prev.targetAudience.niches.filter(n => n !== niche)
        : [...prev.targetAudience.niches, niche];

      return {
        ...prev,
        targetAudience: {
          ...prev.targetAudience,
          niches,
        },
      };
    });
  };

  // ==================== AGE GROUP MANAGEMENT ====================
  const toggleAgeGroup = (age) => {
    setFormData(prev => {
      const ages = prev.targetAudience.ages.includes(age)
        ? prev.targetAudience.ages.filter(a => a !== age)
        : [...prev.targetAudience.ages, age];

      return {
        ...prev,
        targetAudience: {
          ...prev.targetAudience,
          ages,
        },
      };
    });
  };

  // ==================== GENDER MANAGEMENT ====================
  const toggleGender = (gender) => {
    setFormData(prev => {
      const genders = prev.targetAudience.genders.includes(gender)
        ? prev.targetAudience.genders.filter(g => g !== gender)
        : [...prev.targetAudience.genders, gender];

      return {
        ...prev,
        targetAudience: {
          ...prev.targetAudience,
          genders,
        },
      };
    });
  };

  // ==================== PLATFORM MANAGEMENT ====================
  const togglePlatform = (platform) => {
    setFormData(prev => {
      const platforms = prev.targetAudience.platforms.includes(platform)
        ? prev.targetAudience.platforms.filter(p => p !== platform)
        : [...prev.targetAudience.platforms, platform];

      return {
        ...prev,
        targetAudience: {
          ...prev.targetAudience,
          platforms,
        },
      };
    });
  };

  // ==================== FILE UPLOAD (FIXED) ====================
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    setUploadingAssets(true);

    try {
      const uploadedAssets = [];

      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);

        // Use the correct upload endpoint: /api/upload/single
        const response = await api.post('/upload/single', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        if (response.data?.success) {
          uploadedAssets.push({
            name: file.name,
            fileUrl: response.data.file.url,
            fileType: file.type.split('/')[0],
            fileSize: file.size,
          });
        } else {
          throw new Error(response.data?.error || 'Upload failed');
        }
      }

      setFormData(prev => ({
        ...prev,
        brandAssets: [...prev.brandAssets, ...uploadedAssets],
      }));

      setAssets([...assets, ...files]);
      toast.success(`${files.length} file(s) uploaded`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload files');
    } finally {
      setUploadingAssets(false);
    }
  };

  const removeAsset = (index) => {
    setFormData(prev => ({
      ...prev,
      brandAssets: prev.brandAssets.filter((_, i) => i !== index),
    }));
    setAssets(prev => prev.filter((_, i) => i !== index));
  };

  // ==================== STEPS CONFIGURATION ====================
  const steps = [
    { number: 1, name: 'Basics', icon: Target },
    { number: 2, name: 'Deliverables', icon: Image },
    { number: 3, name: 'Timeline', icon: Calendar },
    { number: 4, name: 'Budget', icon: DollarSign },
    { number: 5, name: 'Audience', icon: Users },
    { number: 6, name: 'Review', icon: Globe },
  ];

  // ==================== RENDER STEP CONTENT ====================
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Campaign Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.title ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., Summer Collection Launch 2024"
                value={formData.title}
                onChange={(e) => {
                  setFormData({ ...formData, title: e.target.value });
                  if (errors.title) {
                    setErrors({ ...errors, title: null });
                  }
                }}
              />
              {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Campaign Description <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows="5"
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.description ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Describe your campaign goals, requirements, and what you're looking for in creators..."
                value={formData.description}
                onChange={(e) => {
                  setFormData({ ...formData, description: e.target.value });
                  if (errors.description) {
                    setErrors({ ...errors, description: null });
                  }
                }}
              />
              {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
              <p className="text-xs text-gray-500 mt-1">
                {formData.description.length}/2000 characters
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                required
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.category ? 'border-red-500' : 'border-gray-300'
                }`}
                value={formData.category}
                onChange={(e) => {
                  setFormData({ ...formData, category: e.target.value });
                  if (errors.category) {
                    setErrors({ ...errors, category: null });
                  }
                }}
              >
                <option value="">Select a category</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              {errors.category && <p className="mt-1 text-sm text-red-600">{errors.category}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Campaign Objectives
              </label>
              <div className="space-y-2">
                {formData.objectives.map((obj, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="flex-1 text-sm">{obj}</span>
                    <button
                      onClick={() => removeObjective(index)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add an objective..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={newObjective}
                    onChange={(e) => setNewObjective(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addObjective()}
                  />
                  <Button variant="outline" onClick={addObjective} icon={Plus}>
                    Add
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            {formData.deliverables.map((deliverable, index) => (
              <div key={index} className="bg-gray-50 p-6 rounded-lg relative">
                {formData.deliverables.length > 1 && (
                  <button
                    onClick={() => removeDeliverable(index)}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Platform
                    </label>
                    <select
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={deliverable.platform}
                      onChange={(e) => updateDeliverable(index, 'platform', e.target.value)}
                    >
                      <option value="instagram">Instagram</option>
                      <option value="youtube">YouTube</option>
                      <option value="tiktok">TikTok</option>
                      <option value="twitter">Twitter</option>
                      <option value="facebook">Facebook</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Content Type
                    </label>
                    <select
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={deliverable.type}
                      onChange={(e) => updateDeliverable(index, 'type', e.target.value)}
                    >
                      {deliverableTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        errors[`deliverable_${index}_quantity`] ? 'border-red-500' : 'border-gray-300'
                      }`}
                      value={deliverable.quantity}
                      onChange={(e) => updateDeliverable(index, 'quantity', parseInt(e.target.value))}
                    />
                    {errors[`deliverable_${index}_quantity`] && (
                      <p className="mt-1 text-sm text-red-600">{errors[`deliverable_${index}_quantity`]}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Budget per Item ($)
                    </label>
                    <input
                      type="number"
                      min="0"
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        errors[`deliverable_${index}_budget`] ? 'border-red-500' : 'border-gray-300'
                      }`}
                      value={deliverable.budget}
                      onChange={(e) => updateDeliverable(index, 'budget', parseFloat(e.target.value))}
                    />
                    {errors[`deliverable_${index}_budget`] && (
                      <p className="mt-1 text-sm text-red-600">{errors[`deliverable_${index}_budget`]}</p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      rows="2"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Describe what you want in this deliverable..."
                      value={deliverable.description}
                      onChange={(e) => updateDeliverable(index, 'description', e.target.value)}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Specific Requirements
                    </label>
                    <textarea
                      rows="2"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g., Must include specific hashtags, mention our handle, etc."
                      value={deliverable.requirements}
                      onChange={(e) => updateDeliverable(index, 'requirements', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addDeliverable}
              className="flex items-center text-indigo-600 hover:text-indigo-700"
            >
              <Plus className="w-5 h-5 mr-1" />
              Add Another Deliverable
            </button>

            {/* Brand Assets Upload */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Brand Assets (Optional)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  id="asset-upload"
                  disabled={uploadingAssets}
                  accept="image/*,video/*,.pdf,.doc,.docx,.zip"
                />
                <label htmlFor="asset-upload" className="cursor-pointer">
                  {uploadingAssets ? (
                    <Loader className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-3" />
                  ) : (
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  )}
                  <p className="text-sm text-gray-600">
                    Drag and drop files here, or{' '}
                    <span className="text-indigo-600 font-medium">browse</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Upload logos, product images, brand guidelines (Max 100MB)
                  </p>
                </label>
              </div>

              {formData.brandAssets.length > 0 && (
                <div className="mt-4 space-y-2">
                  {formData.brandAssets.map((asset, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <FileText className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-600">{asset.name}</span>
                        <span className="text-xs text-gray-400 ml-2">
                          ({(asset.fileSize / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                      <button
                        onClick={() => removeAsset(index)}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Campaign Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    errors.startDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                  value={formData.startDate}
                  onChange={(e) => {
                    setFormData({ ...formData, startDate: e.target.value });
                    if (errors.startDate) {
                      setErrors({ ...errors, startDate: null });
                    }
                  }}
                />
                {errors.startDate && <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Campaign End Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    errors.endDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                  value={formData.endDate}
                  onChange={(e) => {
                    setFormData({ ...formData, endDate: e.target.value });
                    if (errors.endDate) {
                      setErrors({ ...errors, endDate: null });
                    }
                  }}
                />
                {errors.endDate && <p className="mt-1 text-sm text-red-600">{errors.endDate}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content Submission Deadline
                </label>
                <input
                  type="date"
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    errors.submissionDeadline ? 'border-red-500' : 'border-gray-300'
                  }`}
                  value={formData.submissionDeadline}
                  onChange={(e) => {
                    setFormData({ ...formData, submissionDeadline: e.target.value });
                    if (errors.submissionDeadline) {
                      setErrors({ ...errors, submissionDeadline: null });
                    }
                  }}
                />
                {errors.submissionDeadline && <p className="mt-1 text-sm text-red-600">{errors.submissionDeadline}</p>}
              </div>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-yellow-600 mt-0.5" />
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Submission deadline should be at least 3-5 days before campaign end date to allow for revisions.
                </p>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Campaign Budget ($) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min="10"
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.budget ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., 5000"
                value={formData.budget}
                onChange={(e) => {
                  setFormData({ ...formData, budget: e.target.value });
                  if (errors.budget) {
                    setErrors({ ...errors, budget: null });
                  }
                }}
              />
              {errors.budget && <p className="mt-1 text-sm text-red-600">{errors.budget}</p>}
              <p className="text-xs text-gray-500 mt-1">
                This is the total budget for all deliverables combined
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Budget Type
              </label>
              <div className="space-y-2">
                <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="budgetType"
                    value="fixed"
                    checked={formData.budgetType === 'fixed'}
                    onChange={(e) => setFormData({ ...formData, budgetType: e.target.value })}
                    className="mr-3"
                  />
                  <div>
                    <span className="font-medium">Fixed Price</span>
                    <p className="text-xs text-gray-500">Set a fixed price for each creator</p>
                  </div>
                </label>
                <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="budgetType"
                    value="outcome-based"
                    checked={formData.budgetType === 'outcome-based'}
                    onChange={(e) => setFormData({ ...formData, budgetType: e.target.value })}
                    className="mr-3"
                  />
                  <div>
                    <span className="font-medium">Outcome-based</span>
                    <p className="text-xs text-gray-500">Pay based on performance (CPE/CPA)</p>
                  </div>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Terms
              </label>
              <select
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={formData.paymentTerms}
                onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
              >
                <option value="escrow">Escrow (Funds held until approval)</option>
                <option value="half">50% upfront, 50% on completion</option>
                <option value="full">Full payment on completion</option>
              </select>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm text-blue-800">
                    <strong>Platform Fee:</strong> 10% of campaign budget will be deducted upon completion.
                  </p>
                  <p className="text-sm text-blue-800 mt-1">
                    You'll pay ${(formData.budget * 0.1).toFixed(2)} in fees.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Min Followers
                </label>
                <select
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={formData.targetAudience.minFollowers}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      targetAudience: {
                        ...formData.targetAudience,
                        minFollowers: e.target.value,
                      },
                    })
                  }
                >
                  <option value="">Any</option>
                  <option value="1000">1,000+</option>
                  <option value="5000">5,000+</option>
                  <option value="10000">10,000+</option>
                  <option value="25000">25,000+</option>
                  <option value="50000">50,000+</option>
                  <option value="100000">100,000+</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Followers
                </label>
                <select
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={formData.targetAudience.maxFollowers}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      targetAudience: {
                        ...formData.targetAudience,
                        maxFollowers: e.target.value,
                      },
                    })
                  }
                >
                  <option value="">Any</option>
                  <option value="10000">Up to 10,000</option>
                  <option value="25000">Up to 25,000</option>
                  <option value="50000">Up to 50,000</option>
                  <option value="100000">Up to 100,000</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Min Engagement Rate (%)
                </label>
                <select
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={formData.targetAudience.minEngagement}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      targetAudience: {
                        ...formData.targetAudience,
                        minEngagement: e.target.value,
                      },
                    })
                  }
                >
                  <option value="">Any</option>
                  <option value="1">1%+</option>
                  <option value="2">2%+</option>
                  <option value="3">3%+</option>
                  <option value="4">4%+</option>
                  <option value="5">5%+</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Platforms
                </label>
                <div className="space-y-2 mt-2">
                  {platforms.map(platform => {
                    const Icon = platformIcons[platform] || Globe2;
                    return (
                      <label
                        key={platform}
                        className="flex items-center p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                      >
                        <input
                          type="checkbox"
                          className="mr-3 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          checked={formData.targetAudience.platforms.includes(platform)}
                          onChange={() => togglePlatform(platform)}
                        />
                        <Icon
                          className={`w-4 h-4 mr-2 ${
                            platform === 'instagram'
                              ? 'text-pink-600'
                              : platform === 'youtube'
                              ? 'text-red-600'
                              : platform === 'tiktok'
                              ? 'text-black'
                              : platform === 'twitter'
                              ? 'text-blue-400'
                              : 'text-blue-600'
                          }`}
                        />
                        <span className="capitalize">{platform}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Niches
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {niches.map(niche => (
                  <label
                    key={niche}
                    className="flex items-center p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                  >
                    <input
                      type="checkbox"
                      className="mr-2 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      checked={formData.targetAudience.niches.includes(niche)}
                      onChange={() => toggleNiche(niche)}
                    />
                    <Hash className="w-3 h-3 text-gray-400 mr-1" />
                    <span className="text-sm">{niche}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Age Groups
              </label>
              <div className="flex flex-wrap gap-3">
                {ageGroups.map(age => (
                  <label
                    key={age}
                    className="flex items-center p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                  >
                    <input
                      type="checkbox"
                      className="mr-2 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      checked={formData.targetAudience.ages.includes(age)}
                      onChange={() => toggleAgeGroup(age)}
                    />
                    <Users2 className="w-3 h-3 text-gray-400 mr-1" />
                    <span className="text-sm">{age}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Genders
              </label>
              <div className="flex flex-wrap gap-3">
                {genders.map(gender => (
                  <label
                    key={gender}
                    className="flex items-center p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                  >
                    <input
                      type="checkbox"
                      className="mr-2 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      checked={formData.targetAudience.genders.includes(gender)}
                      onChange={() => toggleGender(gender)}
                    />
                    <span className="capitalize text-sm">{gender}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Locations
              </label>
              <div className="space-y-2">
                {formData.targetAudience.locations.map((loc, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="flex-1 text-sm">{loc}</span>
                    <button
                      onClick={() => removeLocation(index)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add a location (e.g., New York, USA)"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addLocation()}
                  />
                  <Button variant="outline" onClick={addLocation} icon={Plus}>
                    Add
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Review Your Campaign</h3>

            <div className="bg-gray-50 p-6 rounded-lg space-y-4">
              {/* Basic Info */}
              <div>
                <p className="text-sm text-gray-500">Campaign Title</p>
                <p className="font-medium text-gray-900">{formData.title || 'Not specified'}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Description</p>
                <p className="text-sm text-gray-700">{formData.description || 'Not specified'}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Category</p>
                <p className="font-medium text-gray-900">{formData.category || 'Not specified'}</p>
              </div>

              {formData.objectives.length > 0 && (
                <div>
                  <p className="text-sm text-gray-500">Objectives</p>
                  <ul className="list-disc list-inside text-sm text-gray-700">
                    {formData.objectives.map((obj, i) => (
                      <li key={i}>{obj}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Deliverables */}
              <div>
                <p className="text-sm text-gray-500 mb-2">Deliverables</p>
                {formData.deliverables.map((d, i) => (
                  <div key={i} className="mb-2 p-2 bg-white rounded border border-gray-200">
                    <p className="text-sm font-medium">
                      {d.quantity}x {d.type} on {d.platform}
                    </p>
                    {d.description && <p className="text-xs text-gray-500 mt-1">{d.description}</p>}
                    <p className="text-xs font-medium text-indigo-600 mt-1">${d.budget || 0} each</p>
                  </div>
                ))}
              </div>

              {/* Timeline */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Start Date</p>
                  <p className="font-medium text-gray-900">
                    {formData.startDate ? new Date(formData.startDate).toLocaleDateString() : 'Not set'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">End Date</p>
                  <p className="font-medium text-gray-900">
                    {formData.endDate ? new Date(formData.endDate).toLocaleDateString() : 'Not set'}
                  </p>
                </div>
                {formData.submissionDeadline && (
                  <div>
                    <p className="text-sm text-gray-500">Submission Deadline</p>
                    <p className="font-medium text-gray-900">
                      {new Date(formData.submissionDeadline).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>

              {/* Budget */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Total Budget</p>
                  <p className="text-xl font-bold text-indigo-600">
                    ${formData.budget.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Payment Terms</p>
                  <p className="font-medium capitalize text-gray-900">{formData.paymentTerms}</p>
                </div>
              </div>

              {/* Target Audience */}
              <div>
                <p className="text-sm text-gray-500 mb-2">Target Niches</p>
                <div className="flex flex-wrap gap-2">
                  {formData.targetAudience.niches.length > 0 ? (
                    formData.targetAudience.niches.map(niche => (
                      <span key={niche} className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full text-xs">
                        {niche}
                      </span>
                    ))
                  ) : (
                    <p className="text-gray-400 text-sm">No niches selected</p>
                  )}
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-2">Platforms</p>
                <div className="flex flex-wrap gap-2">
                  {formData.targetAudience.platforms.map(platform => (
                    <span key={platform} className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs capitalize">
                      {platform}
                    </span>
                  ))}
                </div>
              </div>

              {formData.targetAudience.ages.length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Age Groups</p>
                  <div className="flex flex-wrap gap-2">
                    {formData.targetAudience.ages.map(age => (
                      <span key={age} className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs">
                        {age}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {formData.targetAudience.genders.length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Genders</p>
                  <div className="flex flex-wrap gap-2">
                    {formData.targetAudience.genders.map(gender => (
                      <span key={gender} className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs capitalize">
                        {gender}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {formData.targetAudience.locations.length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Locations</p>
                  <div className="flex flex-wrap gap-2">
                    {formData.targetAudience.locations.map(loc => (
                      <span key={loc} className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs">
                        {loc}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Requirements */}
              {formData.requirements.length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Additional Requirements</p>
                  <ul className="list-disc list-inside text-sm text-gray-700">
                    {formData.requirements.map((req, i) => (
                      <li key={i}>{req}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Brand Assets */}
              {formData.brandAssets.length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Brand Assets</p>
                  <div className="space-y-1">
                    {formData.brandAssets.map((asset, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                        <FileText className="w-4 h-4 text-gray-400" />
                        {asset.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> You'll need to fund the escrow account before launching the campaign.
                  </p>
                  <p className="text-sm text-yellow-700 mt-1">
                    Funds are only released after content approval.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm text-blue-800">
                    <strong>Platform Fee:</strong> ${(formData.budget * 0.1).toFixed(2)} (10%)
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    <strong>Total to Fund:</strong> ${formData.budget.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Campaign</h1>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors
                ${
                  currentStep > step.number
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : currentStep === step.number
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-gray-300 text-gray-400'
                }`}
              >
                {currentStep > step.number ? (
                  <CheckCircle className="w-5 h-5 text-white" />
                ) : (
                  <step.icon className="w-5 h-5" />
                )}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`w-20 h-1 mx-2 transition-colors ${
                    currentStep > step.number ? 'bg-indigo-600' : 'bg-gray-300'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2">
          {steps.map(step => (
            <span key={step.number} className="text-xs text-gray-600">
              {step.name}
            </span>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white p-8 rounded-xl shadow-sm mb-6">{renderStepContent()}</div>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <button
          onClick={handlePrev}
          disabled={currentStep === 1}
          className={`px-6 py-3 rounded-lg flex items-center transition-colors ${
            currentStep === 1
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <ChevronLeft className="w-5 h-5 mr-2" />
          Previous
        </button>

        {currentStep === steps.length ? (
          <button
            onClick={handleSubmit}
            disabled={submitting || loading}
            className="px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting || loading ? (
              <>
                <Loader className="w-5 h-5 animate-spin mr-2" />
                Creating...
              </>
            ) : (
              <>
                Launch Campaign
                <ChevronRight className="w-5 h-5 ml-2" />
              </>
            )}
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium flex items-center"
          >
            Next
            <ChevronRight className="w-5 h-5 ml-2" />
          </button>
        )}
      </div>

      {/* Help Text */}
      <div className="mt-6 text-center text-xs text-gray-500">
        <p>All fields marked with <span className="text-red-500">*</span> are required</p>
        <p className="mt-1">You can save as draft and complete later</p>
      </div>
    </div>
  );
};

export default CampaignBuilder;