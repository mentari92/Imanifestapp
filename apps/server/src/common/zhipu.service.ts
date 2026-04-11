import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";

/**
 * GLM-5 (Zhipu AI) client for ImanSync text analysis.
 * Handles theme extraction and verse summary generation.
 */
@Injectable()
export class ZhipuService {
  private readonly logger = new Logger(ZhipuService.name);
  private readonly apiKey = process.env.ZHIPU_API_KEY || "";
  private readonly baseUrl = "https://open.bigmodel.cn/api/paas/v4";

  private static readonly THEME_FALLBACK = ["tawakkul", "sabr", "shukr"];
  private static readonly TASK_FALLBACK = [
    "Pray all 5 daily prayers on time",
    "Read Quran for 10 minutes daily",
    "Give charity this week",
    "Make dua for your intention",
    "Write daily gratitude reflections",
  ];

  /**
   * Extract 3 Islamic spiritual themes from intent text using GLM-5.
   */
  async extractThemes(intentText: string): Promise<string[]> {
    const systemPrompt = `You are an Islamic spiritual guide and Quran scholar.
Extract the 3 most relevant Islamic spiritual themes from the user's intention.
Return ONLY a valid JSON array of English keywords.
Example: ["tawakkul","sabr","shukr"]
Do not include any explanation or extra text.`;

    try {
      const response = await this.callGLM5(systemPrompt, intentText);
      const parsed = this.parseJSONResponse<string[]>(response);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.slice(0, 3);
      }
      this.logger.warn("Unexpected themes response, using fallback");
      return [...ZhipuService.THEME_FALLBACK];
    } catch (error) {
      this.logger.error("Failed to extract themes", error);
      return [...ZhipuService.THEME_FALLBACK];
    }
  }

  /**
   * Generate a 2-sentence spiritual validation summary using GLM-5.
   */
  async generateSummary(
    intentText: string,
    verses: { verseKey: string; translation: string }[],
  ): Promise<string> {
    const versesContext = verses
      .map((v) => `${v.verseKey}: ${v.translation}`)
      .join("\n");

    const systemPrompt = `You are a warm, knowledgeable Islamic life coach.
Given the user's intention and 3 related Quranic verses, write a 2-sentence spiritual 
validation in English — affirming their intention through the lens of these verses.
Be sincere and specific to the actual verses. Avoid generic phrasing.`;

    const userMessage = `Intention: ${intentText}\n\nVerses:\n${versesContext}`;

    try {
      const response = await this.callGLM5(systemPrompt, userMessage);
      return response.trim();
    } catch (error) {
      this.logger.error("Failed to generate summary", error);
      return "Your intention aligns with the Quranic guidance of striving for what is good. May Allah bless your journey.";
    }
  }

  /**
   * Generate 5 actionable Ikhtiar steps from intention + verses using GLM-5.
   */
  async generateTasks(
    intentText: string,
    verses: { verseKey: string; translation: string }[],
  ): Promise<string[]> {
    const versesContext = verses
      .map((v) => `${v.verseKey}: ${v.translation}`)
      .join("\n");

    const systemPrompt = `You are an Islamic life coach creating practical action plans.
Given the user's intention and related Quranic verses, generate exactly 5 actionable steps (Ikhtiar).
Each step should be specific, practical, and spiritually grounded.
Return ONLY a valid JSON array of 5 short action descriptions (max 100 chars each).
Example: ["Pray Fajr on time for 7 days","Read Surah Al-Baqarah daily","Give charity this Friday","Call a family member to maintain ties","Write 3 gratitude points each night"]
Do not include any explanation or extra text.`;

    const userMessage = `Intention: ${intentText}\n\nVerses:\n${versesContext}`;

    try {
      const response = await this.callGLM5(systemPrompt, userMessage);
      const parsed = this.parseJSONResponse<string[]>(response);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.slice(0, 5);
      }
      this.logger.warn("Unexpected tasks response, using fallback");
      return [...ZhipuService.TASK_FALLBACK];
    } catch (error) {
      this.logger.error("Failed to generate tasks", error);
      return [...ZhipuService.TASK_FALLBACK];
    }
  }

  /**
   * Analyze sentiment of a reflection text using GLM-5.
   */
  async analyzeSentiment(
    transcriptText: string,
  ): Promise<{ label: string; score: number }> {
    const systemPrompt = `You are an Islamic spiritual counselor analyzing the sentiment of a reflection.
Return ONLY a valid JSON object with "label" and "score" fields.
"label" must be one of: hopeful, grateful, peaceful, content, focused, anxious, struggling, uncertain, heavy, other
"score" must be a number between 0.0 (very negative) and 1.0 (very positive).
Example: {"label":"grateful","score":0.85}
Do not include any explanation or extra text.`;

    try {
      const response = await this.callGLM5(systemPrompt, transcriptText);
      const parsed = this.parseJSONResponse<{ label: string; score: number }>(response);
      if (parsed?.label && typeof parsed.score === "number") {
        return {
          label: parsed.label,
          score: Math.max(0, Math.min(1, parsed.score)),
        };
      }
      return { label: "other", score: 0.5 };
    } catch (error) {
      this.logger.error("Failed to analyze sentiment", error);
      return { label: "other", score: 0.5 };
    }
  }

  /**
   * Extract 3 Islamic spiritual themes from image + intent text using GLM-5V.
   */
  async extractThemesVision(
    intentText: string,
    imageBase64: string,
    mimeType: string,
  ): Promise<string[]> {
    const userMessage = `Analyze the image and the user's intention: "${intentText}". Identify 3 core Islamic spiritual themes relevant to both. Return ONLY a JSON array of theme keywords.`;

    try {
      const response = await this.callGLM5Vision(userMessage, imageBase64, mimeType);
      const parsed = this.parseJSONResponse<string[]>(response);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.slice(0, 3);
      }
      this.logger.warn("Unexpected vision themes response, using fallback");
      return [...ZhipuService.THEME_FALLBACK];
    } catch (error) {
      this.logger.error("Failed to extract themes from vision", error);
      return [...ZhipuService.THEME_FALLBACK];
    }
  }

  /**
   * Core GLM-5 API call via OpenAI-compatible endpoint.
   */
  private async callGLM5(
    systemPrompt: string,
    userMessage: string,
  ): Promise<string> {
    const response = await axios.post(
      `${this.baseUrl}/chat/completions`,
      {
        model: "glm-4-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.7,
        max_tokens: 500,
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      },
    );

    return response.data?.choices?.[0]?.message?.content || "";
  }

  /**
   * GLM-5V multimodal call — accepts base64 image + text prompt.
   */
  private async callGLM5Vision(
    userMessage: string,
    imageBase64: string,
    mimeType: string,
  ): Promise<string> {
    const systemPrompt = `You are an Islamic spiritual guide and Quran scholar.
Extract the 3 most relevant Islamic spiritual themes from the user's intention and the provided image.
Return ONLY a valid JSON array of English keywords.
Example: ["tawakkul","sabr","shukr"]
Do not include any explanation or extra text.`;

    const response = await axios.post(
      `${this.baseUrl}/chat/completions`,
      {
        model: "glm-4v-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userMessage },
              {
                type: "image_url",
                image_url: { url: `data:${mimeType};base64,${imageBase64}` },
              },
            ],
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 20000,
      },
    );

    return response.data?.choices?.[0]?.message?.content || "";
  }

  /**
   * Parse JSON from GLM-5 response (handles markdown code blocks).
   */
  private parseJSONResponse<T>(text: string): T {
    // Strip markdown code blocks if present
    const cleaned = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    return JSON.parse(cleaned) as T;
  }
}