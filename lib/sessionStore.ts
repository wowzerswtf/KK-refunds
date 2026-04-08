import { v4 as uuidv4 } from 'uuid';
import type { Session, ProcessingStats } from '@/types';

const sessions = new Map<string, Session>();
const EXPIRY_MS = 4 * 60 * 60 * 1000; // 4 hours

function cleanExpired() {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - new Date(session.createdAt).getTime() > EXPIRY_MS) {
      sessions.delete(id);
    }
  }
}

export function createSession(partial: Omit<Session, 'id' | 'createdAt' | 'log' | 'stats' | 'processingState' | 'fastPathConfirmed' | 'fastPathConfirmedAt'>): Session {
  cleanExpired();

  const id = uuidv4().substring(0, 8);
  const session: Session = {
    ...partial,
    id,
    createdAt: new Date().toISOString(),
    processingState: 'idle',
    fastPathConfirmed: false,
    fastPathConfirmedAt: 0,
    log: [],
    stats: {
      ordersProcessed: 0,
      ordersTotal: partial.orders.filter(o => o.idStatus === 'clean' || o.idStatus === 'long_id').length,
      transactionsRefunded: 0,
      totalRefundAmount: 0,
      fulfillmentsCancelled: 0,
      notesAdded: 0,
      errors: 0,
      resolvedFastPath: 0,
      resolvedRecursive: 0,
      unresolved: 0,
    },
  };

  sessions.set(id, session);
  return session;
}

export function getSession(id: string): Session | undefined {
  cleanExpired();
  return sessions.get(id);
}

export function updateSession(id: string, updates: Partial<Session>): Session | undefined {
  const session = sessions.get(id);
  if (!session) return undefined;
  Object.assign(session, updates);
  return session;
}

export function updateSessionStats(id: string, stats: Partial<ProcessingStats>): void {
  const session = sessions.get(id);
  if (!session) return;
  Object.assign(session.stats, stats);
}

export function addLog(id: string, entry: Session['log'][number]): void {
  const session = sessions.get(id);
  if (!session) return;
  session.log.push(entry);
}
