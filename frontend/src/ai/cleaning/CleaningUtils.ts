export class CleaningUtils {
  // Fetches the text content of any URL via Firecrawl, returned as markdown or AI-extracted JSON.
  // If a prompt is provided, uses Firecrawl's AI extraction to return only the relevant content.
  static async fetchPageText(url: string, prompt?: string): Promise<string> {
    const body: Record<string, any> = {
      url,
      onlyMainContent: true,
      waitFor: 2000, // wait 2s for JS-rendered content to load
    };

    if (prompt) {
      body.formats = [{ type: 'json', prompt }];
    } else {
      body.formats = ['markdown'];
    }

    const response = await fetch('https://api.firecrawl.dev/v2/scrape', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${import.meta.env.VITE_FIRECRAWL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Firecrawl scrape failed for ${url}: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (prompt) {
      const extracted = data.data?.json;
      return typeof extracted === 'string' ? extracted : JSON.stringify(extracted);
    }
    return data.data.markdown as string;
  }
}
