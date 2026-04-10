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

      <div className={`p-3 sm:p-4 lg:p-6 rounded-xl shadow-sm space-y-4 ${isDark ? 'bg-gray-900/90 border border-gray-700/50' : 'bg-white border-gray-200/50'}`}>
        <h2 className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Generate New Report</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className={`px-3 py-2 border rounded-lg text-sm ${
              isDark 
                ? 'bg-gray-800/50 border-gray-700/50 text-gray-100'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            {REPORT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>

          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className={`px-3 py-2 border rounded-lg text-sm ${
              isDark 
                ? 'bg-gray-800/50 border-gray-700/50 text-gray-100'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
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
            className={`px-3 py-2 border rounded-lg text-sm ${
              isDark 
                ? 'bg-gray-800/50 border-gray-700/50 text-gray-100'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          />

          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={`px-3 py-2 border rounded-lg text-sm ${
              isDark 
                ? 'bg-gray-800/50 border-gray-700/50 text-gray-100'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          />

          <Button
            variant="primary"
            icon={PlusCircle}
            onClick={handleGenerate}
            disabled={isGenerating}
            className="text-sm"
          >
            <span className="hidden sm:inline">{isGenerating ? 'Generating...' : 'Generate'}</span>
            <span className="sm:hidden">{isGenerating ? '...' : 'Gen'}</span>
          </Button>
        </div>
      </div>

      <div className={`p-3 sm:p-4 lg:p-6 rounded-xl shadow-sm space-y-4 ${isDark ? 'bg-gray-900/90 border border-gray-700/50' : 'bg-white border-gray-200/50'}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Generated Reports</h2>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`px-3 py-2 border rounded-lg text-sm ${
              isDark 
                ? 'bg-gray-800/50 border-gray-700/50 text-gray-100'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="generating">Generating</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className={`min-w-full divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
            <thead className={isDark ? 'bg-gray-800' : 'bg-gray-50'}>
              <tr>
                <th className={`px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'} min-w-[120px] sm:min-w-[200px]`}>Report</th>
                <th className={`hidden sm:table-cell px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'} min-w-[80px]`}>Type</th>
                <th className={`px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'} min-w-[80px]`}>Status</th>
                <th className={`hidden md:table-cell px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'} min-w-[80px]`}>Requested By</th>
                <th className={`hidden lg:table-cell px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'} min-w-[80px]`}>Created</th>
                <th className={`px-2 sm:px-4 py-2 sm:py-3 text-right text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'} min-w-[80px]`}>Actions</th>
              </tr>
            </thead>
            <tbody className={`${isDark ? 'bg-gray-900' : 'bg-white'} divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
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
                    <tr key={reportId} className={`${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}`}>
                      <td className="px-2 sm:px-4 py-2 sm:py-3">
                        <p className={`text-xs sm:text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'} truncate max-w-[100px] sm:max-w-[200px]`}>{report.name || 'Untitled Report'}</p>
                        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} truncate max-w-[100px] sm:max-w-[200px]`}>Format: {(report.format || 'json').toUpperCase()}</p>
                      </td>
                      <td className={`hidden sm:table-cell px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'} capitalize`}>{report.type || 'unknown'}</td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3">
                        <span className={`px-1 sm:px-2 py-1 text-xs rounded-full inline-flex items-center gap-1 ${statusClass}`}>
                          <StatusIcon className={`w-2 h-2 sm:w-3 sm:h-3 ${iconColor}`} />
                          <span className="hidden sm:inline">{status}</span>
                          <span className="sm:hidden">{status === 'completed' ? '✓' : status === 'failed' ? '✗' : '⏳'}</span>
                        </span>
                      </td>
                      <td className={`hidden md:table-cell px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        {report.userId?.fullName || report.userId?.email || 'Admin'}
                      </td>
                      <td className={`hidden lg:table-cell px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        <p>{formatDate(report.createdAt)}</p>
                        <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{timeAgo(report.createdAt)}</p>
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-right">
                        {report.status === 'completed' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            icon={Download}
                            onClick={() => handleDownload(report)}
                            disabled={downloadingId === reportId}
                            className="text-xs sm:text-sm"
                          >
                            <span className="hidden sm:inline">{downloadingId === reportId ? 'Downloading...' : 'Download'}</span>
                            <span className="sm:hidden">{downloadingId === reportId ? '...' : '⬇'}</span>
                          </Button>
                        ) : (
                          <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} inline-flex items-center gap-1`}>
                            <FileText className="w-2 h-2 sm:w-3 sm:h-3" />
                            <span className="hidden sm:inline">Not ready</span>
                            <span className="sm:hidden">—</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className={`px-2 sm:px-4 py-8 sm:py-10 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
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