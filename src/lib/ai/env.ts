/**
 * Returns true only if the given env var is set to a non-empty,
 * non-whitespace-only string. Some deployment platforms (and copy/paste
 * mistakes in .dev.vars / dashboard secret forms) leave a key set to ""
 * or "   " rather than leaving it unset entirely — plain `!!process.env.X`
 * treats that as "configured" and the provider then fails with a confusing
 * HTTP 401 instead of being cleanly skipped in failover.
 */
export function hasEnv(name: string): boolean {
  const value = process.env[name];
  return typeof value === "string" && value.trim().length > 0;
}
