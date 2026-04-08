'use client';

import { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { LogEntry } from '@/types';

interface ProcessingLogProps {
  logs: LogEntry[];
}

const levelColors: Record<string, string> = {
  success: 'text-[#22c55e]',
  error: 'text-[#ef4444]',
  warning: 'text-[#f59e0b]',
  info: 'text-[#00d4ff]',
};

const levelIcons: Record<string, string> = {
  success: '✓',
  error: '✗',
  warning: '⚠',
  info: '→',
};

export default function ProcessingLog({ logs }: ProcessingLogProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs.length]);

  return (
    <div className="rounded-lg border border-white/10 bg-[#0a0a0f]">
      <div className="border-b border-white/10 px-4 py-2">
        <h3 className="text-xs font-medium uppercase tracking-wider text-gray-400">Processing Log</h3>
      </div>
      <ScrollArea className="h-[400px]">
        <div className="p-4 font-mono text-xs leading-relaxed">
          {logs.map((entry, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-gray-600 shrink-0">[{entry.timestamp}]</span>
              <span className={`shrink-0 ${levelColors[entry.level]}`}>{levelIcons[entry.level]}</span>
              <span className={levelColors[entry.level]}>{entry.message}</span>
            </div>
          ))}
          {logs.length === 0 && (
            <p className="text-gray-600">Waiting for processing to start...</p>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
    </div>
  );
}
