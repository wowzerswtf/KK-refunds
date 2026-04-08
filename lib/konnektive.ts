import axios from 'axios';
import type {
  KonnektiveOrder,
  KonnektiveTransaction,
  KonnektiveFulfillment,
} from '@/types';

const BASE_URL = process.env.KONNEKTIVE_API_URL || 'https://api.konnektive.com';
const MAX_RETRIES = 3;
const BASE_DELAY = 500;
const TIMEOUT = 10000;

export class KonnektiveClient {
  private loginId: string;
  private password: string;

  constructor(loginId: string, password: string) {
    this.loginId = loginId;
    this.password = password;
  }

  private async request(path: string, params: Record<string, string> = {}): Promise<{ result: string; message: Record<string, unknown> } | null> {
    const allParams = {
      loginId: this.loginId,
      password: this.password,
      ...params,
    };

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await axios.get(`${BASE_URL}${path}`, {
          params: allParams,
          timeout: TIMEOUT,
        });

        return response.data;
      } catch (error: unknown) {
        const axiosErr = error as { response?: { status: number } };
        if (axiosErr.response?.status === 429 && attempt < MAX_RETRIES - 1) {
          await new Promise(r => setTimeout(r, BASE_DELAY * Math.pow(2, attempt)));
          continue;
        }

        if (attempt < MAX_RETRIES - 1) {
          await new Promise(r => setTimeout(r, BASE_DELAY * Math.pow(2, attempt)));
          continue;
        }

        console.error(`[Konnektive] ${path} failed after ${MAX_RETRIES} retries:`, (error as Error).message);
        return null;
      }
    }
    return null;
  }

  async lookupOrder(orderId: string): Promise<{ found: boolean; order: KonnektiveOrder | null }> {
    const data = await this.request('/order/query/', { orderId });

    if (!data || data.result !== 'SUCCESS') {
      return { found: false, order: null };
    }

    try {
      const msg = data.message as Record<string, unknown>;
      const msgData = msg?.data as Record<string, Record<string, unknown>>;
      if (!msgData) return { found: false, order: null };

      const entries = Object.values(msgData);
      if (entries.length === 0) return { found: false, order: null };

      const first = entries[0];
      return {
        found: true,
        order: {
          orderId: String(first.orderId ?? ''),
          customerId: String(first.customerId ?? ''),
          orderStatus: String(first.orderStatus ?? ''),
          firstName: String(first.firstName ?? ''),
          lastName: String(first.lastName ?? ''),
          emailAddress: String(first.emailAddress ?? ''),
        },
      };
    } catch {
      return { found: false, order: null };
    }
  }

  async getTransactionsForOrder(orderId: string): Promise<KonnektiveTransaction[]> {
    const data = await this.request('/transactions/query/', { orderId });

    if (!data || data.result !== 'SUCCESS') return [];

    try {
      const msg = data.message as Record<string, unknown>;
      const msgData = msg?.data as Record<string, Record<string, unknown>>;
      if (!msgData) return [];

      const entries = Object.values(msgData);
      return entries
        .filter((t) => {
          const txnType = String(t.txnType ?? '');
          const responseType = String(t.responseType ?? '');
          return (txnType === 'SALE' || txnType === 'UPSALE') && responseType === 'SUCCESS';
        })
        .map((t) => ({
          txnId: String(t.transactionId ?? t.txnId ?? ''),
          orderId: String(t.orderId ?? ''),
          txnType: String(t.txnType ?? ''),
          responseType: String(t.responseType ?? ''),
          amount: String(t.totalAmount ?? t.price ?? '0.00'),
          currency: String(t.currency ?? 'USD'),
          date: String(t.txnDate ?? ''),
          productName: String(t.productName ?? ''),
        }));
    } catch {
      return [];
    }
  }

  async refundTransaction(txnId: string, amount: string): Promise<{ success: boolean; error?: string }> {
    const params: Record<string, string> = {
      transactionId: txnId,
      refundAmount: amount,
    };

    const data = await this.request('/transactions/refund/', params);

    if (!data) return { success: false, error: 'No response from API' };
    if (data.result === 'SUCCESS') return { success: true };
    return { success: false, error: String(data.message || 'Refund failed') };
  }

  async getFulfillmentsForOrder(orderId: string): Promise<KonnektiveFulfillment[]> {
    const data = await this.request('/fulfillment/query/', { orderId });

    if (!data || data.result !== 'SUCCESS') return [];

    try {
      const msg = data.message as Record<string, unknown>;
      const msgData = msg?.data as Record<string, Record<string, unknown>>;
      if (!msgData) return [];

      const entries = Object.values(msgData);
      return entries
        .filter((f) => {
          const status = String(f.fulfillmentStatus ?? '').toUpperCase();
          return status !== 'CANCELLED' && status !== 'RETURNED';
        })
        .map((f) => ({
          fulfillmentId: String(f.fulfillmentId ?? ''),
          orderId: String(f.orderId ?? ''),
          fulfillmentStatus: String(f.fulfillmentStatus ?? ''),
          trackingNumber: f.trackingNumber ? String(f.trackingNumber) : undefined,
        }));
    } catch {
      return [];
    }
  }

  async cancelFulfillment(fulfillmentId: string): Promise<{ success: boolean; error?: string }> {
    const data = await this.request('/fulfillment/update/', {
      fulfillmentId,
      fulfillmentStatus: 'cancelled',
    });

    if (!data) return { success: false, error: 'No response from API' };
    if (data.result === 'SUCCESS') return { success: true };
    return { success: false, error: String(data.message || 'Cancellation failed') };
  }

  async addCustomerNote(customerId: string, note: string): Promise<{ success: boolean; error?: string }> {
    const data = await this.request('/customer/addnote/', {
      customerId,
      message: note,
    });

    if (!data) return { success: false, error: 'No response from API' };
    if (data.result === 'SUCCESS') return { success: true };
    return { success: false, error: String(data.message || 'Note failed') };
  }
}
