import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";
import { VerseResult } from "./quran-api.service";

interface McpTool {
  name: string;
}

@Injectable()
export class QuranMcpService {
  private readonly logger = new Logger(QuranMcpService.name);
  private readonly mcpUrl = process.env.QURAN_MCP_URL || "https://mcp.quran.ai/";

  private sessionId: string | null = null;
  private searchToolName: string | null = null;
  private groundingToolName: string | null = null;
  private groundingNonce: string | null = null;
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

  private parseMcpResponsePayload(raw: unknown): any {
    if (!raw) return null;
    if (typeof raw === "object") return raw;
    if (typeof raw !== "string") return null;

    const dataLines = raw
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .filter(Boolean);

    for (let i = dataLines.length - 1; i >= 0; i--) {
      try {
        return JSON.parse(dataLines[i]);
      } catch {
        // keep trying
      }
    }

    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  private tryJsonParse(raw: string): any {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  private async mcpPost(payload: unknown, timeout = 10000): Promise<any> {
    const response = await axios.post(this.mcpUrl, payload, {
      headers: this.headers(),
      timeout,
      responseType: "text",
      transformResponse: [(data) => data],
    });

    const sid = response.headers["mcp-session-id"] as string | undefined;
    if (sid) this.sessionId = sid;

    const parsed = this.parseMcpResponsePayload(response.data);
    if (!parsed) {
      throw new Error("Invalid MCP response payload");
    }
    if (parsed.error) {
      throw new Error(parsed.error?.message || "MCP response error");
    }
    return parsed;
  }

  async initialize(): Promise<boolean> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async (): Promise<boolean> => {
      try {
        await this.mcpPost(
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
          8000,
        );

        await this.mcpPost(
          { jsonrpc: "2.0", method: "notifications/initialized", params: {} },
          5000,
        ).catch(() => {});

        const toolsRes = await this.mcpPost(
          { jsonrpc: "2.0", id: this.nextId(), method: "tools/list", params: {} },
          8000,
        );

        const listedTools: McpTool[] = toolsRes?.result?.tools || [];

        this.searchToolName =
          listedTools.find((t) => t.name === "search_quran")?.name ||
          listedTools.find((t) => t.name.toLowerCase().includes("search") && t.name.toLowerCase().includes("quran"))?.name ||
          listedTools.find((t) => t.name.toLowerCase().includes("search"))?.name ||
          null;

        this.groundingToolName = listedTools.find((t) => t.name === "fetch_grounding_rules")?.name || null;

        await this.ensureGroundingNonce();

        this.logger.log(
          `Quran MCP initialized - session: ${this.sessionId ?? "none"}, search tool: ${this.searchToolName ?? "not found"}`,
        );
        return true;
      } catch (err: any) {
        this.logger.warn(
          `Quran MCP init failed: ${err.response?.data ? JSON.stringify(err.response.data) : err.message}`,
        );
        this.initPromise = null;
        return false;
      }
    })();

    const ok = await this.initPromise;
    if (!ok) this.initPromise = null;
    return ok;
  }

  private async ensureGroundingNonce(): Promise<void> {
    if (!this.groundingToolName || this.groundingNonce) return;

    try {
      const res = await this.mcpPost(
        {
          jsonrpc: "2.0",
          id: this.nextId(),
          method: "tools/call",
          params: {
            name: this.groundingToolName,
            arguments: {},
          },
        },
        8000,
      );

      const mcpResult = res?.result || {};
      const structured = mcpResult.structuredContent;
      const textPayload = Array.isArray(mcpResult.content)
        ? mcpResult.content.find((c: { type?: string }) => c.type === "text")?.text
        : null;
      const parsedText = typeof textPayload === "string" ? this.tryJsonParse(textPayload) : null;
      const payload = structured || parsedText;

      if (payload?.grounding_nonce) {
        this.groundingNonce = payload.grounding_nonce;
      }
    } catch (err: any) {
      this.logger.warn(
        `Quran MCP grounding setup skipped: ${err.response?.data ? JSON.stringify(err.response.data) : err.message}`,
      );
    }
  }

  async searchVerses(query: string, size = 3): Promise<VerseResult[] | null> {
    if (!this.searchToolName) {
      const ok = await this.initialize();
      if (!ok || !this.searchToolName) return null;
    }

    await this.ensureGroundingNonce();

    try {
      const res = await this.mcpPost(
        {
          jsonrpc: "2.0",
          id: this.nextId(),
          method: "tools/call",
          params: {
            name: this.searchToolName,
            arguments: {
              query,
              translations: "en-abdel-haleem",
              ...(this.groundingNonce ? { grounding_nonce: this.groundingNonce } : {}),
            },
          },
        },
        10000,
      );

      const mcpResult = res?.result || {};
      const structured = mcpResult.structuredContent;
      const textPayload = Array.isArray(mcpResult.content)
        ? mcpResult.content.find((c: { type?: string }) => c.type === "text")?.text
        : "";
      const parsedText = typeof textPayload === "string" ? this.tryJsonParse(textPayload) : null;

      const data = structured || parsedText;
      const results: any[] = data?.results || [];
      if (results.length === 0) return null;

      return results.slice(0, size).map((r) => {
        const rawTranslation =
          r.translations?.find((t: any) => t.edition?.id === "en-abdel-haleem")?.text ||
          r.translations?.find((t: any) => t.edition?.id === "en-sahih-international")?.text ||
          r.translations?.[0]?.text ||
          "";

        return {
          verseKey: r.ayah_key as string,
          arabicText: (r.text || "") as string,
          translation: this.cleanText(rawTranslation) || "Translation unavailable",
          tafsirSnippet: "",
        };
      });
    } catch (err: any) {
      this.logger.warn(
        `Quran MCP search failed: ${err.response?.data ? JSON.stringify(err.response.data) : err.message}`,
      );
      this.sessionId = null;
      this.searchToolName = null;
      this.groundingToolName = null;
      this.groundingNonce = null;
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