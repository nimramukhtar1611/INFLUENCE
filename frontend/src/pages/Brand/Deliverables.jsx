// pages/Brand/Deliverables.js - COMPLETE FINAL VERSION
// Now uses POST /deals/:id/deliverables (real backend route)
// Files uploaded first, then submitted with deliverable IDs
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Upload, FileText, Image, Video, Link2, CheckCircle,
  AlertCircle, Clock, Send, X, ArrowLeft, Loader, Plus, ThumbsUp
} from 'lucide-react';
import dealService from '../../services/dealService';
import { formatNumber, formatCurrency, formatDate, timeAgo } from '../../utils/helpers';
import { getStatusColor } from '../../utils/colorScheme';
import Button from '../../components/UI/Button';
import toast from 'react-hot-toast';

const Deliverables = () => {
  const { dealId } = useParams();
  const navigate   = useNavigate();

  const [loading,    setLoading]    = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deal,       setDeal]       = useState(null);

  // Per-deliverable submission state: { [deliverableId]: { files: File[], links: string[], notes: string } }
  const [submissions, setSubmissions] = useState({});

  // ==================== FETCH DEAL ====================
  useEffect(() => {
    if (!dealId) return;
    const load = async () => {
      try {
        setLoading(true);
        const res = await dealService.getDeal(dealId);
        if (res?.success) {
          setDeal(res.deal);
          // Initialise submission state for each pending/revision deliverable
          const initial = {};
          res.deal.deliverables?.forEach(d => {
            if (['pending', 'revision', 'in-progress'].includes(d.status)) {
              initial[d._id] = { files: [], links: [''], uploading: false, uploadedFiles: [] };
            }
          });
          setSubmissions(initial);
        } else {
          toast.error('Failed to load deal');
          navigate(-1);
        }
      } catch (e) {
        toast.error('Failed to load deal');
        navigate(-1);
      } finally { setLoading(false); }
    };
    load();
  }, [dealId]);

  // ==================== PER-DELIVERABLE HELPERS ====================
  const updateSub = (deliverableId, patch) =>
    setSubmissions(prev => ({ ...prev, [deliverableId]: { ...prev[deliverableId], ...patch } }));

  const addLink    = (id)     => updateSub(id, { links: [...(submissions[id]?.links || ['']), ''] });
  const updateLink = (id, i, v) => {
    const links = [...(submissions[id]?.links || [''])];
    links[i] = v;
    updateSub(id, { links });
  };
  const removeLink = (id, i)  => updateSub(id, { links: (submissions[id]?.links || []).filter((_, idx) => idx !== i) });

  const handleFileChange = (deliverableId, e) => {
    const newFiles = Array.from(e.target.files).filter(f => {
      if (f.size > 100 * 1024 * 1024) { toast.error(`${f.name} exceeds 100MB`); return false; }
      return true;
    });
    updateSub(deliverableId, { files: [...(submissions[deliverableId]?.files || []), ...newFiles] });
  };

  const removeFile = (deliverableId, i) =>
    updateSub(deliverableId, { files: (submissions[deliverableId]?.files || []).filter((_, idx) => idx !== i) });

  // ==================== SUBMIT ALL ====================
  const handleSubmit = async () => {
    const deliverablesToSubmit = [];

    for (const [deliverableId, sub] of Object.entries(submissions)) {
      const validLinks = (sub.links || []).filter(l => l.trim());
      if (sub.files.length === 0 && validLinks.length === 0) continue;

      // Upload files first
      let uploadedFiles = [];
      if (sub.files.length > 0) {
        updateSub(deliverableId, { uploading: true });
        const formData = new FormData();
        sub.files.forEach(f => formData.append('files', f));
        const uploadRes = await dealService.uploadAttachments(formData);
        updateSub(deliverableId, { uploading: false });

        if (uploadRes?.success) {
          uploadedFiles = uploadRes.files || uploadRes.data || [];
        } else {
          toast.error(`Upload failed for deliverable`);
          return;
        }
      }

      deliverablesToSubmit.push({
        deliverableId,
        files: uploadedFiles,
        links: validLinks
      });
    }

    if (deliverablesToSubmit.length === 0) {
      toast.error('Please add files or links for at least one deliverable');
      return;
    }

    try {
      setSubmitting(true);
      // POST /deals/:id/deliverables ✅ real backend route
      const res = await dealService.submitDeliverables(dealId, deliverablesToSubmit);
      if (res?.success) {
        toast.success('Deliverables submitted successfully!');
        navigate(`/creator/deals/${dealId}`);
      } else {
        toast.error(res?.error || 'Failed to submit');
      }
    } catch (e) {
      toast.error('Failed to submit deliverables');
    } finally { setSubmitting(false); }
  };

  // ==================== STATUS HELPERS ====================
  const statusColor = (s) => {
    return getStatusColor(s, 'deliverable', false); // Brand Deliverables doesn't use theme yet
  };

  const statusIcon = (s) => ({
    approved:    <CheckCircle className="w-5 h-5 text-green-600" />,
    submitted:   <Clock       className="w-5 h-5 text-blue-600" />,
    'in-progress':<AlertCircle className="w-5 h-5 text-purple-600" />,
    revision:    <AlertCircle className="w-5 h-5 text-orange-600" />,
    pending:     <Clock       className="w-5 h-5 text-yellow-600" />
  }[s] || <Clock className="w-5 h-5 text-gray-400" />);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader className="w-12 h-12 animate-spin text-indigo-600" />
    </div>
  );
  if (!deal) return null;

  const completed = deal.deliverables?.filter(d => d.status === 'approved').length || 0;
  const total     = deal.deliverables?.length || 0;
  const progress  = total > 0 ? Math.round((completed / total) * 100) : 0;
  const canSubmit = Object.values(submissions).some(s => s.files.length > 0 || (s.links || []).some(l => l.trim()));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to={`/creator/deals/${dealId}`} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Submit Deliverables</h1>
          <p className="text-gray-600">{deal.brandId?.brandName} — {deal.campaignId?.title}</p>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-gray-900">Progress</h2>
          <span className="text-sm text-gray-600">{completed}/{total} approved</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-gradient-to-r from-[#667eea] to-[#764ba2] h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>Deadline: {deal.deadline ? formatDate(deal.deadline) : 'No deadline'}</span>
          <span className={`px-2 py-0.5 rounded-full capitalize ${statusColor(deal.status)}`}>{deal.status}</span>
        </div>
      </div>

      {/* Deliverables */}
      {deal.deliverables?.map((d, i) => (
        <div key={d._id || i} className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* Header */}
          <div className="p-5 flex items-start justify-between border-b border-gray-100">
            <div className="flex items-start gap-3">
              {statusIcon(d.status)}
              <div>
                <h3 className="font-semibold text-gray-900 capitalize">
                  {d.quantity > 1 ? `${d.quantity}x ` : ''}{d.type} — {d.platform}
                </h3>
                {d.description && <p className="text-sm text-gray-600 mt-0.5">{d.description}</p>}
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor(d.status || 'pending')}`}>
              {d.status || 'pending'}
            </span>
          </div>

          {/* Requirements */}
          {d.requirements && (
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">Requirements</p>
              <p className="text-sm text-gray-700">{d.requirements}</p>
            </div>
          )}

          {/* Revision notes */}
          {d.revisionNotes && (
            <div className="px-5 py-3 bg-orange-50 border-b border-orange-100">
              <p className="text-xs font-medium text-orange-600 uppercase mb-1">Revision Requested</p>
              <p className="text-sm text-orange-800">{d.revisionNotes}</p>
            </div>
          )}

          {/* Previously submitted files */}
          {d.files?.length > 0 && (
            <div className="px-5 py-3 border-b border-gray-100">
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">Previously Submitted</p>
              <div className="flex flex-wrap gap-2">
                {d.files.map((f, fi) => (
                  <a key={fi} href={f.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-2 py-1 rounded">
                    <FileText className="w-3 h-3" />{f.filename || 'File'}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Feedback / approval */}
          {d.feedback && (
            <div className="px-5 py-3 bg-green-50 border-b border-green-100">
              <p className="text-xs font-medium text-green-700 uppercase mb-1">Feedback</p>
              <p className="text-sm text-green-800">{d.feedback}</p>
            </div>
          )}

          {/* Submission form — only for pending/revision deliverables */}
          {submissions[d._id] && (
            <div className="p-5 space-y-4">
              <p className="text-sm font-medium text-gray-700">
                {d.status === 'revision' ? 'Submit Revised Work' : 'Submit Your Work'}
              </p>

              {/* File upload */}
              <div>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-indigo-500 transition-colors">
                  <input type="file" multiple
                    onChange={e => handleFileChange(d._id, e)}
                    className="hidden" id={`file-${d._id}`}
                    accept="image/*,video/*,.pdf,.doc,.docx" />
                  <label htmlFor={`file-${d._id}`} className="cursor-pointer">
                    {submissions[d._id].uploading ? (
                      <Loader className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
                    ) : (
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    )}
                    <p className="text-sm text-gray-600">
                      <span className="text-indigo-600 font-medium">Browse</span> or drag & drop
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Images, Videos, PDF (max 100MB)</p>
                  </label>
                </div>
                {submissions[d._id].files.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {submissions[d._id].files.map((f, fi) => (
                      <div key={fi} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          {f.type.startsWith('image/') ? <Image className="w-4 h-4 text-blue-500" /> :
                           f.type.startsWith('video/') ? <Video className="w-4 h-4 text-purple-500" /> :
                                                         <FileText className="w-4 h-4 text-gray-500" />}
                          <span className="truncate max-w-xs">{f.name}</span>
                          <span className="text-xs text-gray-400">({(f.size / 1024 / 1024).toFixed(1)} MB)</span>
                        </div>
                        <button onClick={() => removeFile(d._id, fi)} className="text-gray-400 hover:text-red-500">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Links */}
              <div>
                <p className="text-sm text-gray-600 mb-2">Add post/content links</p>
                {(submissions[d._id].links || ['']).map((link, li) => (
                  <div key={li} className="flex gap-2 mb-2">
                    <div className="relative flex-1">
                      <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input type="url" value={link}
                        onChange={e => updateLink(d._id, li, e.target.value)}
                        placeholder="https://instagram.com/p/..."
                        className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    {(submissions[d._id].links || []).length > 1 && (
                      <button onClick={() => removeLink(d._id, li)} className="p-2 text-gray-400 hover:text-red-500">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button onClick={() => addLink(d._id)} className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                  <Plus className="w-4 h-4" /> Add another link
                </button>
              </div>
            </div>
          )}

          {/* Already approved badge */}
          {d.status === 'approved' && (
            <div className="px-5 py-3 flex items-center gap-2 text-green-700">
              <ThumbsUp className="w-4 h-4" />
              <span className="text-sm font-medium">Approved {d.approvedAt ? `on ${formatDate(d.approvedAt)}` : ''}</span>
            </div>
          )}
        </div>
      ))}

      {/* Brand Assets */}
      {deal.campaignId?.brandAssets?.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-3">Brand Assets</h2>
          <div className="space-y-2">
            {deal.campaignId.brandAssets.map((asset, i) => (
              <a key={i} href={asset.fileUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{asset.name}</p>
                    {asset.fileSize && <p className="text-xs text-gray-500">{(asset.fileSize / 1024 / 1024).toFixed(1)} MB</p>}
                  </div>
                </div>
                <span className="text-indigo-600 text-sm font-medium">Download</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Submit button */}
      <div className="flex justify-end gap-4">
        <Button variant="secondary" onClick={() => navigate(`/creator/deals/${dealId}`)}>Cancel</Button>
        <Button variant="primary" icon={Send} onClick={handleSubmit}
          loading={submitting} disabled={!canSubmit}>
          Submit Deliverables
        </Button>
      </div>

      {/* Guidelines */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-medium text-blue-800 mb-2">Submission Guidelines</h3>
        <ul className="space-y-1 text-sm text-blue-700">
          <li>• Make sure content meets all brand requirements listed above</li>
          <li>• Upload high-resolution images and videos</li>
          <li>• Include all required hashtags and mentions before linking</li>
          <li>• Submit before the deadline to avoid delays</li>
        </ul>
      </div>
    </div>
  );
};

export default Deliverables;