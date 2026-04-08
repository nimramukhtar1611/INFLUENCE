// components/UI/Table.js - COMPLETE FIXED VERSION
import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Loader,
  Search,
  Filter,
  X
} from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

const Table = ({
  columns = [],
  data = [],
  loading = false,
  pagination,
  onPageChange,
  onSort,
  sortColumn,
  sortDirection,
  onSearch,
  onFilter,
  selectable = false,
  selectedRows = [],
  onRowSelect,
  onSelectAll,
  rowKey = 'id',
  emptyMessage = 'No data found',
  className = '',
  striped = true,
  hoverable = true,
  bordered = false,
  compact = false,
  stickyHeader = false,
  maxHeight
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [localData, setLocalData] = useState(data);
  const [localSort, setLocalSort] = useState({ column: sortColumn, direction: sortDirection });
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({});

  // ==================== UPDATE LOCAL DATA ====================
  useEffect(() => {
    setLocalData(data);
  }, [data]);

  // ==================== HANDLE SORT ====================
  const handleSort = (column) => {
    if (!column.sortable) return;

    let newDirection = 'asc';
    if (localSort.column === column.key) {
      newDirection = localSort.direction === 'asc' ? 'desc' : 'asc';
    }

    setLocalSort({ column: column.key, direction: newDirection });

    if (onSort) {
      onSort(column.key, newDirection);
    } else {
      // Client-side sorting
      const sorted = [...localData].sort((a, b) => {
        const aVal = a[column.key];
        const bVal = b[column.key];
        
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return newDirection === 'asc' ? aVal - bVal : bVal - aVal;
        }
        
        const aStr = String(aVal || '').toLowerCase();
        const bStr = String(bVal || '').toLowerCase();
        
        if (newDirection === 'asc') {
          return aStr.localeCompare(bStr);
        }
        return bStr.localeCompare(aStr);
      });
      
      setLocalData(sorted);
    }
  };

  // ==================== GET SORT ICON ====================
  const getSortIcon = (column) => {
    if (!column.sortable) return null;
    
    if (localSort.column === column.key) {
      return localSort.direction === 'asc' ? 
        <ArrowUp className="w-4 h-4" /> : 
        <ArrowDown className="w-4 h-4" />;
    }
    
    return <ArrowUpDown className="w-4 h-4 opacity-50" />;
  };

  // ==================== HANDLE SEARCH ====================
  const handleSearch = (value) => {
    setSearchTerm(value);
    
    if (onSearch) {
      onSearch(value);
    } else {
      // Client-side search
      const filtered = data.filter(row => {
        return columns.some(col => {
          if (!col.searchable) return false;
          const cellValue = row[col.key];
          return String(cellValue || '').toLowerCase().includes(value.toLowerCase());
        });
      });
      setLocalData(filtered);
    }
  };

  // ==================== HANDLE FILTER ====================
  const handleFilter = (column, value) => {
    const newFilters = { ...filters, [column]: value };
    setFilters(newFilters);
    
    if (onFilter) {
      onFilter(newFilters);
    } else {
      // Client-side filtering
      let filtered = data;
      Object.entries(newFilters).forEach(([key, val]) => {
        if (val) {
          filtered = filtered.filter(row => 
            String(row[key] || '').toLowerCase().includes(String(val).toLowerCase())
          );
        }
      });
      setLocalData(filtered);
    }
  };

  // ==================== CLEAR FILTERS ====================
  const clearFilters = () => {
    setFilters({});
    setSearchTerm('');
    setLocalData(data);
    if (onFilter) onFilter({});
    if (onSearch) onSearch('');
  };

  // ==================== RENDER CELL ====================
  const renderCell = (row, column) => {
    if (column.render) {
      return column.render(row[column.key], row);
    }
    return row[column.key];
  };

  // ==================== TABLE CLASSES ====================
  const tableClasses = [
    'min-w-full divide-y',
    isDark ? 'divide-gray-700' : 'divide-gray-200',
    bordered ? (isDark ? 'border border-gray-700' : 'border border-gray-200') : '',
    className
  ].join(' ');

  const headerClasses = [
    isDark ? 'bg-gray-800' : 'bg-gray-50'
  ].join(' ');

  const rowClasses = (index) => [
    hoverable ? (isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50') : '',
    striped && index % 2 === 1 ? (isDark ? 'bg-gray-800' : 'bg-gray-50') : (isDark ? 'bg-gray-900' : 'bg-white'),
    'transition-colors'
  ].join(' ');

  const cellClasses = (column) => [
    'px-6 py-4 whitespace-nowrap',
    column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left',
    compact ? 'py-2' : 'py-4',
    column.className || ''
  ].join(' ');

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      {(onSearch || onFilter) && (
        <div className="flex flex-wrap gap-4 items-center justify-between">
          {onSearch && (
            <div className="relative flex-1 max-w-md">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                isDark ? 'text-gray-500' : 'text-gray-400'
              }`} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search..."
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#667eea] ${
                  isDark 
                    ? 'bg-gray-800 border-gray-600 text-gray-100 placeholder:text-gray-500'
                    : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400'
                }`}
              />
              {searchTerm && (
                <button
                  onClick={() => handleSearch('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
          
          {(Object.keys(filters).length > 0 || searchTerm) && (
            <button
              onClick={clearFilters}
              className={`text-sm flex items-center gap-1 ${
                isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <X className="w-4 h-4" />
              Clear Filters
            </button>
          )}
        </div>
      )}

      {/* Table Container */}
      <div 
        className={`overflow-x-auto rounded-lg border ${
          isDark ? 'border-gray-700' : 'border-gray-200'
        }`}
        style={{ maxHeight: maxHeight }}
      >
        <table className={tableClasses}>
          {/* Header */}
          <thead className={headerClasses}>
            <tr>
              {selectable && (
                <th className="px-6 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={selectedRows.length === data.length && data.length > 0}
                    onChange={onSelectAll}
                    className="rounded border-gray-300 text-[#667eea] focus:ring-[#667eea]"
                  />
                </th>
              )}
              
              {columns.map((column) => (
                <th
                  key={column.key}
                  onClick={() => handleSort(column)}
                  className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    isDark ? 'text-gray-400' : 'text-gray-500'
                  } ${
                    column.sortable ? (isDark ? 'cursor-pointer hover:bg-gray-700' : 'cursor-pointer hover:bg-gray-100') : ''
                  } ${
                    column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : ''
                  } ${
                    column.width ? `w-${column.width}` : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {column.title}
                    {getSortIcon(column)}
                  </div>
                  
                  {/* Column Filter */}
                  {column.filterable && (
                    <input
                      type="text"
                      value={filters[column.key] || ''}
                      onChange={(e) => handleFilter(column.key, e.target.value)}
                      placeholder={`Filter ${column.title}`}
                      className={`mt-2 w-full px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-[#667eea] ${
                        isDark ? 'bg-gray-800 border-gray-600 text-gray-200' : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody className={`${isDark ? 'bg-gray-900' : 'bg-white'} divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
            {loading ? (
              <tr>
                <td 
                  colSpan={columns.length + (selectable ? 1 : 0)} 
                  className="px-6 py-12 text-center"
                >
                  <div className="flex items-center justify-center gap-2 text-gray-500">
                    <Loader className="w-5 h-5 animate-spin" />
                    Loading...
                  </div>
                </td>
              </tr>
            ) : localData.length === 0 ? (
              <tr>
                <td 
                  colSpan={columns.length + (selectable ? 1 : 0)} 
                  className="px-6 py-12 text-center text-gray-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              localData.map((row, index) => (
                <tr 
                  key={row[rowKey] || index} 
                  className={rowClasses(index)}
                  onClick={() => onRowSelect?.(row)}
                >
                  {selectable && (
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedRows.includes(row[rowKey])}
                        onChange={() => onRowSelect?.(row)}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded border-gray-300 text-[#667eea] focus:ring-[#667eea]"
                      />
                    </td>
                  )}
                  
                  {columns.map((column) => (
                    <td key={column.key} className={cellClasses(column)}>
                      {renderCell(row, column)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className={`flex items-center justify-between px-4 py-3 border-t sm:px-6 ${
          isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Showing <span className="font-medium">{pagination.from}</span> to{' '}
                <span className="font-medium">{pagination.to}</span> of{' '}
                <span className="font-medium">{pagination.total}</span> results
              </p>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => onPageChange(1)}
                disabled={pagination.currentPage === 1}
                className={`p-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                  isDark ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-50'
                }`}
                title="First Page"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => onPageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1}
                className={`p-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                  isDark ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-50'
                }`}
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <span className={`px-4 py-2 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Page {pagination.currentPage} of {pagination.totalPages}
              </span>
              
              <button
                onClick={() => onPageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.totalPages}
                className={`p-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                  isDark ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-50'
                }`}
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => onPageChange(pagination.totalPages)}
                disabled={pagination.currentPage === pagination.totalPages}
                className={`p-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                  isDark ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-50'
                }`}
                title="Last Page"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Table;