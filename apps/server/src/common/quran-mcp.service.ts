import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";
import { VerseResult } from "./quran-api.service";

interface McpTool {
  name: string;
  description?: string;
}

@Injectable()
export class QuranMcpService {
  private readonly logger = new Logger(QuranMcpService.name);
  private readonly MCP_URL = "https://mcp.quran.ai/";

  private sessionId: string | null = null;
  private searchToolName: string | null = null;
  private initPromise: Promise<boolean> | null = null;
  private msgId = 0;

  private nextId(): number {
    return ++this.msgId;
  }

  private headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...(this.sessionId ? { "Mcp-Session-Id": this.sessionId } : {}),
    };
  }

  // One-time MCP handshake: initialize → initialized notification → tools/list
  async initialize(): Promise<boolean> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async (): Promise<boolean> => {
      try {
        // Step 1: initialize
        const initRes = await axios.post(
          this.MCP_URL,
          {
            jsonrpc: "2.0",
            id: this.nextId(),
            method: "initialize",
            params: {
              protocolVersion: "2024-11-05",
              capabilities: {},
              clientInfo: { name: "imanifest-server", version: "1.0.0" },
            },
          },
          { headers: this.headers(), timeout: 8000 },
        );

        // Some MCP servers return a session ID header
        const sid = initRes.headers["mcp-session-id"] as string | undefined;
        if (sid) this.sessionId = sid;

        // Step 2: send initialized notification (no response expected)
        await axios.post(
          this.MCP_URL,
          { jsonrpc: "2.0", method: "notifications/initialized", params: {} },
          { headers: this.headers(), timeout: 5000 },
        ).catch(() => {}); // notification — ignore errors

        // Step 3: list available tools
        const toolsRes = await axios.post(
          this.MCP_URL,
          { jsonrpc: "2.0", id: this.nextId(), method: "tools/list", params: {} },
          { headers: this.headers(), timeout: 8000 },
        );

        const tools: McpTool[] = toolsRes.data?.result?.tools ?? [];
        const searchTool = tools.find(
          (t) => t.name === "search" || t.name.toLowerCase().includes("search"),
        );
        this.searchToolName = searchTool?.name ?? null;

        this.logger.log(
          `Quran MCP initialized — session: ${this.sessionId ?? "none"}, search tool: "${this.searchToolName ?? "not found"}"`,
        );
        return true;
      } catch (err: any) {
        this.logger.warn(
          `Quran MCP init failed: ${err.response?.data ? JSON.stringify(err.response.data) : err.message}`,
        );
        this.initPromise = null; // allow retry
        return false;
      }
    })();

    const result = await this.initPromise;
    if (!result) this.initPromise = null;
    return result;
  }

  async searchVerses(query: string, size = 3): Promise<VerseResult[] | null> {
    // Lazy init
    if (!this.searchToolName) {
      const ok = await this.initialize();
      if (!ok || !this.searchToolName) return null;
    }

    try {
      const res = await axios.post(
        this.MCP_URL,
        {
          jsonrpc: "2.0",
          id: this.nextId(),
          method: "tools/call",
          params: {
            name: this.searchToolName,
            arguments: {
              q: query,
              size,
              language: "en",
              translations: "85,131",
            },
          },
        },
        { headers: this.headers(), timeout: 10000 },
      );

      // MCP tool result: { result: { content: [{ type: "text", text: "..." }] } }
      const content = res.data?.result?.content as Array<{ type: string; text?: string }> | undefined;
      const textContent =
        (Array.isArray(content)
          ? content.find((c) => c.type === "text")?.text
          : (content as any)?.text) ?? "";

      if (!textContent) return null;

      const data = JSON.parse(textContent);
      const results: any[] = data?.search?.results ?? data?.results ?? [];
      if (results.length === 0) return null;

      return results.slice(0, size).map((r) => {
        const raw =
          r.translations?.find((t: any) => t.resource_id === 85)?.text ||
          r.translations?.find((t: any) => t.resource_id === 131)?.text ||
          r.translations?.[0]?.text ||
          "";
        return {
          verseKey: r.verse_key as string,
          arabicText: (r.text_uthmani || r.text || "") as string,
          translation: raw
            ? this.cleanText(raw)
            : "Translation unavailable",
          tafsirSnippet: "",
        };
      });
    } catch (err: any) {
      this.logger.warn(
        `Quran MCP search failed: ${err.response?.data ? JSON.stringify(err.response.data) : err.message}`,
      );
      // Reset session so next call re-initializes
      this.sessionId = null;
      this.searchToolName = null;
      this.initPromise = null;
      return null;
    }
  }

  private cleanText(text: string): string {
    return text
      .replace(/<[^>]*>/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
}
