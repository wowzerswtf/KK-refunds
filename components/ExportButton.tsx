'use client';

import Papa from 'papaparse';
import type { ProcessedOrder } from '@/types';

interface ExportButtonProps {
  label: string;
  orders: ProcessedOrder[];
  filename: string;
  variant?: 'primary' | 'secondary' | 'warning' | 'danger';
  includeProcessingCols?: boolean;
}

const variantClasses: Record<string, string> = {
  primary: 'bg-[#2563eb] hover:bg-[#1d4ed8] text-white',
  secondary: 'bg-white/10 hover:bg-white/20 text-white',
  warning: 'bg-[#f59e0b]/20 hover:bg-[#f59e0b]/30 text-[#f59e0b] border border-[#f59e0b]/30',
  danger: 'bg-[#ef4444]/20 hover:bg-[#ef4444]/30 text-[#ef4444] border border-[#ef4444]/30',
};

export default function ExportButton({ label, orders, filename, variant = 'secondary', includeProcessingCols = false }: ExportButtonProps) {
  const handleExport = () => {
    if (orders.length === 0) return;

    const exportData = orders.map(order => {
      const base: Record<string, string> = {
        'Date - Order Date': order['Date - Order Date'] || '',
        'Order - Number': order['Order - Number'] || '',
        'Order - Status': order['Order - Status'] || '',
        'Ship To - Name': order['Ship To - Name'] || '',
        'Ship To - Address 1': order['Ship To - Address 1'] || '',
        'Ship To - Address 2': order['Ship To - Address 2'] || '',
        'Ship To - City': order['Ship To - City'] || '',
        'Ship To - Country': order['Ship To - Country'] || '',
        'Ship To - Postal Code': order['Ship To - Postal Code'] || '',
        'Ship To - State': order['Ship To - State'] || '',
      };

      if (includeProcessingCols) {
        base['Original Order ID'] = order.originalOrderId || '';
        base['Resolved Order ID'] = order.resolvedOrderId || '';
        base['ID Status'] = order.idStatus || '';
        base['Resolution Method'] = order.resolutionMethod || '';
        base['Processing Status'] = order.processingStatus || '';
        base['Transactions Refunded'] = String(order.refundResults?.filter(r => r.success).length ?? 0);
        base['Total Refunded'] = order.refundResults
          ?.filter(r => r.success)
          .reduce((s, r) => s + parseFloat(r.amount || '0'), 0)
          .toFixed(2) || '0.00';
        base['Fulfillments Cancelled'] = String(order.fulfillmentResults?.filter(r => r.success).length ?? 0);
        base['Note Added'] = order.noteResult?.success ? 'Yes' : 'No';
        base['Errors'] = order.processingError || '';
      }

      return base;
    });

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleExport}
      disabled={orders.length === 0}
      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed ${variantClasses[variant]}`}
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      {label} ({orders.length})
    </button>
  );
}
