import React, { useMemo, useState } from 'react';
import { Download, FileText, RefreshCw, PlusCircle, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../components/UI/Button';
import Loader from '../../components/Common/Loader';
import { useAdminData } from '../../hooks/useAdminData';
import { useTheme } from '../../hooks/useTheme';
import adminService from '../../services/adminService';
import { formatDate, timeAgo } from '../../utils/helpers';
import { getStatusColor, getStatusIconColor } from '../../utils/colorScheme';

const REPORT_TYPES = [
  { value: 'revenue', label: 'Revenue' },
  { value: 'users', label: 'Users' },
  { value: 'campaigns', label: 'Campaigns' },
  { value: 'deals', label: 'Deals' },
  { value: 'payments', label: 'Payments' },
  { value: 'creators', label: 'Creators' },
  { value: 'brands', label: 'Brands' },
  { value: 'engagement', label: 'Engagement' }
];

const FORMAT_EXT = {
  pdf: 'pdf',
  csv: 'csv',
  excel: 'xlsx',
  json: 'json',
};

const Reports = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { reports, loading, refreshData } = useAdminData();
  const [reportType, setReportType] = useState('revenue');
  const [format, setFormat] = useState('pdf');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadingId, setDownloadingId] = useState('');

  const filteredReports = useMemo(() => {
    if (statusFilter === 'all') return reports;
    return reports.filter((report) => report.status === statusFilter);
  }, [reports, statusFilter]);

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);

      const dateRange = {};
      if (startDate) dateRange.start = startDate;
      if (endDate) dateRange.end = endDate;

      await adminService.generateReport(
        reportType,
        Object.keys(dateRange).length > 0 ? dateRange : undefined,
        format
      );

      toast.success('Report generation started');
      await refreshData();
    } catch (error) {
      toast.error(error?.error || error?.message || 'Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async (report) => {
    const reportId = report?._id || report?.id;
    if (!reportId) {
      toast.error('Report ID is missing');
      return;
    }

    try {
      setDownloadingId(reportId);
      const response = await adminService.downloadReport(reportId, report.format || 'pdf');
      const ext = FORMAT_EXT[report.format] || 'pdf';
      const blob = response instanceof Blob ? response : new Blob([response]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = report.filename || `${report.type || 'report'}-${reportId}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error?.error || error?.message || 'Failed to download report');
    } finally {
      setDownloadingId('');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader size="large" color="purple" />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${isDark ? 'bg-gray-900' : 'bg-slate-100'}`}>
      {/* Header */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-xl ${isDark ? 'bg-gray-900/90 backdrop-blur-sm border border-gray-700/50 shadow-sm' : 'bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-sm'}`}>
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Reports</h1>
          <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>Generate and download admin reports</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" icon={RefreshCw} onClick={refreshData}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Generate New Report</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            {REPORT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>

          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="pdf">PDF</option>
            <option value="csv">CSV</option>
            <option value="excel">Excel</option>
            <option value="json">JSON</option>
          </select>

          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          />

          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          />

          <Button
            variant="primary"
            icon={PlusCircle}
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? 'Generating...' : 'Generate'}
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Generated Reports</h2>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="generating">Generating</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Report</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requested By</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredReports.length > 0 ? (
                filteredReports.map((report) => {
                  const reportId = report._id || report.id;
                  const status = report.status || 'pending';
                  const statusClass = getStatusColor(status, 'status');
                  
                  const getStatusIcon = (status) => {
                    switch(status?.toLowerCase()) {
                      case 'completed': return CheckCircle;
                      case 'failed': return XCircle;
                      default: return AlertCircle;
                    }
                  };
                  
                  const StatusIcon = getStatusIcon(status);
                  const iconColor = getStatusIconColor(status);
                  
                  return (
                    <tr key={reportId} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{report.name || 'Untitled Report'}</p>
                        <p className="text-xs text-gray-500">Format: {(report.format || 'json').toUpperCase()}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 capitalize">{report.type || 'unknown'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full inline-flex items-center gap-1 ${statusClass}`}>
                          <StatusIcon className={`w-3 h-3 ${iconColor}`} />
                          {status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {report.userId?.fullName || report.userId?.email || 'Admin'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <p>{formatDate(report.createdAt)}</p>
                        <p className="text-xs text-gray-400">{timeAgo(report.createdAt)}</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {report.status === 'completed' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            icon={Download}
                            onClick={() => handleDownload(report)}
                            disabled={downloadingId === reportId}
                          >
                            {downloadingId === reportId ? 'Downloading...' : 'Download'}
                          </Button>
                        ) : (
                          <span className="text-xs text-gray-500 inline-flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            Not ready
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="px-4 py-10 text-center text-gray-500">
                    No reports found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;