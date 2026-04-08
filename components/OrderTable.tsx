'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import type { ProcessedOrder } from '@/types';

interface OrderTableProps {
  orders: ProcessedOrder[];
  pageSize?: number;
  showProcessingColumns?: boolean;
}

const statusColors: Record<string, string> = {
  clean: 'bg-[#22c55e]/20 text-[#22c55e] border-[#22c55e]/30',
  resolved: 'bg-[#22c55e]/20 text-[#22c55e] border-[#22c55e]/30',
  long_id: 'bg-[#f59e0b]/20 text-[#f59e0b] border-[#f59e0b]/30',
  short_id: 'bg-[#ef4444]/20 text-[#ef4444] border-[#ef4444]/30',
  unresolved: 'bg-[#ef4444]/20 text-[#ef4444] border-[#ef4444]/30',
  corrupt: 'bg-[#ef4444]/20 text-[#ef4444] border-[#ef4444]/30',
};

const procStatusColors: Record<string, string> = {
  complete: 'bg-[#22c55e]/20 text-[#22c55e] border-[#22c55e]/30',
  processing: 'bg-[#2563eb]/20 text-[#2563eb] border-[#2563eb]/30',
  pending: 'bg-white/10 text-gray-400 border-white/20',
  failed: 'bg-[#ef4444]/20 text-[#ef4444] border-[#ef4444]/30',
  skipped: 'bg-white/10 text-gray-500 border-white/10',
};

export default function OrderTable({ orders, pageSize = 50, showProcessingColumns = false }: OrderTableProps) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(orders.length / pageSize);
  const pageOrders = orders.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div className="overflow-hidden rounded-lg border border-white/10">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">Original ID</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">Resolved ID</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">Status</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">Name</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">City</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">State</th>
              {showProcessingColumns && (
                <>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">Txns Refunded</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">Amount</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">Fulfillments</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">Note</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">Proc. Status</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {pageOrders.map((order, i) => {
              const refundedCount = order.refundResults?.filter(r => r.success).length ?? 0;
              const refundTotal = order.refundResults?.filter(r => r.success).reduce((s, r) => s + parseFloat(r.amount || '0'), 0) ?? 0;
              const cancelledCount = order.fulfillmentResults?.filter(r => r.success).length ?? 0;

              return (
                <tr key={`${order.originalOrderId}-${i}`} className="hover:bg-white/5">
                  <td className="px-3 py-2 font-mono text-xs text-gray-300">{order.originalOrderId}</td>
                  <td className="px-3 py-2 font-mono text-xs text-white">{order.resolvedOrderId || '—'}</td>
                  <td className="px-3 py-2">
                    <Badge variant="outline" className={`text-[10px] ${statusColors[order.idStatus] || ''}`}>
                      {order.idStatus}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-300">{order['Ship To - Name']}</td>
                  <td className="px-3 py-2 text-xs text-gray-400">{order['Ship To - City']}</td>
                  <td className="px-3 py-2 text-xs text-gray-400">{order['Ship To - State']}</td>
                  {showProcessingColumns && (
                    <>
                      <td className="px-3 py-2 text-xs text-center text-gray-300">{refundedCount || '—'}</td>
                      <td className="px-3 py-2 text-xs text-gray-300">{refundTotal > 0 ? `$${refundTotal.toFixed(2)}` : '—'}</td>
                      <td className="px-3 py-2 text-xs text-center text-gray-300">{cancelledCount || '—'}</td>
                      <td className="px-3 py-2 text-xs text-center">{order.noteResult?.success ? '✓' : '—'}</td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className={`text-[10px] ${procStatusColors[order.processingStatus] || ''}`}>
                          {order.processingStatus}
                        </Badge>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-white/10 bg-white/5 px-4 py-2">
          <p className="text-xs text-gray-400">
            Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, orders.length)} of {orders.length}
          </p>
          <div className="flex gap-2">
            <button
              className="rounded px-3 py-1 text-xs text-gray-400 hover:bg-white/10 disabled:opacity-30"
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
            >
              Prev
            </button>
            <button
              className="rounded px-3 py-1 text-xs text-gray-400 hover:bg-white/10 disabled:opacity-30"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
