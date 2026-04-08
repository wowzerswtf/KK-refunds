import Papa from 'papaparse';
import type { ProcessedOrder, ParseStats } from '@/types';

const ORDER_COL = 'Order - Number';

export function parseCSV(csvText: string): { orders: ProcessedOrder[]; stats: ParseStats } {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  const stats: ParseStats = { total: 0, clean: 0, longId: 0, shortId: 0 };
  const orders: ProcessedOrder[] = [];

  for (const row of result.data) {
    const orderId = (row[ORDER_COL] || '').trim();
    if (!orderId) continue;

    stats.total++;

    let idStatus: ProcessedOrder['idStatus'];
    let resolutionMethod: ProcessedOrder['resolutionMethod'];
    let resolvedOrderId: string | null = null;

    if (orderId.length === 10) {
      idStatus = 'clean';
      resolutionMethod = 'native';
      resolvedOrderId = orderId;
      stats.clean++;
    } else if (orderId.length > 10) {
      idStatus = 'long_id';
      resolutionMethod = 'unresolved';
      stats.longId++;
    } else {
      idStatus = 'short_id';
      resolutionMethod = 'corrupt';
      stats.shortId++;
    }

    const processedOrder: ProcessedOrder = {
      'Date - Order Date': row['Date - Order Date'] || '',
      'Order - Number': row[ORDER_COL] || '',
      'Order - Status': row['Order - Status'] || '',
      'Ship To - Name': row['Ship To - Name'] || '',
      'Ship To - Address 1': row['Ship To - Address 1'] || '',
      'Ship To - Address 2': row['Ship To - Address 2'] || '',
      'Ship To - City': row['Ship To - City'] || '',
      'Ship To - Country': row['Ship To - Country'] || '',
      'Ship To - Postal Code': row['Ship To - Postal Code'] || '',
      'Ship To - State': row['Ship To - State'] || '',
      originalOrderId: orderId,
      resolvedOrderId,
      idStatus,
      resolutionMethod,
      transactions: [],
      refundResults: [],
      fulfillmentResults: [],
      processingStatus: 'pending',
    };
    // Preserve any extra columns from the original CSV
    for (const key of Object.keys(row)) {
      if (!(key in processedOrder)) {
        processedOrder[key] = row[key];
      }
    }
    orders.push(processedOrder);
  }

  return { orders, stats };
}
