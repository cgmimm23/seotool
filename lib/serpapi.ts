export interface SerpResult {
  position: number
  title: string
  link: string
  displayed_link: string
  snippet: string
}

export interface SerpResponse {
  organic_results: SerpResult[]
  search_metadata: { total_time_taken: number }
}

export async function fetchSerpResults(
  keyword: string,
  apiKey: string,
  location = 'United States'
): Promise<SerpResponse> {
  const params = new URLSearchParams({
    q: keyword,
    api_key: apiKey,
    engine: 'google',
    num: '10',
    location,
    hl: 'en',
    gl: 'us',
  })

  const res = await fetch(`https://serpapi.com/search.json?${params}`, {
    next: { revalidate: 0 },
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`SerpAPI error ${res.status}: ${err}`)
  }

  return res.json()
}

export function getPositionChange(
  current: number | null,
  previous: number | null
): number {
  if (!current || !previous) return 0
  return previous - current // positive = moved up
}
