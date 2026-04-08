'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import OrderTable from '@/components/OrderTable';
import ExportButton from '@/components/ExportButton';
import type { Session } from '@/types';

export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/session?id=${params.id}`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error('Session not found')))
      .then(setSession)
      .catch(e => setError(e.message));
  }, [params.id]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-[#ef4444]">{error}</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-gray-400">Loading session...</p>
        </div>
      </div>
    );
  }

  const cleanOrders = session.orders.filter(o => o.idStatus === 'clean');
  const longOrders = session.orders.filter(o => o.idStatus === 'long_id');
  const processableCount = cleanOrders.length + longOrders.length;

  const statCards = [
    { label: 'Total Orders', value: session.totalRows, color: 'text-white' },
    { label: 'Clean IDs', value: session.cleanCount, color: 'text-[#22c55e]' },
    { label: 'Long IDs (needs resolution)', value: session.longIdCount, color: 'text-[#f59e0b]' },
    { label: 'Short IDs (corrupt)', value: session.shortIdCount, color: 'text-[#ef4444]' },
    { label: 'Ready to Process', value: processableCount, color: 'text-[#00d4ff]' },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <Header clientName={session.clientName} sessionInfo={`Session ${session.id} — ${session.csvFileName}`} />

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8 space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-white">Session Overview</h2>
          <p className="mt-1 text-sm text-gray-400">Review parsed CSV data before starting the refund pipeline</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {statCards.map(card => (
            <div key={card.label} className="rounded-lg border border-white/10 bg-[#111118] p-4">
              <p className="text-xs text-gray-400">{card.label}</p>
              <p className={`mt-1 text-3xl font-bold ${card.color}`}>{card.value}</p>
            </div>
          ))}
        </div>

        {/* Warning for corrupt IDs */}
        {session.shortIdCount > 0 && (
          <div className="rounded-lg border border-[#ef4444]/30 bg-[#ef4444]/10 px-4 py-3">
            <p className="text-sm text-[#ef4444]">
              <strong>{session.shortIdCount} orders</strong> with corrupt/unresolvable IDs will be skipped and exported for manual review.
            </p>
          </div>
        )}

        {/* Order preview */}
        <div>
          <h3 className="mb-3 text-sm font-medium text-gray-400 uppercase tracking-wider">Order Preview (first 50)</h3>
          <OrderTable orders={session.orders.slice(0, 50)} />
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={() => router.push(`/session/${session.id}/process`)}
            className="rounded-lg bg-gradient-to-r from-[#2563eb] to-[#00d4ff] px-6 py-3 text-sm font-semibold text-white transition-all hover:opacity-90"
          >
            Start Processing ({processableCount} orders)
          </button>

          <ExportButton
            label="Export Preview CSV"
            orders={session.orders}
            filename={`${session.clientName}_preview_${session.id}.csv`}
            variant="secondary"
            includeProcessingCols
          />
        </div>
      </main>
    </div>
  );
}
