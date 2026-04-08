import type { ProcessedOrder, LogEntry } from '@/types';
import type { KonnektiveClient } from './konnektive';

function now() {
  return new Date().toLocaleTimeString('en-US', { hour12: false });
}

export async function processOrder(
  order: ProcessedOrder,
  client: KonnektiveClient,
  agentName: string = 'Walter',
): Promise<{ order: ProcessedOrder; logs: LogEntry[] }> {
  const logs: LogEntry[] = [];
  const orderId = order.resolvedOrderId;

  if (!orderId) {
    order.processingStatus = 'skipped';
    order.processingError = 'No resolved order ID';
    logs.push({ timestamp: now(), level: 'warning', message: `Skipped ${order.originalOrderId} — no resolved ID` });
    return { order, logs };
  }

  order.processingStatus = 'processing';

  try {
    // STEP 1 — REFUND TRANSACTIONS
    logs.push({ timestamp: now(), level: 'info', message: `Fetching transactions for order ${orderId}...` });
    const transactions = await client.getTransactionsForOrder(orderId);
    order.transactions = transactions;

    if (transactions.length === 0) {
      logs.push({ timestamp: now(), level: 'warning', message: `No refundable transactions found for ${orderId}` });
    } else {
      logs.push({ timestamp: now(), level: 'info', message: `Found ${transactions.length} transactions for order ${orderId} ($${transactions.reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0).toFixed(2)})` });
    }

    let refundTotal = 0;
    for (const txn of transactions) {
      try {
        const result = await client.refundTransaction(txn.txnId, txn.amount);
        const refundResult = {
          txnId: txn.txnId,
          success: result.success,
          amount: txn.amount,
          error: result.error,
        };
        order.refundResults.push(refundResult);

        if (result.success) {
          refundTotal += parseFloat(txn.amount || '0');
          logs.push({ timestamp: now(), level: 'success', message: `Refunded TXN ${txn.txnId} $${txn.amount} — SUCCESS` });
        } else {
          logs.push({ timestamp: now(), level: 'error', message: `Refund TXN ${txn.txnId} failed: ${result.error}` });
        }
      } catch (err) {
        order.refundResults.push({
          txnId: txn.txnId,
          success: false,
          amount: txn.amount,
          error: (err as Error).message,
        });
        logs.push({ timestamp: now(), level: 'error', message: `Refund TXN ${txn.txnId} error: ${(err as Error).message}` });
      }

      // Rate limit delay
      await new Promise(r => setTimeout(r, 200));
    }

    // STEP 2 — CANCEL FULFILLMENTS
    logs.push({ timestamp: now(), level: 'info', message: `Fetching fulfillments for order ${orderId}...` });
    const fulfillments = await client.getFulfillmentsForOrder(orderId);

    if (fulfillments.length === 0) {
      logs.push({ timestamp: now(), level: 'warning', message: `No active fulfillments found for ${orderId}` });
    }

    for (const ful of fulfillments) {
      try {
        const result = await client.cancelFulfillment(ful.fulfillmentId);
        order.fulfillmentResults.push({
          fulfillmentId: ful.fulfillmentId,
          success: result.success,
          error: result.error,
        });

        if (result.success) {
          logs.push({ timestamp: now(), level: 'success', message: `Cancelled fulfillment ${ful.fulfillmentId} — SUCCESS` });
        } else {
          logs.push({ timestamp: now(), level: 'error', message: `Cancel fulfillment ${ful.fulfillmentId} failed: ${result.error}` });
        }
      } catch (err) {
        order.fulfillmentResults.push({
          fulfillmentId: ful.fulfillmentId,
          success: false,
          error: (err as Error).message,
        });
        logs.push({ timestamp: now(), level: 'error', message: `Cancel fulfillment ${ful.fulfillmentId} error: ${(err as Error).message}` });
      }

      await new Promise(r => setTimeout(r, 200));
    }

    // STEP 3 — ADD AGENT NOTE
    if (order.konnektiveCustomerId) {
      const date = new Date().toLocaleDateString('en-US');
      const refundedTxns = order.refundResults.filter(r => r.success).map(r => r.txnId).join(', ');
      const cancelledFuls = order.fulfillmentResults.filter(r => r.success).map(r => r.fulfillmentId).join(', ');
      const refundCount = order.refundResults.filter(r => r.success).length;
      const cancelCount = order.fulfillmentResults.filter(r => r.success).length;

      const noteText = `Processed by ${agentName} via Capped Out Media KK Refunds Platform on ${date}. Action taken: Refunded ${refundCount} transactions totaling $${refundTotal.toFixed(2)} for order ${orderId}. Cancelled ${cancelCount} fulfillments. Reason: Bulk refund processing per client request. Transactions refunded: ${refundedTxns || 'none'}. Fulfillments cancelled: ${cancelledFuls || 'none'}.`;

      try {
        const result = await client.addCustomerNote(order.konnektiveCustomerId, noteText);
        order.noteResult = { success: result.success, error: result.error };

        if (result.success) {
          logs.push({ timestamp: now(), level: 'success', message: `Agent note added by ${agentName} for customer ${order.konnektiveCustomerId}` });
        } else {
          logs.push({ timestamp: now(), level: 'error', message: `Agent note failed: ${result.error}` });
        }
      } catch (err) {
        order.noteResult = { success: false, error: (err as Error).message };
        logs.push({ timestamp: now(), level: 'error', message: `Agent note error: ${(err as Error).message}` });
      }
    } else {
      logs.push({ timestamp: now(), level: 'warning', message: `No customer ID for order ${orderId} — skipped note` });
    }

    order.processingStatus = 'complete';
  } catch (err) {
    order.processingStatus = 'failed';
    order.processingError = (err as Error).message;
    logs.push({ timestamp: now(), level: 'error', message: `FATAL error processing ${orderId}: ${(err as Error).message}` });
  }

  return { order, logs };
}
