'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import StepIndicator from '@/components/StepIndicator';
import ProcessingLog from '@/components/ProcessingLog';
import type { Session } from '@/types';

export default function ProcessPage() {
  const params = useParams();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const startedRef = useRef(false);
  const [error, setError] = useState('');

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/process?sessionId=${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setSession(data);
        return data.processingState;
      }
    } catch {
      // Retry silently
    }
    return null;
  }, [params.id]);

  // Start processing
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    fetch('/api/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: params.id, forceFastPath: false }),
    }).catch(e => setError(e.message));
  }, [params.id]);

  // Poll for updates
  useEffect(() => {
    let cancelled = false;
    const interval = setInterval(async () => {
      const state = await poll();
      if (state === 'complete' && !cancelled) {
        clearInterval(interval);
        setTimeout(() => router.push(`/session/${params.id}/results`), 2000);
      }
    }, 2000);

    return () => { cancelled = true; clearInterval(interval); };
  }, [poll, params.id, router]);

  const steps = [
    {
      label: 'Resolve IDs',
      status: !session ? 'pending' as const :
        session.processingState === 'resolving' ? 'active' as const :
        session.processingState === 'processing' || session.processingState === 'complete' ? 'complete' as const : 'pending' as const,
    },
    {
      label: 'Refund & Cancel',
      status: !session ? 'pending' as const :
        session.processingState === 'processing' ? 'active' as const :
        session.processingState === 'complete' ? 'complete' as const : 'pending' as const,
    },
    {
      label: 'Audit Notes',
      status: !session ? 'pending' as const :
        session.processingState === 'complete' ? 'complete' as const : 'pending' as const,
    },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        clientName={session?.clientName}
        sessionInfo={session ? `Session ${session.id}` : ''}
      />

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8 space-y-8">
        {/* Warning */}
        {session?.processingState !== 'complete' && (
          <div className="rounded-lg border border-[#2563eb]/30 bg-[#2563eb]/10 px-4 py-3">
            <p className="text-sm text-[#00d4ff]">
              Processing in progress — do not close this tab.
            </p>
          </div>
        )}

        {session?.processingState === 'complete' && (
          <div className="rounded-lg border border-[#22c55e]/30 bg-[#22c55e]/10 px-4 py-3">
            <p className="text-sm text-[#22c55e]">
              Processing complete! Redirecting to results...
            </p>
          </div>
        )}

        {error && <p className="text-sm text-[#ef4444]">{error}</p>}

        {/* Steps */}
        <StepIndicator steps={steps} />

        {/* Live stats + Log */}
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <ProcessingLog logs={session?.log || []} />

          <div className="space-y-4">
            <h3 className="text-xs font-medium uppercase tracking-wider text-gray-400">Live Counters</h3>
            {session?.stats && (
              <div className="space-y-3">
                {[
                  { label: 'Orders Processed', value: `${session.stats.ordersProcessed} / ${session.stats.ordersTotal}`, color: 'text-[#00d4ff]' },
                  { label: 'Txns Refunded', value: `$${session.stats.totalRefundAmount.toFixed(2)}`, color: 'text-[#22c55e]' },
                  { label: 'Fulfillments Cancelled', value: session.stats.fulfillmentsCancelled, color: 'text-[#f59e0b]' },
                  { label: 'Notes Added', value: session.stats.notesAdded, color: 'text-[#2563eb]' },
                  { label: 'Errors', value: session.stats.errors, color: session.stats.errors > 0 ? 'text-[#ef4444]' : 'text-gray-500' },
                  { label: 'Fast Path Resolutions', value: session.stats.resolvedFastPath, color: 'text-gray-400' },
                  { label: 'Recursive Resolutions', value: session.stats.resolvedRecursive, color: 'text-gray-400' },
                  { label: 'Unresolved', value: session.stats.unresolved, color: session.stats.unresolved > 0 ? 'text-[#ef4444]' : 'text-gray-500' },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between rounded-lg border border-white/10 bg-[#111118] px-4 py-3">
                    <span className="text-xs text-gray-400">{item.label}</span>
                    <span className={`text-lg font-bold ${item.color}`}>{item.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
