
import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Search, Filter, MoreHorizontal } from 'lucide-react';
import { Button } from './button';
import { Input } from './input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './dropdown-menu';
import { Badge } from './badge';
import { cn } from '@/lib/utils';

export interface Column<T> {
  key: keyof T;
  header: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, item: T) => React.ReactNode;
  width?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  error?: string;
  searchable?: boolean;
  filterable?: boolean;
  pagination?: boolean;
  pageSize?: number;
  onRowClick?: (item: T) => void;
  onRowSelect?: (selectedItems: T[]) => void;
  selectable?: boolean;
  emptyMessage?: string;
  className?: string;
  actions?: (item: T) => React.ReactNode;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  error,
  searchable = true,
  filterable = true,
  pagination = true,
  pageSize = 10,
  onRowClick,
  onRowSelect,
  selectable = false,
  emptyMessage = 'No data available',
  className,
  actions
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{
    key: keyof T | null;
    direction: 'asc' | 'desc';
  }>({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItems, setSelectedItems] = useState<T[]>([]);
  const [filters, setFilters] = useState<Record<string, string>>({});

  const filteredAndSortedData = useMemo(() => {
    let result = [...data];

    // Apply search filter
    if (searchTerm) {
      result = result.filter(item =>
        Object.values(item).some(value =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Apply column filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        result = result.filter(item =>
          String(item[key]).toLowerCase().includes(value.toLowerCase())
        );
      }
    });

    // Apply sorting
    if (sortConfig.key) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key!];
        const bVal = b[sortConfig.key!];
        
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, searchTerm, sortConfig, filters]);

  const paginatedData = useMemo(() => {
    if (!pagination) return filteredAndSortedData;
    
    const startIndex = (currentPage - 1) * pageSize;
    return filteredAndSortedData.slice(startIndex, startIndex + pageSize);
  }, [filteredAndSortedData, currentPage, pageSize, pagination]);

  const totalPages = Math.ceil(filteredAndSortedData.length / pageSize);

  const handleSort = (key: keyof T) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleSelectItem = (item: T, checked: boolean) => {
    const newSelected = checked
      ? [...selectedItems, item]
      : selectedItems.filter(selected => selected !== item);
    
    setSelectedItems(newSelected);
    onRowSelect?.(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    const newSelected = checked ? [...paginatedData] : [];
    setSelectedItems(newSelected);
    onRowSelect?.(newSelected);
  };

  if (error) {
    return (
      <div className="p-4 text-center text-red-600 dark:text-red-400">
        Error: {error}
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search and Filters */}
      {(searchable || filterable) && (
        <div className="flex flex-col sm:flex-row gap-4">
          {searchable && (
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          )}
          {filterable && (
            <div className="flex gap-2">
              {columns.filter(col => col.filterable).map(column => (
                <div key={String(column.key)} className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder={`Filter ${column.header}`}
                    value={filters[String(column.key)] || ''}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      [String(column.key)]: e.target.value
                    }))}
                    className="pl-10 w-40"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                {selectable && (
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedItems.length === paginatedData.length && paginatedData.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                  </th>
                )}
                {columns.map(column => (
                  <th
                    key={String(column.key)}
                    className={cn(
                      'px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider',
                      column.sortable && 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700'
                    )}
                    style={{ width: column.width }}
                    onClick={() => column.sortable && handleSort(column.key)}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{column.header}</span>
                      {column.sortable && sortConfig.key === column.key && (
                        sortConfig.direction === 'asc' ? 
                        <ChevronUp className="h-4 w-4" /> : 
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </th>
                ))}
                {actions && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={columns.length + (selectable ? 1 : 0) + (actions ? 1 : 0)} className="px-4 py-8 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      <span className="ml-2">Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (selectable ? 1 : 0) + (actions ? 1 : 0)} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                paginatedData.map((item, index) => (
                  <tr
                    key={index}
                    className={cn(
                      'hover:bg-gray-50 dark:hover:bg-gray-800',
                      onRowClick && 'cursor-pointer'
                    )}
                    onClick={() => onRowClick?.(item)}
                  >
                    {selectable && (
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(item)}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleSelectItem(item, e.target.checked);
                          }}
                          className="rounded border-gray-300"
                        />
                      </td>
                    )}
                    {columns.map(column => (
                      <td key={String(column.key)} className="px-4 py-4 text-sm text-gray-900 dark:text-gray-100">
                        {column.render ? column.render(item[column.key], item) : String(item[column.key] || '')}
                      </td>
                    ))}
                    {actions && (
                      <td className="px-4 py-4 text-sm">
                        <div onClick={(e) => e.stopPropagation()}>
                          {actions(item)}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredAndSortedData.length)} of {filteredAndSortedData.length} results
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }

              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
