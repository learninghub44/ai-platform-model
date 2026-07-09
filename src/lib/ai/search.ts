import { hasEnv } from "./env";

export interface WebSearchResult {
  title: string;
  url: string;
  content: string;
}

export function webSearchConfigured(): boolean {
  return hasEnv("TAVILY_API_KEY");
}

/**
 * Runs a Tavily search and returns a handful of results. Never throws —
 * a search failure degrades to "no results" rather than blocking the chat
 * message, since the AI generation itself is more important than the
 * search augmenting it.
 */
export async function webSearch(query: string, maxResults = 5): Promise<WebSearchResult[]> {
  if (!webSearchConfigured() || !query.trim()) return [];

  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query,
        search_depth: "basic",
        max_results: maxResults,
        include_answer: false,
      }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results ?? []).map((r: any) => ({
      title: r.title ?? r.url,
      url: r.url,
      content: (r.content ?? "").slice(0, 1000),
    }));
  } catch {
    return [];
  }
}

/** Formats results into a system-role context block the model can cite from. */
export function formatSearchContext(results: WebSearchResult[]): string {
  if (results.length === 0) return "";
  const items = results
    .map((r, i) => `[${i + 1}] ${r.title} — ${r.url}\n${r.content}`)
    .join("\n\n");
  return (
    `Live web search results for the user's latest message (use these for anything time-sensitive ` +
    `or where your training data may be outdated; cite sources by their [number] where relevant):\n\n${items}`
  );
}
