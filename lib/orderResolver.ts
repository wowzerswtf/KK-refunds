import type { KonnektiveClient } from './konnektive';

let fastPathCounter = 0;
let fastPathConfirmed = false;

export function resetFastPath() {
  fastPathCounter = 0;
  fastPathConfirmed = false;
}

export function isFastPathConfirmed() {
  return fastPathConfirmed;
}

export function getFastPathCounter() {
  return fastPathCounter;
}

export async function resolveOrderId(
  rawId: string,
  client: KonnektiveClient,
  forceFastPath = false,
): Promise<{ resolvedId: string | null; method: string; customerId?: string }> {
  // Exactly 10 chars — already clean
  if (rawId.length === 10) {
    const lookup = await client.lookupOrder(rawId);
    return {
      resolvedId: rawId,
      method: 'native',
      customerId: lookup.order?.customerId,
    };
  }

  // Too short — corrupt
  if (rawId.length < 10) {
    return { resolvedId: null, method: 'corrupt' };
  }

  // Long ID — resolve
  const first10 = rawId.substring(0, 10);

  // If fast path is confirmed or forced, just truncate
  if (fastPathConfirmed || forceFastPath) {
    const lookup = await client.lookupOrder(first10);
    return {
      resolvedId: first10,
      method: 'fast_path',
      customerId: lookup.order?.customerId,
    };
  }

  // Try first-10-chars candidate
  const first10Result = await client.lookupOrder(first10);

  // Try recursive end-trim candidates
  let trimResolvedId: string | null = null;

  for (let trim = 1; trim <= 5; trim++) {
    const candidate = rawId.substring(0, rawId.length - trim);
    if (candidate.length < 10) break;
    if (candidate.length === 10) {
      const result = await client.lookupOrder(candidate);
      if (result.found) {
        trimResolvedId = candidate;
        break;
      }
    }
  }

  // Both agree on first 10
  if (first10Result.found && trimResolvedId === first10) {
    fastPathCounter++;
    if (fastPathCounter >= 5) {
      fastPathConfirmed = true;
    }
    return {
      resolvedId: first10,
      method: 'fast_path',
      customerId: first10Result.order?.customerId,
    };
  }

  // First 10 found
  if (first10Result.found) {
    fastPathCounter++;
    if (fastPathCounter >= 5) {
      fastPathConfirmed = true;
    }
    return {
      resolvedId: first10,
      method: 'fast_path',
      customerId: first10Result.order?.customerId,
    };
  }

  // Recursive trim found something different
  if (trimResolvedId) {
    fastPathCounter = 0; // reset streak
    const lookup = await client.lookupOrder(trimResolvedId);
    return {
      resolvedId: trimResolvedId,
      method: 'recursive_trim',
      customerId: lookup.order?.customerId,
    };
  }

  // Nothing found
  fastPathCounter = 0;
  return { resolvedId: null, method: 'unresolved' };
}
