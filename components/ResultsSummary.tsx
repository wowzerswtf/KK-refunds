'use client';

import type { ProcessingStats } from '@/types';

interface ResultsSummaryProps {
  stats: ProcessingStats;
}

export default function ResultsSummary({ stats }: ResultsSummaryProps) {
  const cards = [
    { label: 'Orders Processed', value: stats.ordersProcessed, color: 'from-[#2563eb] to-[#00d4ff]' },
    { label: 'Txns Refunded', value: stats.transactionsRefunded, color: 'from-[#22c55e] to-[#16a34a]' },
    { label: 'Total Refunded', value: `$${stats.totalRefundAmount.toFixed(2)}`, color: 'from-[#22c55e] to-[#16a34a]' },
    { label: 'Fulfillments Cancelled', value: stats.fulfillmentsCancelled, color: 'from-[#f59e0b] to-[#d97706]' },
    { label: 'Notes Added', value: stats.notesAdded, color: 'from-[#2563eb] to-[#00d4ff]' },
    { label: 'Errors', value: stats.errors, color: stats.errors > 0 ? 'from-[#ef4444] to-[#dc2626]' : 'from-white/10 to-white/5' },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-lg border border-white/10 bg-[#111118] p-4"
        >
          <p className="text-xs text-gray-400">{card.label}</p>
          <p className={`mt-1 text-2xl font-bold bg-gradient-to-r ${card.color} bg-clip-text text-transparent`}>
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}
