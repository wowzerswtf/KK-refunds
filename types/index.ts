export type OrderIdStatus = 'clean' | 'long_id' | 'short_id' | 'resolved' | 'unresolved' | 'corrupt';

export interface RawOrder {
  'Date - Order Date': string;
  'Order - Number': string;
  'Order - Status': string;
  'Ship To - Name': string;
  'Ship To - Address 1': string;
  'Ship To - Address 2': string;
  'Ship To - City': string;
  'Ship To - Country': string;
  'Ship To - Postal Code': string;
  'Ship To - State': string;
  [key: string]: unknown;
}

export interface ProcessedOrder extends RawOrder {
  originalOrderId: string;
  resolvedOrderId: string | null;
  idStatus: OrderIdStatus;
  resolutionMethod: 'native' | 'fast_path' | 'recursive_trim' | 'unresolved' | 'corrupt';
  konnektiveCustomerId?: string;
  transactions: KonnektiveTransaction[];
  refundResults: RefundResult[];
  fulfillmentResults: FulfillmentResult[];
  noteResult?: NoteResult;
  processingStatus: 'pending' | 'processing' | 'complete' | 'failed' | 'skipped';
  processingError?: string;
}

export interface KonnektiveTransaction {
  txnId: string;
  orderId: string;
  txnType: string;
  responseType: string;
  amount: string;
  currency: string;
  date: string;
  productName: string;
}

export interface KonnektiveOrder {
  orderId: string;
  customerId: string;
  orderStatus: string;
  firstName: string;
  lastName: string;
  emailAddress: string;
}

export interface KonnektiveFulfillment {
  fulfillmentId: string;
  orderId: string;
  fulfillmentStatus: string;
  trackingNumber?: string;
}

export interface RefundResult {
  txnId: string;
  success: boolean;
  amount: string;
  error?: string;
  apiResponse?: Record<string, unknown>;
}

export interface FulfillmentResult {
  fulfillmentId: string;
  success: boolean;
  error?: string;
}

export interface NoteResult {
  success: boolean;
  error?: string;
}

export interface Session {
  id: string;
  clientName: string;
  agentName: string;
  createdAt: string;
  csvFileName: string;
  totalRows: number;
  cleanCount: number;
  longIdCount: number;
  shortIdCount: number;
  orders: ProcessedOrder[];
  processingState: 'idle' | 'parsing' | 'resolving' | 'processing' | 'complete';
  fastPathConfirmed: boolean;
  fastPathConfirmedAt: number;
  credentials: {
    loginId: string;
    password: string;
  };
  log: LogEntry[];
  stats: ProcessingStats;
}

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

export interface ProcessingStats {
  ordersProcessed: number;
  ordersTotal: number;
  transactionsRefunded: number;
  totalRefundAmount: number;
  fulfillmentsCancelled: number;
  notesAdded: number;
  errors: number;
  resolvedFastPath: number;
  resolvedRecursive: number;
  unresolved: number;
}

export interface ParseStats {
  total: number;
  clean: number;
  longId: number;
  shortId: number;
}
