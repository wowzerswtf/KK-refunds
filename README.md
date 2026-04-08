# KK Refunds — Capped Out Media

A production-grade, reusable refund processing platform for bulk Konnektive CRM operations. Built by **Capped Out Media** for use across multiple clients.

## What It Does

This platform processes Konnektive order export CSVs through a 3-step pipeline:

1. **Resolve Order IDs** — Detects malformed order IDs (too long, too short) and resolves them against the Konnektive API using recursive truncation with fast-path optimization
2. **Refund & Cancel** — For each valid order: refunds all successful transactions (SALE + UPSALE), cancels active fulfillments, and leaves an agent note
3. **Audit & Export** — Generates exportable CSVs for successful operations, manual review items, and corrupt/unresolvable orders

## Prerequisites

- Node.js 18+
- npm
- Konnektive CRM API credentials

## Setup

```bash
git clone https://github.com/wowzerswtf/KK-refunds.git
cd KK-refunds
npm install
cp .env.local.example .env.local  # Optional — credentials can be entered in UI
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## How to Use

### Page 1 — Upload
- Drop your Konnektive CSV export file
- Enter client name and agent name (default: Walter)
- Enter Konnektive API credentials (stored in-memory only, never persisted)
- Click "Begin Processing"

### Page 2 — Session Overview
- Review parsed data: clean IDs, long IDs needing resolution, corrupt/short IDs
- Preview all rows with ID classification badges
- Click "Start Processing" when ready

### Page 3 — Processing
- Watch real-time logs as orders are resolved, refunded, and cancelled
- Live counters show progress, amounts refunded, and errors
- Three-step progress indicator: Resolve IDs → Refund & Cancel → Audit Notes
- Auto-redirects to results when complete

### Page 4 — Results
- Summary dashboard with all stats
- Four export options:
  - **Successfully Processed** — all fully completed orders
  - **Needs Manual Review** — orders resolved via recursive trim or with partial failures
  - **Corrupt / Not Found** — unresolvable orders with ALL original columns preserved
  - **Full Audit Log** — everything with resolution and processing details

## Konnektive API Permissions Required

Your API credentials need access to:
- `order/query` — Look up orders by ID
- `transactions/query` — Query transactions for an order
- `transactions/refund` — Issue refunds
- `fulfillment/query` — Query fulfillments
- `fulfillment/update` — Cancel fulfillments
- `customer/addnote` — Add agent notes

## Output Files

All exports preserve the original CSV columns plus processing metadata:

| Export | Contains |
|--------|----------|
| Success CSV | Orders where all refunds, cancellations, and notes succeeded |
| Review CSV | Orders resolved via recursive trim (not fast path) + partial failures |
| Corrupt CSV | Short/unresolvable IDs with ALL original data intact for PM review |
| Audit CSV | Complete record of every order with full processing details |

## ID Resolution Logic

For order IDs longer than 10 characters:
1. Try the first 10 characters as a candidate
2. Try removing 1 character from the end recursively (up to 5 iterations)
3. Call the Konnektive API to verify each candidate exists
4. First valid match wins

## Fast-Path Optimization

The platform detects patterns automatically. In most datasets, 15-character IDs follow the format `[10 real chars]R[4 digits]`. After 5 consecutive successful first-10-char resolutions, the platform switches to **fast path** mode and skips API verification for remaining rows — just truncates to 10 characters. This dramatically speeds up processing for large files.

## Important Warnings

- This platform issues **REAL refunds** through the Konnektive API
- Always test with a small batch first
- Review the Session Overview page before starting processing
- Check the "Needs Manual Review" export after every run
- Credentials are stored in-memory only and expire after 4 hours
- Process orders sequentially with rate limiting to avoid Konnektive API throttling

## Reusability

This platform is designed for use across multiple clients:
- No hardcoded client names or campaign IDs
- Per-session credentials and configuration
- Client name appears in all exports and agent notes
- Start a new session for each client or batch

---

**Capped Out Media** — cappedoutmedia.com
