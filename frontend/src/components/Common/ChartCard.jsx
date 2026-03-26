// components/Common/ChartCard.js - COMPLETE FIXED VERSION
import React, { useRef, useState } from 'react';
import {
  MoreVertical,
  Download,
  Maximize2,
  Minimize2,
  RefreshCw,
  Image as ImageIcon,
  FileText,
  PieChart,
  BarChart3,
  LineChart,
  Copy,
  Check,
  Calendar,
  Filter
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

const ChartCard = ({
  title,
  children,
  height = 300,
  actions,
  onDownload,
  onRefresh,
  onExpand,
  onFilter,
  showExport = true,
  dateRange,
  chartType,
  onChartTypeChange,
  data,
  loading = false,
  className = '',
  headerClassName = '',
  bodyClassName = ''
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const chartRef = useRef(null);

  // ==================== CHART TYPES ====================
  const chartTypes = [
    { value: 'line', label: 'Line Chart', icon: LineChart },
    { value: 'bar', label: 'Bar Chart', icon: BarChart3 },
    { value: 'pie', label: 'Pie Chart', icon: PieChart }
  ];

  // ==================== EXPORT AS PNG ====================
  const exportAsPNG = async () => {
    if (!chartRef.current) return;

    setExporting(true);
    try {
      const canvas = await html2canvas(chartRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        allowTaint: true,
        useCORS: true
      });

      const link = document.createElement('a');
      link.download = `${title.toLowerCase().replace(/\s+/g, '-')}-chart.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error exporting PNG:', error);
    } finally {
      setExporting(false);
      setShowMenu(false);
    }
  };

  // ==================== EXPORT AS PDF ====================
  const exportAsPDF = async () => {
    if (!chartRef.current) return;

    setExporting(true);
    try {
      const canvas = await html2canvas(chartRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width * 0.75, canvas.height * 0.75]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width * 0.75, canvas.height * 0.75);
      pdf.save(`${title.toLowerCase().replace(/\s+/g, '-')}-chart.pdf`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
    } finally {
      setExporting(false);
      setShowMenu(false);
    }
  };

  // ==================== EXPORT AS CSV ====================
  const exportAsCSV = () => {
    if (!data || !data.length) {
      console.warn('No data to export as CSV');
      setShowMenu(false);
      return;
    }

    setExporting(true);
    try {
      // Convert data to CSV
      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(h => JSON.stringify(row[h] || '')).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const link = document.createElement('a');
      link.download = `${title.toLowerCase().replace(/\s+/g, '-')}-data.csv`;
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error('Error exporting CSV:', error);
    } finally {
      setExporting(false);
      setShowMenu(false);
    }
  };

  // ==================== EXPORT AS EXCEL ====================
  const exportAsExcel = () => {
    if (!data || !data.length) {
      console.warn('No data to export as Excel');
      setShowMenu(false);
      return;
    }

    setExporting(true);
    try {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Data');
      XLSX.writeFile(wb, `${title.toLowerCase().replace(/\s+/g, '-')}-data.xlsx`);
    } catch (error) {
      console.error('Error exporting Excel:', error);
    } finally {
      setExporting(false);
      setShowMenu(false);
    }
  };

  // ==================== COPY AS JSON ====================
  const copyAsJSON = () => {
    if (!data || !data.length) {
      console.warn('No data to copy as JSON');
      setShowMenu(false);
      return;
    }

    try {
      const jsonStr = JSON.stringify(data, null, 2);
      navigator.clipboard.writeText(jsonStr);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying JSON:', error);
    } finally {
      setShowMenu(false);
    }
  };

  // ==================== HANDLE EXPAND ====================
  const handleExpand = () => {
    setIsExpanded(!isExpanded);
    if (onExpand) onExpand(!isExpanded);
    setShowMenu(false);
  };

  // ==================== LOADING STATE ====================
  if (loading) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className={`h-${height} bg-gray-200 rounded`}></div>
      </div>
    );
  }

  return (
    <div
      className={`bg-white rounded-xl shadow-sm overflow-hidden transition-all ${
        isExpanded ? 'fixed inset-4 z-50 overflow-auto' : ''
      } ${className}`}
      style={isExpanded ? { height: 'auto' } : {}}
    >
      {/* Header */}
      <div
        className={`px-6 py-4 border-b border-gray-200 flex items-center justify-between ${headerClassName}`}
      >
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>

          {/* Chart Type Switcher */}
          {chartType && onChartTypeChange && (
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              {chartTypes.map(type => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.value}
                    onClick={() => onChartTypeChange(type.value)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      chartType === type.value
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                    title={type.label}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Date Range */}
          {dateRange && (
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>{dateRange}</span>
            </div>
          )}

          {/* Filter Button */}
          {onFilter && (
            <button
              onClick={onFilter}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              title="Filter"
            >
              <Filter className="w-4 h-4 text-gray-500" />
            </button>
          )}

          {/* Refresh Button */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4 text-gray-500" />
            </button>
          )}

          {/* Expand Button */}
          <button
            onClick={handleExpand}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            title={isExpanded ? 'Minimize' : 'Expand'}
          >
            {isExpanded ? (
              <Minimize2 className="w-4 h-4 text-gray-500" />
            ) : (
              <Maximize2 className="w-4 h-4 text-gray-500" />
            )}
          </button>

          {showExport && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                title="Export"
              >
                <Download className="w-4 h-4 text-gray-500" />
              </button>

              {showMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                  <button
                    onClick={exportAsPNG}
                    disabled={exporting}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50"
                  >
                    <ImageIcon className="w-4 h-4" />
                    Export as PNG
                  </button>

                  <button
                    onClick={exportAsPDF}
                    disabled={exporting}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50"
                  >
                    <FileText className="w-4 h-4" />
                    Export as PDF
                  </button>

                  {data && data.length > 0 && (
                    <>
                      <div className="border-t border-gray-200 my-1"></div>

                      <button
                        onClick={exportAsCSV}
                        disabled={exporting}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50"
                      >
                        <FileText className="w-4 h-4" />
                        Export as CSV
                      </button>

                      <button
                        onClick={exportAsExcel}
                        disabled={exporting}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50"
                      >
                        <FileText className="w-4 h-4" />
                        Export as Excel
                      </button>

                      <button
                        onClick={copyAsJSON}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                      >
                        {copied ? (
                          <>
                            <Check className="w-4 h-4 text-green-600" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            Copy as JSON
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Custom Actions */}
          {actions}
        </div>
      </div>

      {/* Chart Body */}
      <div
        ref={chartRef}
        className={`p-6 ${bodyClassName}`}
        style={!isExpanded ? { height } : { minHeight: height }}
      >
        {children}
      </div>

      {/* Footer for expanded view */}
      {isExpanded && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleExpand}
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            Minimize
          </button>
        </div>
      )}
    </div>
  );
};

export default ChartCard;