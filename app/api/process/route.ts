import { NextRequest, NextResponse } from 'next/server';
import { getSession, updateSession, addLog } from '@/lib/sessionStore';
import { KonnektiveClient } from '@/lib/konnektive';
import { resolveOrderId, resetFastPath, isFastPathConfirmed } from '@/lib/orderResolver';
import { processOrder } from '@/lib/refundEngine';
import type { LogEntry } from '@/types';

function now() {
  return new Date().toLocaleTimeString('en-US', { hour12: false });
}

// Track active processing to prevent double-starts
const activeProcessing = new Set<string>();

export async function POST(request: NextRequest) {
  try {
    const { sessionId, forceFastPath } = await request.json();

    const session = getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (activeProcessing.has(sessionId)) {
      return NextResponse.json({ error: 'Processing already in progress' }, { status: 409 });
    }

    activeProcessing.add(sessionId);
    const client = new KonnektiveClient(session.credentials.loginId, session.credentials.password);

    // Run processing async — don't await
    processAllOrders(sessionId, client, session.agentName, forceFastPath).finally(() => {
      activeProcessing.delete(sessionId);
    });

    return NextResponse.json({ status: 'started' });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

async function processAllOrders(sessionId: string, client: KonnektiveClient, agentName: string, forceFastPath: boolean) {
  const session = getSession(sessionId);
  if (!session) return;

  resetFastPath();

  // PHASE 1: Resolve long IDs
  updateSession(sessionId, { processingState: 'resolving' });
  addLog(sessionId, { timestamp: now(), level: 'info', message: '=== PHASE 1: Resolving Order IDs ===' });

  const longIdOrders = session.orders.filter(o => o.idStatus === 'long_id');
  for (let i = 0; i < longIdOrders.length; i++) {
    const order = longIdOrders[i];
    try {
      const result = await resolveOrderId(order.originalOrderId, client, forceFastPath);
      order.resolvedOrderId = result.resolvedId;
      order.resolutionMethod = result.method as typeof order.resolutionMethod;
      order.konnektiveCustomerId = result.customerId;
      order.idStatus = result.resolvedId ? 'resolved' : 'unresolved';

      const log: LogEntry = {
        timestamp: now(),
        level: result.resolvedId ? 'success' : 'error',
        message: result.resolvedId
          ? `Resolved ${order.originalOrderId} → ${result.resolvedId} (${result.method})`
          : `Failed to resolve ${order.originalOrderId}`,
      };
      addLog(sessionId, log);

      // Update stats
      if (result.method === 'fast_path') session.stats.resolvedFastPath++;
      else if (result.method === 'recursive_trim') session.stats.resolvedRecursive++;
      else if (!result.resolvedId) session.stats.unresolved++;

      if (isFastPathConfirmed() && !session.fastPathConfirmed) {
        session.fastPathConfirmed = true;
        session.fastPathConfirmedAt = i + 1;
        addLog(sessionId, { timestamp: now(), level: 'info', message: `Fast path confirmed after ${i + 1} consecutive matches — skipping API verification for remaining rows` });
      }
    } catch (err) {
      addLog(sessionId, { timestamp: now(), level: 'error', message: `Error resolving ${order.originalOrderId}: ${(err as Error).message}` });
      session.stats.unresolved++;
    }

    await new Promise(r => setTimeout(r, 200));
  }

  // Also look up customer IDs for clean orders
  const cleanOrders = session.orders.filter(o => o.idStatus === 'clean');
  addLog(sessionId, { timestamp: now(), level: 'info', message: `Looking up ${cleanOrders.length} clean orders...` });

  for (const order of cleanOrders) {
    try {
      const lookup = await client.lookupOrder(order.resolvedOrderId!);
      if (lookup.found && lookup.order) {
        order.konnektiveCustomerId = lookup.order.customerId;
      }
    } catch {
      // Non-fatal
    }
    await new Promise(r => setTimeout(r, 100));
  }

  // PHASE 2: Process refunds, cancellations, notes
  updateSession(sessionId, { processingState: 'processing' });
  addLog(sessionId, { timestamp: now(), level: 'info', message: '=== PHASE 2: Processing Refunds & Cancellations ===' });

  const processableOrders = session.orders.filter(
    o => o.resolvedOrderId && (o.idStatus === 'clean' || o.idStatus === 'resolved')
  );
  session.stats.ordersTotal = processableOrders.length;

  for (let i = 0; i < processableOrders.length; i++) {
    const order = processableOrders[i];
    addLog(sessionId, { timestamp: now(), level: 'info', message: `Processing order ${i + 1}/${processableOrders.length}: ${order.resolvedOrderId}` });

    const result = await processOrder(order, client, agentName);

    // Merge logs
    for (const log of result.logs) {
      addLog(sessionId, log);
    }

    // Update stats
    session.stats.ordersProcessed++;
    session.stats.transactionsRefunded += order.refundResults.filter(r => r.success).length;
    session.stats.totalRefundAmount += order.refundResults
      .filter(r => r.success)
      .reduce((sum, r) => sum + parseFloat(r.amount || '0'), 0);
    session.stats.fulfillmentsCancelled += order.fulfillmentResults.filter(r => r.success).length;
    if (order.noteResult?.success) session.stats.notesAdded++;
    session.stats.errors += order.refundResults.filter(r => !r.success).length
      + order.fulfillmentResults.filter(r => !r.success).length;

    await new Promise(r => setTimeout(r, 200));
  }

  // Mark short IDs as skipped
  for (const order of session.orders.filter(o => o.idStatus === 'short_id')) {
    order.processingStatus = 'skipped';
    order.processingError = 'Short/corrupt order ID';
  }

  updateSession(sessionId, { processingState: 'complete' });
  addLog(sessionId, { timestamp: now(), level: 'success', message: `=== PROCESSING COMPLETE === ${session.stats.ordersProcessed} orders processed, $${session.stats.totalRefundAmount.toFixed(2)} refunded` });
}

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('sessionId');
  if (!sessionId) {
    return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
  }

  const session = getSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const { credentials: _creds, ...safe } = session;
    void _creds;
  return NextResponse.json(safe);
}
