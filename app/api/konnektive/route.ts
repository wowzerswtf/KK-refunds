import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/sessionStore';
import { KonnektiveClient } from '@/lib/konnektive';

export async function POST(request: NextRequest) {
  try {
    const { sessionId, action, params } = await request.json();

    const session = getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const client = new KonnektiveClient(
      session.credentials.loginId,
      session.credentials.password,
    );

    let result;
    switch (action) {
      case 'lookupOrder':
        result = await client.lookupOrder(params.orderId);
        break;
      case 'getTransactions':
        result = await client.getTransactionsForOrder(params.orderId);
        break;
      case 'refundTransaction':
        result = await client.refundTransaction(params.txnId, params.amount);
        break;
      case 'getFulfillments':
        result = await client.getFulfillmentsForOrder(params.orderId);
        break;
      case 'cancelFulfillment':
        result = await client.cancelFulfillment(params.fulfillmentId);
        break;
      case 'addNote':
        result = await client.addCustomerNote(params.customerId, params.note);
        break;
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
