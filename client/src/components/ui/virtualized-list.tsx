
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card } from './card';
import { Skeleton } from './skeleton';

interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  loading?: boolean;
  onScroll?: (scrollTop: number) => void;
  className?: string;
}

export function VirtualizedList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  loading = false,
  onScroll,
  className = '',
}: VirtualizedListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  const totalHeight = items.length * itemHeight;

  const { startIndex, endIndex, visibleItems } = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.floor((scrollTop + containerHeight) / itemHeight) + overscan
    );

    const visibleItems = items.slice(startIndex, endIndex + 1);

    return {
      startIndex,
      endIndex,
      visibleItems,
    };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan, items]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
    onScroll?.(newScrollTop);
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className={`overflow-hidden ${className}`} style={{ height: containerHeight }}>
        <div className="space-y-2 p-4">
          {Array.from({ length: Math.ceil(containerHeight / itemHeight) }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrollElementRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${startIndex * itemHeight}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map((item, index) =>
            renderItem(item, startIndex + index)
          )}
        </div>
      </div>
    </div>
  );
}

// Virtualized Table Component
interface VirtualizedTableProps<T> {
  data: T[];
  columns: Array<{
    key: string;
    label: string;
    render?: (item: T, index: number) => React.ReactNode;
    width?: string;
  }>;
  rowHeight?: number;
  maxHeight?: number;
  loading?: boolean;
  onRowClick?: (item: T, index: number) => void;
  className?: string;
}

export function VirtualizedTable<T extends Record<string, any>>({
  data,
  columns,
  rowHeight = 60,
  maxHeight = 400,
  loading = false,
  onRowClick,
  className = '',
}: VirtualizedTableProps<T>) {
  const renderRow = (item: T, index: number) => (
    <div
      key={index}
      className={`flex items-center border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 ${
        onRowClick ? 'cursor-pointer' : ''
      }`}
      style={{ height: rowHeight }}
      onClick={() => onRowClick?.(item, index)}
    >
      {columns.map((column, colIndex) => (
        <div
          key={column.key}
          className="px-4 py-2 truncate"
          style={{ width: column.width || `${100 / columns.length}%` }}
        >
          {column.render ? column.render(item, index) : item[column.key]}
        </div>
      ))}
    </div>
  );

  return (
    <Card className={className}>
      {/* Table Header */}
      <div className="flex items-center bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        {columns.map((column) => (
          <div
            key={column.key}
            className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300"
            style={{ width: column.width || `${100 / columns.length}%` }}
          >
            {column.label}
          </div>
        ))}
      </div>

      {/* Virtualized Rows */}
      <VirtualizedList
        items={data}
        itemHeight={rowHeight}
        containerHeight={maxHeight}
        renderItem={renderRow}
        loading={loading}
        overscan={3}
      />
    </Card>
  );
}

// Infinite Scroll Hook
export function useInfiniteScroll<T>(
  fetchMore: (page: number) => Promise<T[]>,
  initialData: T[] = [],
  pageSize: number = 50
) {
  const [data, setData] = useState<T[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  const loadMore = async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const newData = await fetchMore(page);
      if (newData.length < pageSize) {
        setHasMore(false);
      }
      setData(prev => [...prev, ...newData]);
      setPage(prev => prev + 1);
    } catch (error) {
      console.error('Error loading more data:', error);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setData(initialData);
    setPage(1);
    setHasMore(true);
  };

  return {
    data,
    loading,
    hasMore,
    loadMore,
    reset,
  };
}
