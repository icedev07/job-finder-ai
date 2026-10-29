// Thrown when a provider tells us to back off (rate limit, quota, budget, bad
// key). The analyzer treats this as a clean batch stop (leaves the row
// PENDING) rather than a per-job failure that would otherwise mark every
// queued job REJECTED. The rotation parks the provider for retryAfterMs.
export class LLMRateLimitedError extends Error {
  retryAfterMs: number;
  daily: boolean;
  constructor(message: string, retryAfterMs: number, daily = false) {
    super(message);
    this.name = "LLMRateLimitedError";
    this.retryAfterMs = retryAfterMs;
    this.daily = daily;
  }
}
