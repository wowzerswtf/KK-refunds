'use client';

interface HeaderProps {
  clientName?: string;
  sessionInfo?: string;
}

export default function Header({ clientName, sessionInfo }: HeaderProps) {
  return (
    <header className="border-b border-white/10 bg-[#0a0a0f]">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#2563eb] to-[#00d4ff] flex items-center justify-center">
              <span className="text-sm font-bold text-white">CO</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">
                Capped Out Media
              </h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#00d4ff]/70">
                Refund Operations Platform
              </p>
            </div>
          </div>
        </div>
        {(clientName || sessionInfo) && (
          <div className="text-right">
            {clientName && (
              <p className="text-sm font-medium text-white">{clientName}</p>
            )}
            {sessionInfo && (
              <p className="text-xs text-gray-400">{sessionInfo}</p>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
