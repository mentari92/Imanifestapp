import { Injectable } from "@nestjs/common";
import axios from "axios";

/**
 * Placeholder GLM-5 (Zhipu AI) client.
 * Will be implemented in Story 2.1 (ImanSync Text Analysis).
 */
@Injectable()
export class ZhipuService {
  private readonly apiKey = process.env.ZHIPU_API_KEY || "";
  private readonly baseUrl = "https://open.bigmodel.cn/api/paas/v4";

  async analyzeIntent(intentText: string): Promise<{
    verses: string[];
    summary: string;
    tasks: string[];
  }> {
    // Placeholder — returns empty data
    return { verses: [], summary: "", tasks: [] };
  }

  async analyzeSentiment(text: string): Promise<{
    sentiment: string;
    score: number;
  }> {
    // Placeholder — returns neutral
    return { sentiment: "neutral", score: 0.5 };
  }
}