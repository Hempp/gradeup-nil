'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { exportToCSV, exportToPDF } from '@/lib/utils/export';

interface ExportButtonProps<T extends Record<string, unknown>> {
  data: T[];
  filename: string;
  columns?: { key: keyof T; label: string }[];
  variant?: 'csv' | 'pdf' | 'both';
  tableId?: string;
}

export function ExportButton<T extends Record<string, unknown>>({
  data,
  filename,
  columns,
  variant = 'csv',
  tableId,
}: ExportButtonProps<T>) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = (type: 'csv' | 'pdf') => {
    setIsExporting(true);
    try {
      if (type === 'csv') {
        exportToCSV(data, filename, columns);
      } else if (tableId) {
        exportToPDF(tableId, filename);
      }
    } finally {
      setIsExporting(false);
    }
  };

  if (variant === 'both') {
    return (
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => handleExport('csv')} disabled={isExporting}>
          <Download className="h-4 w-4 mr-2" /> CSV
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleExport('pdf')} disabled={isExporting || !tableId}>
          <Download className="h-4 w-4 mr-2" /> PDF
        </Button>
      </div>
    );
  }

  return (
    <Button variant="outline" size="sm" onClick={() => handleExport(variant)} disabled={isExporting}>
      <Download className="h-4 w-4 mr-2" /> Export {variant.toUpperCase()}
    </Button>
  );
}
