export interface ArxivResult {
    title: string;
    url: string;
    uri: string;
    author: string;
    image: string;
    snippet: string;
}

export class ArxivService {
    private readonly baseUrl = 'https://export.arxiv.org/api/query';

    async search(query: string, maxResults: number = 3): Promise<ArxivResult[]> {
        try {
            console.log(`[arXiv] Searching for: "${query}"...`);
            // ArXiv API expects query in 'all:query' or similar format
            const searchUrl = `${this.baseUrl}?search_query=all:${encodeURIComponent(query)}&start=0&max_results=${maxResults}`;
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

            const response = await fetch(searchUrl, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (!response.ok) {
                console.error(`[arXiv] API error: ${response.status} ${response.statusText}`);
                return [];
            }

            const xmlText = await response.text();
            console.log(`[arXiv] Received XML length: ${xmlText.length}`);
            
            const results = this.parseArxivXml(xmlText);
            console.log(`[arXiv] Parsed ${results.length} results`);
            return results;
        } catch (error) {
            console.error('[arXiv] Search error:', error);
            return [];
        }
    }

    private parseArxivXml(xml: string): ArxivResult[] {
        const results: ArxivResult[] = [];
        // Improved Regex to match <entry>...</entry> blocks more reliably
        const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
        let match;

        while ((match = entryRegex.exec(xml)) !== null) {
            const entryContent = match[1];

            // Extract Title - handling potential namespaces or extra tags
            const titleMatch = entryContent.match(/<title>([\s\S]*?)<\/title>/i);
            const title = titleMatch ? titleMatch[1].replace(/[\n\r\t]+/g, ' ').trim() : 'No Title';

            // Extract URL - prioritizing the abstract page or PDF link
            // Arxiv usually has multiple <link> tags. We look for the one with title="pdf" or type="text/html"
            let url = '';
            const links = entryContent.match(/<link[^>]+href=["']([^"']+)["'][^>]*\/>/gi) || [];
            for (const link of links) {
                const hrefMatch = link.match(/href=["']([^"']+)["']/i);
                if (hrefMatch) {
                    const href = hrefMatch[1];
                    // Prefer PDF links or the main abs link
                    if (href.includes('pdf') || !url) {
                        url = href;
                    }
                }
            }

            // Extract Author (first one found)
            const authorMatch = entryContent.match(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>/i);
            const author = authorMatch ? authorMatch[1].trim() : 'Unknown Author';

            // Extract Summary (snippet)
            const summaryMatch = entryContent.match(/<summary>([\s\S]*?)<\/summary>/i);
            const snippet = summaryMatch ? summaryMatch[1].replace(/[\n\r\t]+/g, ' ').trim() : '';

            results.push({
                title: `[arXiv] ${title}`,
                url: url,
                uri: url,
                author: author,
                image: 'https://arxiv.org/static/browse/0.3.4/images/icons/favicon.ico',
                snippet: snippet
            });
        }

        return results;
    }
}

export const arxivService = new ArxivService();
