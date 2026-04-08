'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import ResultsSummary from '@/components/ResultsSummary';
import OrderTable from '@/components/OrderTable';
import ExportButton from '@/components/ExportButton';
import type { Session } from '@/types';

export default function ResultsPage() {
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
          <p className="text-gray-400">Loading results...</p>
        </div>
      </div>
    );
  }

  const successOrders = session.orders.filter(
    o => o.processingStatus === 'complete' && !o.processingError
  );
  const partialOrders = session.orders.filter(
    o => o.processingStatus === 'complete' && o.refundResults?.some(r => !r.success)
  );
  const failedOrders = session.orders.filter(o => o.processingStatus === 'failed');
  const needsReviewOrders = session.orders.filter(
    o => o.resolutionMethod === 'recursive_trim' || (o.processingStatus === 'complete' && o.refundResults?.some(r => !r.success))
  );
  const corruptOrders = session.orders.filter(
    o => o.idStatus === 'short_id' || o.idStatus === 'corrupt' || o.idStatus === 'unresolved'
  );
  const allProcessed = session.orders.filter(o => o.processingStatus !== 'pending');

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        clientName={session.clientName}
        sessionInfo={`Session ${session.id} — Results`}
      />

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8 space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-white">Processing Results</h2>
          <p className="mt-1 text-sm text-gray-400">
            {session.clientName} — {session.csvFileName}
          </p>
        </div>

        {/* Summary stats */}
        <ResultsSummary stats={session.stats} />

        {/* Resolution breakdown */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {[
            { label: 'Fully Successful', value: successOrders.length, color: 'text-[#22c55e]' },
            { label: 'Partial Success', value: partialOrders.length, color: 'text-[#f59e0b]' },
            { label: 'Failed', value: failedOrders.length, color: 'text-[#ef4444]' },
            { label: 'Skipped (corrupt)', value: corruptOrders.length, color: 'text-gray-500' },
            { label: 'Needs Review', value: needsReviewOrders.length, color: 'text-[#f59e0b]' },
          ].map(card => (
            <div key={card.label} className="rounded-lg border border-white/10 bg-[#111118] p-4">
              <p className="text-xs text-gray-400">{card.label}</p>
              <p className={`mt-1 text-2xl font-bold ${card.color}`}>{card.value}</p>
            </div>
          ))}
        </div>

        {/* Export buttons */}
        <div className="flex flex-wrap gap-3">
          <ExportButton
            label="Successfully Processed"
            orders={successOrders}
            filename={`${session.clientName}_success_${session.id}.csv`}
            variant="primary"
            includeProcessingCols
          />
          <ExportButton
            label="Needs Manual Review"
            orders={needsReviewOrders}
            filename={`${session.clientName}_review_${session.id}.csv`}
            variant="warning"
            includeProcessingCols
          />
          <ExportButton
            label="Corrupt / Not Found"
            orders={corruptOrders}
            filename={`${session.clientName}_corrupt_${session.id}.csv`}
            variant="danger"
          />
          <ExportButton
            label="Full Audit Log"
            orders={allProcessed}
            filename={`${session.clientName}_audit_${session.id}.csv`}
            variant="secondary"
            includeProcessingCols
          />
        </div>

        {/* Results table */}
        <div>
          <h3 className="mb-3 text-sm font-medium text-gray-400 uppercase tracking-wider">All Orders</h3>
          <OrderTable orders={session.orders} showProcessingColumns />
        </div>

        {/* New session */}
        <div className="flex justify-center pb-8">
          <button
            onClick={() => router.push('/')}
            className="rounded-lg border border-white/10 bg-[#111118] px-6 py-3 text-sm font-medium text-gray-300 transition-all hover:bg-white/10"
          >
            Start New Session
          </button>
        </div>
      </main>
    </div>
  );
}
