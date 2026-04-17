import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";

@Injectable()
export class ZhipuService {
  private readonly logger = new Logger(ZhipuService.name);
  private readonly zhipuApiKey = process.env.ZHIPU_API_KEY || "";
  private readonly openRouterApiKey = process.env.OPENROUTER_API_KEY || "";
  private readonly baseUrl = "https://open.bigmodel.cn/api/paas/v4";
  private readonly openRouterUrl = "https://openrouter.ai/api/v1/chat/completions";

  private static readonly GLM_BASE_HEADERS: Record<string, string> = {
    "Content-Type": "application/json",
  };

  private static readonly THEME_FALLBACK = ["patience", "gratitude", "trust in Allah"];
  private static readonly TASK_FALLBACK = [
    "Shalat 5 waktu tepat waktu hari ini",
    "Baca Al-Quran 10-15 menit setelah Subuh",
    "Tulis 3 syukur spesifik sebelum tidur",
    "Perbanyak istighfar 100x dengan sadar",
    "Lakukan 1 ikhtiar dunia nyata untuk tujuanmu",
  ];

  private hasAnyAiProvider(): boolean {
    return Boolean(this.zhipuApiKey || this.openRouterApiKey);
  }

  private extractThemesHeuristic(text: string): string[] {
    const source = text.toLowerCase();
    const bucket: string[] = [];

    const pick = (regex: RegExp, value: string) => {
      if (regex.test(source) && !bucket.includes(value)) bucket.push(value);
    };

    pick(/sedih|galau|cemas|anxious|takut|gagal|kehilangan|down/, "patience");
    pick(/syukur|nikmat|grateful|alhamdulillah/, "gratitude");
    pick(/rezeki|pekerjaan|karier|kerja|usaha|bisnis/, "provision");
    pick(/dosa|taubat|ampun|istighfar/, "repentance");
    pick(/doa|hajat|keinginan|manifest|niat|cita/, "supplication");
    pick(/tenang|hati|qalb|damai|gelisah/, "remembrance of Allah");
    pick(/keluarga|ortu|suami|istri|anak|silaturahmi/, "family ties");

    while (bucket.length < 3) {
      const candidate = ZhipuService.THEME_FALLBACK[bucket.length];
      if (!bucket.includes(candidate)) bucket.push(candidate);
    }

    return bucket.slice(0, 3);
  }

  async extractThemes(intentText: string): Promise<string[]> {
    const systemPrompt = `You are an Islamic spiritual guide and Quran scholar.
Extract the 3 most relevant Islamic spiritual themes from the user's intention.
Return ONLY a valid JSON array of English keywords.
Example: ["tawakkul","sabr","shukr"]
Do not include any explanation or extra text.`;

    if (!this.hasAnyAiProvider()) {
      return this.extractThemesHeuristic(intentText);
    }

    try {
      const response = await this.callGLM5(systemPrompt, intentText);
      const parsed = this.parseJSONResponse<string[]>(response);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.slice(0, 3);
      }
      return this.extractThemesHeuristic(intentText);
    } catch (error) {
      this.logger.error("Failed to extract themes", error);
      return this.extractThemesHeuristic(intentText);
    }
  }

  async generateSummary(
    intentText: string,
    verses: { verseKey: string; translation: string }[],
  ): Promise<string> {
    const versesContext = verses
      .map((v) => `${v.verseKey}: ${v.translation}`)
      .join("\n");

    const systemPrompt = `You are a warm, knowledgeable Islamic life coach.
Given the user's intention and related Quranic verses, write a concise and practical guidance.
IMPORTANT: Detect the language of the user's intention and respond in the SAME language.
If the intention is in English, respond in English. If Indonesian, respond in Indonesian. If Arabic, respond in Arabic.
Return 2 short paragraphs:
1) spiritual reassurance with a cited verse key
2) concrete next steps for today.`;

    const userMessage = `Intention: ${intentText}\n\nVerses:\n${versesContext}`;

    if (!this.hasAnyAiProvider()) {
      const verse = verses[0];
      if (verse) {
        return `Allah understands your struggle. Hold onto ${verse.verseKey}: "${verse.translation}" as an anchor for your heart — stay calm and keep moving forward.\n\nToday's step: choose 1 small ikhtiar you can complete in 30 minutes, close with a sincere dua, then reflect on your progress before sleeping.`;
      }
      return "Allah never abandons a servant who keeps striving. Protect your heart with dhikr and continue with small, consistent efforts.\n\nToday's step: set one realistic goal, work on it without distraction, then close with gratitude for every small step forward.";
    }

    try {
      const response = await this.callGLM5(systemPrompt, userMessage);
      const cleaned = response.trim();
      if (cleaned) return cleaned;
      throw new Error("Empty summary response");
    } catch (error) {
      this.logger.error("Failed to generate summary", error);
      const verse = verses[0];
      if (verse) {
        return `Allah understands your struggle. Hold onto ${verse.verseKey}: "${verse.translation}" as an anchor for your heart.\n\nToday's step: choose 1 small ikhtiar you can complete in 30 minutes, close with a sincere dua, then reflect on your progress.`;
      }
      return "Allah never abandons a servant who keeps striving. Protect your heart with dhikr and continue with small, consistent efforts.\n\nToday's step: set one realistic goal, work on it without distraction, then close with gratitude for every small step forward.";
    }
  }

  private generateTasksHeuristic(
    intentText: string,
    verses: { verseKey: string; translation: string }[],
  ): string[] {
    const source = intentText.toLowerCase();
    const tasks: string[] = [];

    tasks.push("Perform all 5 daily prayers on time and track your consistency");

    if (/pekerjaan|kerja|karier|cv|lamaran|work|job|career|resume/.test(source)) {
      tasks.push("Update your CV/portfolio and send at least 2 job applications today");
    } else if (/bisnis|usaha|jualan|business|startup/.test(source)) {
      tasks.push("Validate 1 business idea: reach out to 3 potential customers");
    } else {
      tasks.push("Work on your top priority task for 45 minutes of focused effort");
    }

    if (/utang|cicilan|keuangan|rezeki|debt|money|finance/.test(source)) {
      tasks.push("Create a 7-day financial plan: essentials, savings target, and spending limit");
    } else {
      tasks.push("Write 3 specific things you are grateful for and 1 lesson from today");
    }

    const verse = verses[0];
    if (verse?.verseKey) {
      tasks.push(`Read and reflect on verse ${verse.verseKey} for 10 minutes`);
    } else {
      tasks.push("Read 2 pages of the Quran after one of your obligatory prayers");
    }

    tasks.push("Close the day with a specific dua for your intention and evaluate your progress");

    return tasks.slice(0, 5);
  }

  async generateTasks(
    intentText: string,
    verses: { verseKey: string; translation: string }[],
  ): Promise<string[]> {
    const versesContext = verses
      .map((v) => `${v.verseKey}: ${v.translation}`)
      .join("\n");

    const systemPrompt = `You are an Islamic life coach creating practical action plans.
Given the user's intention and related Quranic verses, generate exactly 5 actionable steps (Ikhtiar).
IMPORTANT: Detect the language of the user's intention and respond in the SAME language.
If the intention is in English, write tasks in English. If Indonesian, write in Indonesian. If Arabic, write in Arabic.
Return ONLY a valid JSON array of 5 short action descriptions (max 120 chars each).
Do not include any explanation or extra text.`;

    const userMessage = `Intention: ${intentText}\n\nVerses:\n${versesContext}`;

    if (!this.hasAnyAiProvider()) {
      return this.generateTasksHeuristic(intentText, verses);
    }

    try {
      const response = await this.callGLM5(systemPrompt, userMessage);
      const parsed = this.parseJSONResponse<string[]>(response);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.slice(0, 5);
      }
      return this.generateTasksHeuristic(intentText, verses);
    } catch (error) {
      this.logger.error("Failed to generate tasks", error);
      return this.generateTasksHeuristic(intentText, verses);
    }
  }

  async generateReflectionInsight(
    transcriptText: string,
    sentiment: string,
  ): Promise<{ spiritual: string; tafsir: string; scientific: string }> {
    const systemPrompt = `You are a warm Islamic counselor combining Quranic wisdom with modern science.
Analyze the user's reflection and return ONLY a JSON object with keys spiritual, tafsir, scientific.
IMPORTANT: Detect the language of the user's text and respond in the SAME language (English, Indonesian, or Arabic).
Include one Quran verse citation in spiritual.`;

    if (!this.hasAnyAiProvider()) {
      const verseCitation = sentiment === "anxious" || sentiment === "struggling" ? "(94:5-6)" : "(13:28)";
      return {
        spiritual: `Your feelings are valid, and Allah is never far from a servant who calls upon Him. Hold onto His promise ${verseCitation} and keep moving with sabr and tawakkul.`,
        tafsir: "In brief: trials are not signs of abandonment, but spaces for iman to grow. When the heart returns to Allah, life's direction becomes clearer.",
        scientific: "Psychologically, directed dua, gratitude journaling, and regulated breathing help reduce stress, stabilize emotions, and improve decision-making focus.",
      };
    }

    try {
      const response = await this.callGLM5(systemPrompt, `${transcriptText}\nSentiment: ${sentiment}`);
      const parsed = this.parseJSONResponse<{ spiritual: string; tafsir: string; scientific: string }>(response);
      if (parsed?.spiritual && parsed?.tafsir && parsed?.scientific) {
        return parsed;
      }
      throw new Error("Invalid reflection JSON");
    } catch (error) {
      this.logger.error("Failed to generate reflection insight", error);
      return {
        spiritual: "Your feelings are valid, and Allah is never far from a servant who calls upon Him. Hold onto His promise (13:28) and keep moving with sabr and tawakkul.",
        tafsir: "In brief: peace of heart grows when the heart stays connected to Allah and effort is carried out with discipline.",
        scientific: "Psychologically, directed dua, gratitude journaling, and regulated breathing help reduce stress, stabilize emotions, and improve decision-making focus.",
      };
    }
  }

  async analyzeSentiment(
    transcriptText: string,
  ): Promise<{ label: string; score: number }> {
    const source = transcriptText.toLowerCase();
    const sentimentHeuristic = (): { label: string; score: number } => {
      if (/syukur|alhamdulillah|lega|tenang|damai/.test(source)) return { label: "grateful", score: 0.86 };
      if (/sedih|cemas|takut|stres|gelisah|bingung|capek/.test(source)) return { label: "anxious", score: 0.33 };
      if (/berusaha|ikhtiar|fokus|bangkit/.test(source)) return { label: "hopeful", score: 0.71 };
      return { label: "uncertain", score: 0.5 };
    };

    if (!this.hasAnyAiProvider()) {
      return sentimentHeuristic();
    }

    const systemPrompt = `You are an Islamic spiritual counselor analyzing sentiment.
Return ONLY JSON object with keys label and score.
label must be one of: hopeful, grateful, peaceful, content, focused, anxious, struggling, uncertain, heavy, other
score between 0 and 1.`;

    try {
      const response = await this.callGLM5(systemPrompt, transcriptText);
      const parsed = this.parseJSONResponse<{ label: string; score: number }>(response);
      if (parsed?.label && typeof parsed.score === "number") {
        return {
          label: parsed.label,
          score: Math.max(0, Math.min(1, parsed.score)),
        };
      }
      return sentimentHeuristic();
    } catch (error) {
      this.logger.error("Failed to analyze sentiment", error);
      return sentimentHeuristic();
    }
  }

  async extractThemesVision(
    intentText: string,
    imageBase64: string,
    mimeType: string,
  ): Promise<string[]> {
    const userMessage = `Analyze image + intention and extract 3 Islamic themes as JSON array only. Intention: ${intentText}`;

    if (!this.hasAnyAiProvider()) {
      return this.extractThemesHeuristic(intentText);
    }

    try {
      const response = await this.callGLM5Vision(userMessage, imageBase64, mimeType);
      const parsed = this.parseJSONResponse<string[]>(response);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.slice(0, 3);
      }
      return this.extractThemesHeuristic(intentText);
    } catch (error) {
      this.logger.error("Failed to extract themes from vision", error);
      return this.extractThemesHeuristic(intentText);
    }
  }

  private async callGLM5(
    systemPrompt: string,
    userMessage: string,
  ): Promise<string> {
    if (!this.openRouterApiKey) {
      throw new Error("No AI provider configured");
    }

    const models = [
      "google/gemini-3-flash-preview",
      "deepseek/deepseek-chat-v3-0324",
    ];

    for (const model of models) {
      try {
        const response = await axios.post(
          this.openRouterUrl,
          {
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userMessage },
            ],
            temperature: 0.4,
          },
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${this.openRouterApiKey}`,
              "HTTP-Referer": "https://imanifestapp.com",
              "X-Title": "IManifestApp",
            },
            timeout: 15000,
          },
        );
        const content = response.data?.choices?.[0]?.message?.content || "";
        if (content) {
          if (model !== models[0]) this.logger.warn(`Used fallback model: ${model}`);
          return content;
        }
      } catch (error: any) {
        this.logger.warn(`OpenRouter [${model}] error: ${error.response?.data?.error?.message || error.message}`);
      }
    }

    throw new Error("All OpenRouter models unavailable");
  }

  private async callGLM5Vision(
    userMessage: string,
    imageBase64: string,
    mimeType: string,
  ): Promise<string> {
    if (!this.openRouterApiKey) {
      throw new Error("No AI provider configured");
    }

    const systemPrompt = `You are an Islamic spiritual guide and Quran scholar.
Extract the 3 most relevant Islamic spiritual themes from the user's intention and image.
Return ONLY a valid JSON array of English keywords.`;

    const models = ["google/gemini-3-flash-preview", "deepseek/deepseek-chat-v3-0324"];

    for (const model of models) {
      try {
        const response = await axios.post(
          this.openRouterUrl,
          {
            model,
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
          },
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${this.openRouterApiKey}`,
              "HTTP-Referer": "https://imanifestapp.com",
              "X-Title": "IManifestApp",
            },
            timeout: 14000,
          },
        );
        const content = response.data?.choices?.[0]?.message?.content || "";
        if (content) return content;
      } catch (error: any) {
        this.logger.warn(`OpenRouter vision [${model}] error: ${error.response?.data?.error?.message || error.message}`);
      }
    }

    throw new Error("All OpenRouter vision models unavailable");
  }

  private parseJSONResponse<T>(text: string): T | null {
    if (!text) return null;

    try {
      const direct = JSON.parse(text);
      return direct as T;
    } catch {
      // continue
    }

    try {
      const cleaned = text
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```$/i, "")
        .trim();

      const startIndex = cleaned.search(/[\[{]/);
      const lastBracket = cleaned.lastIndexOf("]");
      const lastBrace = cleaned.lastIndexOf("}");
      const endIndex = Math.max(lastBracket, lastBrace);

      if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
        return null;
      }

      const jsonStr = cleaned.substring(startIndex, endIndex + 1);
      return JSON.parse(jsonStr) as T;
    } catch (error: any) {
      this.logger.warn(`Failed to parse JSON response: ${error.message}`);
      return null;
    }
  }
}
