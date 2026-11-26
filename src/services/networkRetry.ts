// Retry-on-network-failure helper for the admin login path.
//
// Render's free tier sleeps after ~15 min idle, so the first admin-login
// request after idle often fails at the network level (fetch throws a
// TypeError / "Failed to fetch") even though the API itself is healthy.
// This helper retries ONLY network-level failures — 2 more attempts,
// ~3s then ~8s apart — and never retries HTTP error responses
// (401/403/409 etc.), because fetch resolves for those: they are real
// answers from the server, not network failures.
//
// The helper is deliberately a pure function of a `doFetch` callback (no
// import.meta / env access) so it can be exercised in a plain node script
// against a stopped/started local server.

export const NETWORK_ERROR_MESSAGE =
  'Could not connect to the server — please check your internet connection and try again.';

/** Shown while a retry is in progress (matches the screen's English UI). */
export const NETWORK_RETRY_MESSAGE = 'Waking up the server, please wait…';

/** Delays before retry attempt 1 and 2 (ms). */
export const NETWORK_RETRY_DELAYS_MS: readonly number[] = [3000, 8000];

/**
 * True when `error` is a network-level failure (fetch threw instead of
 * returning a Response). HTTP error responses never reach here as thrown
 * errors, so they are never classified as network failures.
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  if (error instanceof Error) {
    if (error.name === 'TypeError') return true;
    return /failed to fetch|network ?error|network request failed|load failed|the network connection was lost|connection (refused|reset|aborted|timed out)|fetch failed|ECONNREFUSED|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN/i.test(
      error.message
    );
  }
  return false;
}

export interface NetworkRetryOptions {
  /** Delays (ms) before each retry; defaults to NETWORK_RETRY_DELAYS_MS. */
  delays?: readonly number[];
  /**
   * Called before each retry with the 1-based retry attempt number and the
   * delay that will be waited. Use it to show an in-progress status.
   */
  onRetry?: (attempt: number, delayMs: number, error: unknown) => void;
}

/**
 * Run `doFetch`, retrying it on network-level failures only.
 * Retries `delays.length` more times (default 2), waiting `delays[i]`
 * before retry `i + 1`. Re-throws the last error once retries are
 * exhausted, or immediately for non-network errors.
 */
export async function fetchWithNetworkRetry<T>(
  doFetch: () => Promise<T>,
  options: NetworkRetryOptions = {}
): Promise<T> {
  const delays = options.delays ?? NETWORK_RETRY_DELAYS_MS;
  for (let attempt = 0; ; attempt++) {
    try {
      return await doFetch();
    } catch (error) {
      if (!isNetworkError(error) || attempt >= delays.length) throw error;
      const delayMs = delays[attempt];
      options.onRetry?.(attempt + 1, delayMs, error);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}
