'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import UploadZone from '@/components/UploadZone';

export default function HomePage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{ rows: number; fileName: string } | null>(null);
  const [clientName, setClientName] = useState('');
  const [agentName, setAgentName] = useState('Walter');
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = file && clientName && loginId && password && !loading;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('clientName', clientName);
      formData.append('agentName', agentName);
      formData.append('loginId', loginId);
      formData.append('password', password);

      const res = await fetch('/api/session', { method: 'POST', body: formData });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create session');
      }

      const session = await res.json();
      router.push(`/session/${session.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-[#2563eb] to-[#00d4ff] bg-clip-text text-transparent">
                Refund Processing
              </span>
            </h2>
            <p className="mt-2 text-gray-400">
              Upload a Konnektive CSV export to begin bulk refund operations
            </p>
          </div>

          <div className="rounded-lg border border-[#f59e0b]/30 bg-[#f59e0b]/10 px-4 py-3">
            <p className="text-sm text-[#f59e0b]">
              <strong>Warning:</strong> This operation will issue REAL refunds via the Konnektive API. Review all orders before confirming.
            </p>
          </div>

          <UploadZone
            onFileSelect={(f, p) => {
              setFile(f);
              setPreview(p);
            }}
          />

          {preview && (
            <div className="rounded-lg border border-white/10 bg-[#111118] px-4 py-3">
              <p className="text-sm text-gray-300">
                <span className="text-white font-medium">{preview.fileName}</span>
                {' — '}
                <span className="text-[#00d4ff]">{preview.rows.toLocaleString()} rows</span>
              </p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-400">Client Name *</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g. Acme Corp"
                className="w-full rounded-lg border border-white/10 bg-[#111118] px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-[#2563eb] focus:outline-none focus:ring-1 focus:ring-[#2563eb]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-400">Agent Name</label>
              <input
                type="text"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                placeholder="Walter"
                className="w-full rounded-lg border border-white/10 bg-[#111118] px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-[#2563eb] focus:outline-none focus:ring-1 focus:ring-[#2563eb]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-400">Konnektive Login ID *</label>
              <input
                type="text"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                placeholder="Login ID"
                className="w-full rounded-lg border border-white/10 bg-[#111118] px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-[#2563eb] focus:outline-none focus:ring-1 focus:ring-[#2563eb]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-400">Konnektive Password *</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full rounded-lg border border-white/10 bg-[#111118] px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-[#2563eb] focus:outline-none focus:ring-1 focus:ring-[#2563eb]"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-[#ef4444]">{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full rounded-lg bg-gradient-to-r from-[#2563eb] to-[#00d4ff] px-6 py-3 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating Session...' : 'Begin Processing'}
          </button>

          <div className="grid grid-cols-2 gap-4 pt-4 sm:grid-cols-4">
            {[
              { icon: 'ID', label: 'Auto ID Resolution' },
              { icon: '$', label: 'Transaction Refunds' },
              { icon: 'X', label: 'Fulfillment Cancel' },
              { icon: '#', label: 'Audit Trail Export' },
            ].map((f) => (
              <div key={f.label} className="rounded-lg border border-white/5 bg-[#111118] px-3 py-3 text-center">
                <p className="text-xl font-bold text-[#00d4ff]">{f.icon}</p>
                <p className="mt-1 text-[11px] text-gray-400">{f.label}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
