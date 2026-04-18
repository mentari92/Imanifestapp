import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";

@Injectable()
export class ZhipuService {
  private readonly logger = new Logger(ZhipuService.name);
  private readonly zhipuApiKey = process.env.ZHIPU_API_KEY || "";
  private readonly openRouterApiKey = process.env.OPENROUTER_API_KEY || "";

  private readonly openRouterUrl = "https://openrouter.ai/api/v1/chat/completions";
  private readonly zhipuUrl =
    process.env.ZHIPU_API_URL || "https://open.bigmodel.cn/api/paas/v4/chat/completions";
  private readonly zhipuModel = process.env.ZHIPU_MODEL || "glm-4-flash";
  private readonly openRouterTextModels = [
    "google/gemini-3-flash-preview",
    "deepseek/deepseek-chat-v3-0324",
    "deepseek/deepseek-chat",
  ];
  private readonly openRouterVisionModels = ["google/gemini-3-flash-preview"];

  private static readonly THEME_FALLBACK = ["patience", "gratitude", "trust in Allah"];

  private hasAnyAiProvider(): boolean {
    return Boolean(this.openRouterApiKey || this.zhipuApiKey);
  }

  private parseJSONResponse<T>(text: string): T | null {
    if (!text) return null;

    try {
      return JSON.parse(text) as T;
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

  private cleanGeneratedText(text: string): string {
    return String(text || "")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/__(.*?)__/g, "$1")
      .replace(/^#+\s*/gm, "")
      .replace(/^[-*]\s+/gm, "")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  private humanizeEnglish(text: string): string {
    const source = this.cleanGeneratedText(text);
    if (!source) return source;

    // Skip non-English dominant text to avoid damaging Indonesian/Arabic outputs.
    const englishHits = (source.match(/\b(the|and|you|your|with|for|that|this|will|can|may)\b/gi) || []).length;
    if (englishHits < 2) {
      return source;
    }

    return source
      .replace(/\bAdditionally,?\s*/gi, "")
      .replace(/\bMoreover,?\s*/gi, "")
      .replace(/\bFurthermore,?\s*/gi, "")
      .replace(/\bIt is important to note that\b/gi, "")
      .replace(/\bIt'?s worth noting that\b/gi, "")
      .replace(/\bserves as\b/gi, "is")
      .replace(/\bstands as\b/gi, "is")
      .replace(/\bcrucial\b/gi, "important")
      .replace(/\bpivotal\b/gi, "important")
      .replace(/\bunderscore(s|d)?\b/gi, "show$1")
      .replace(/\bshowcasing\b/gi, "showing")
      .replace(/\bIn order to\b/gi, "To")
      .replace(/\bDue to the fact that\b/gi, "Because")
      .replace(/\s{2,}/g, " ")
      .replace(/\s+([,.!?;:])/g, "$1")
      .trim();
  }

  private detectPreferredLanguage(text: string): "english" | "indonesian" | "arabic" {
    const source = String(text || "").trim();

    if (/[\u0600-\u06FF]/.test(source)) {
      return "arabic";
    }

    if (/\b(saya|aku|ingin|rezeki|syukur|ikhtiar|doa|niat|kerja|usaha|tenang|hati)\b/i.test(source)) {
      return "indonesian";
    }

    return "english";
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

  private async callOpenRouter(systemPrompt: string, userMessage: string): Promise<string> {
    if (!this.openRouterApiKey) {
      throw new Error("OpenRouter key not configured");
    }

    const models = this.openRouterTextModels;

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
          if (model !== models[0]) this.logger.warn(`OpenRouter fallback model used: ${model}`);
          return content;
        }
      } catch (error: any) {
        this.logger.warn(`OpenRouter [${model}] error: ${error.response?.data?.error?.message || error.message}`);
      }
    }

    throw new Error("All OpenRouter models unavailable");
  }

  private async callZhipu(systemPrompt: string, userMessage: string): Promise<string> {
    if (!this.zhipuApiKey) {
      throw new Error("Zhipu key not configured");
    }

    const models = [this.zhipuModel, "glm-4-flash", "glm-4-plus"];

    for (const model of models) {
      try {
        const response = await axios.post(
          this.zhipuUrl,
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
              Authorization: `Bearer ${this.zhipuApiKey}`,
            },
            timeout: 15000,
          },
        );

        const content = response.data?.choices?.[0]?.message?.content || "";
        if (content) {
          if (model !== models[0]) this.logger.warn(`Zhipu fallback model used: ${model}`);
          return content;
        }
      } catch (error: any) {
        this.logger.warn(`Zhipu [${model}] error: ${error.response?.data?.error?.message || error.message}`);
      }
    }

    throw new Error("All Zhipu models unavailable");
  }

  private async callTextAI(systemPrompt: string, userMessage: string): Promise<string> {
    if (this.openRouterApiKey) {
      return this.callOpenRouter(systemPrompt, userMessage);
    }

    if (this.zhipuApiKey) {
      this.logger.warn("OpenRouter key missing, falling back to Zhipu provider");
      return this.callZhipu(systemPrompt, userMessage);
    }

    throw new Error("No AI provider configured");
  }

  private async callVisionAI(userMessage: string, imageBase64: string, mimeType: string): Promise<string> {
    const systemPrompt = `You are an Islamic spiritual guide and Quran scholar.
Extract the 3 most relevant Islamic spiritual themes from the user's intention and image.
Return ONLY a valid JSON array of English keywords.`;

    if (this.openRouterApiKey) {
      const models = this.openRouterVisionModels;

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
              timeout: 16000,
            },
          );

          const content = response.data?.choices?.[0]?.message?.content || "";
          if (content) return content;
        } catch (error: any) {
          this.logger.warn(`OpenRouter vision [${model}] error: ${error.response?.data?.error?.message || error.message}`);
        }
      }
    }

    if (this.zhipuApiKey) {
      try {
        this.logger.warn("OpenRouter key missing for vision flow, falling back to Zhipu provider");
        const response = await axios.post(
          this.zhipuUrl,
          {
            model: this.zhipuModel,
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
              Authorization: `Bearer ${this.zhipuApiKey}`,
            },
            timeout: 16000,
          },
        );

        const content = response.data?.choices?.[0]?.message?.content || "";
        if (content) return content;
      } catch (error: any) {
        this.logger.warn(`Zhipu vision error: ${error.response?.data?.error?.message || error.message}`);
      }
    }

    throw new Error("All vision providers unavailable");
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
      const response = await this.callTextAI(systemPrompt, intentText);
      const parsed = this.parseJSONResponse<string[]>(response);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.slice(0, 3);
      }
      return this.extractThemesHeuristic(intentText);
    } catch (error) {
      this.logger.warn(`extractThemes fallback: ${error instanceof Error ? error.message : error}`);
      return this.extractThemesHeuristic(intentText);
    }
  }

  async generateSummary(
    intentText: string,
    verses: { verseKey: string; translation: string }[],
  ): Promise<string> {
    const versesContext = verses.map((v) => `${v.verseKey}: ${v.translation}`).join("\n");
    const targetLanguage = this.detectPreferredLanguage(intentText);

    const systemPrompt = `You are a warm, knowledgeable Islamic life coach.
Given the user's intention and related Quranic verses, write a concise and practical guidance.
Respond in ${targetLanguage}.
If the user writes in English, use plain and natural English.
Do not switch to Arabic unless the user explicitly writes in Arabic.
Return 2 short paragraphs:
1) spiritual reassurance with a cited verse key
2) concrete next steps for today.`;

    if (!this.hasAnyAiProvider()) {
      const verse = verses[0];
      if (verse) {
        return `Allah understands your struggle. Hold onto ${verse.verseKey}: "${verse.translation}" as an anchor for your heart.\n\nToday's step: choose one small ikhtiar you can complete in 30 minutes, close with sincere dua, then reflect before sleep.`;
      }
      return "Allah never abandons a servant who keeps striving. Protect your heart with dhikr and continue with small, consistent effort.\n\nToday's step: set one realistic goal, complete it with discipline, then close with gratitude.";
    }

    try {
      const response = await this.callTextAI(systemPrompt, `Intention: ${intentText}\n\nVerses:\n${versesContext}`);
      const cleaned = response.trim();
      if (!cleaned) throw new Error("Empty summary response");
      return targetLanguage === "english"
        ? this.humanizeEnglish(cleaned)
        : this.cleanGeneratedText(cleaned);
    } catch (error) {
      this.logger.warn(`generateSummary fallback: ${error instanceof Error ? error.message : error}`);
      const verse = verses[0];
      if (verse) {
        return `Allah understands your struggle. Hold onto ${verse.verseKey}: "${verse.translation}" as an anchor for your heart.\n\nToday's step: choose one small ikhtiar you can complete in 30 minutes, close with sincere dua, then reflect before sleep.`;
      }
      return "Allah never abandons a servant who keeps striving. Protect your heart with dhikr and continue with small, consistent effort.\n\nToday's step: set one realistic goal, complete it with discipline, then close with gratitude.";
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
      tasks.push("Update your CV or portfolio and send at least 2 applications today");
    } else if (/bisnis|usaha|jualan|business|startup/.test(source)) {
      tasks.push("Validate one business idea by speaking with 3 potential users");
    } else {
      tasks.push("Work on your highest-priority task for 45 minutes with full focus");
    }

    if (/utang|cicilan|keuangan|rezeki|debt|money|finance/.test(source)) {
      tasks.push("Create a 7-day financial plan with spending and savings limits");
    } else {
      tasks.push("Write 3 specific gratitude points and one lesson from today");
    }

    const verse = verses[0];
    if (verse?.verseKey) {
      tasks.push(`Read and reflect on verse ${verse.verseKey} for 10 minutes`);
    } else {
      tasks.push("Read 2 pages of the Quran after one obligatory prayer");
    }

    tasks.push("Close the day with specific dua for your intention and review progress");

    return tasks.slice(0, 5);
  }

  async generateTasks(
    intentText: string,
    verses: { verseKey: string; translation: string }[],
  ): Promise<string[]> {
    const versesContext = verses.map((v) => `${v.verseKey}: ${v.translation}`).join("\n");
    const targetLanguage = this.detectPreferredLanguage(intentText);

    const systemPrompt = `You are an Islamic life coach creating practical action plans.
Generate exactly 5 actionable steps (Ikhtiar).
Respond in ${targetLanguage}.
If the user writes in English, use plain and natural English.
Do not switch to Arabic unless the user explicitly writes in Arabic.
Return ONLY a valid JSON array of 5 short action descriptions.
Do not include explanation text.`;

    if (!this.hasAnyAiProvider()) {
      return this.generateTasksHeuristic(intentText, verses);
    }

    try {
      const response = await this.callTextAI(systemPrompt, `Intention: ${intentText}\n\nVerses:\n${versesContext}`);
      const parsed = this.parseJSONResponse<string[]>(response);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.slice(0, 5).map((item) =>
          targetLanguage === "english"
            ? this.humanizeEnglish(item)
            : this.cleanGeneratedText(item),
        );
      }
      return this.generateTasksHeuristic(intentText, verses);
    } catch (error) {
      this.logger.warn(`generateTasks fallback: ${error instanceof Error ? error.message : error}`);
      return this.generateTasksHeuristic(intentText, verses);
    }
  }

  async generateReflectionInsight(
    transcriptText: string,
    sentiment: string,
  ): Promise<{
    spiritual: string;
    tafsir: string;
    scientific: string;
    hadith: Array<{ reference: string; text: string }>;
    logicalPath: string[];
  }> {
    const systemPrompt = `You are a warm Islamic counselor combining Quranic wisdom with modern science.
Return ONLY a JSON object with keys spiritual, tafsir, scientific, hadith, logicalPath.
Rules for hadith:
- hadith must be an array of exactly 2 items
- each item must contain: reference, text
- reference must include source name and hadith number when possible
Rules for logicalPath:
- logicalPath must be an array of exactly 3 short steps
- each step must be practical, realistic, and directly tied to the user's problem
- each step should be one sentence, max 20 words
Writing style:
- use clear, natural, human-sounding English
- avoid buzzwords, cliches, and over-formal wording
- keep wording simple and easy to understand for non-native speakers`;

    if (!this.hasAnyAiProvider()) {
      const verseCitation = sentiment === "anxious" || sentiment === "struggling" ? "(94:5-6)" : "(13:28)";
      return {
        spiritual: `Your feelings are valid, and Allah is near to the one who calls Him. Hold to His promise ${verseCitation}.`,
        tafsir: "Trials are not abandonment. They can be the place where iman deepens and direction becomes clearer.",
        scientific: "Regulated breathing, gratitude writing, and mindful prayer can reduce stress and improve clarity.",
        hadith: [
          {
            reference: "Sahih Muslim 2699",
            text: "Whoever relieves a believer's distress, Allah will relieve his distress on the Day of Resurrection.",
          },
          {
            reference: "Sahih Bukhari 6464",
            text: "Be in this world as though you were a stranger or a traveler.",
          },
        ],
        logicalPath: [
          "Pause and breathe slowly for one minute before making any decision.",
          "Write one action you can finish today and do it before sunset.",
          "End the day with dua and trust Allah with what you cannot control.",
        ],
      };
    }

    try {
      const response = await this.callTextAI(systemPrompt, `${transcriptText}\nSentiment: ${sentiment}`);
      const parsed = this.parseJSONResponse<{
        spiritual: string;
        tafsir: string;
        scientific: string;
        hadith?: Array<{ reference?: string; text?: string }>;
        logicalPath?: string[];
      }>(response);
      if (parsed?.spiritual && parsed?.tafsir && parsed?.scientific) {
        const hadith = Array.isArray(parsed.hadith)
          ? parsed.hadith
              .filter((item) => item?.reference && item?.text)
              .slice(0, 2)
              .map((item) => ({
                reference: String(item.reference),
                text: String(item.text),
              }))
          : [];

        const logicalPath = Array.isArray(parsed.logicalPath)
          ? parsed.logicalPath
              .filter((step) => typeof step === "string" && step.trim().length > 0)
              .slice(0, 3)
              .map((step) => this.cleanGeneratedText(String(step)))
          : [];

        return {
          spiritual: this.humanizeEnglish(parsed.spiritual),
          tafsir: this.humanizeEnglish(parsed.tafsir),
          scientific: this.humanizeEnglish(parsed.scientific),
          hadith:
            hadith.length > 0
              ? hadith
                  .map((item) => ({
                    reference: this.cleanGeneratedText(item.reference),
                    text: this.humanizeEnglish(item.text),
                  }))
              : [
                  {
                    reference: "Sahih Muslim 2699",
                    text: "Whoever relieves a believer's distress, Allah will relieve his distress on the Day of Resurrection.",
                  },
                  {
                    reference: "Sunan Ibn Majah 4241",
                    text: "The best deeds are those done consistently, even if they are small.",
                  },
                ],
          logicalPath:
            logicalPath.length > 0
              ? logicalPath.map((step) => this.humanizeEnglish(step))
              : [
                  "Pause and breathe slowly for one minute before making any decision.",
                  "Pick one practical action you can complete today, then do it now.",
                  "Close with dua and keep your next step small but consistent.",
                ],
        };
      }
      throw new Error("Invalid reflection JSON");
    } catch (error) {
      this.logger.warn(`generateReflectionInsight fallback: ${error instanceof Error ? error.message : error}`);
      return {
        spiritual: "Your feelings are valid, and Allah is near to the one who calls Him. Hold to His promise (13:28).",
        tafsir: "Peace of heart grows when we return to Allah and stay consistent in effort.",
        scientific: "Regulated breathing, gratitude writing, and mindful prayer can reduce stress and improve clarity.",
        hadith: [
          {
            reference: "Sahih Muslim 2699",
            text: "Whoever relieves a believer's distress, Allah will relieve his distress on the Day of Resurrection.",
          },
          {
            reference: "Sunan Ibn Majah 4241",
            text: "The best deed is that which is done consistently, even if it is small.",
          },
        ],
        logicalPath: [
          "Pause for a minute and calm your breathing before taking action.",
          "Choose one step you can complete today and focus only on that.",
          "Make dua tonight and continue with one steady step tomorrow.",
        ],
      };
    }
  }

  async analyzeSentiment(
    transcriptText: string,
  ): Promise<{ label: string; score: number }> {
    const source = transcriptText.toLowerCase();
    const heuristic = (): { label: string; score: number } => {
      if (/syukur|alhamdulillah|lega|tenang|damai/.test(source)) return { label: "grateful", score: 0.86 };
      if (/sedih|cemas|takut|stres|gelisah|bingung|capek/.test(source)) return { label: "anxious", score: 0.33 };
      if (/berusaha|ikhtiar|fokus|bangkit/.test(source)) return { label: "hopeful", score: 0.71 };
      return { label: "uncertain", score: 0.5 };
    };

    if (!this.hasAnyAiProvider()) {
      return heuristic();
    }

    const systemPrompt = `You are an Islamic spiritual counselor analyzing sentiment.
Return ONLY JSON object with keys label and score.
label must be one of: hopeful, grateful, peaceful, content, focused, anxious, struggling, uncertain, heavy, other
score must be between 0 and 1.`;

    try {
      const response = await this.callTextAI(systemPrompt, transcriptText);
      const parsed = this.parseJSONResponse<{ label: string; score: number }>(response);
      if (parsed?.label && typeof parsed.score === "number") {
        return {
          label: parsed.label,
          score: Math.max(0, Math.min(1, parsed.score)),
        };
      }
      return heuristic();
    } catch (error) {
      this.logger.warn(`analyzeSentiment fallback: ${error instanceof Error ? error.message : error}`);
      return heuristic();
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
      const response = await this.callVisionAI(userMessage, imageBase64, mimeType);
      const parsed = this.parseJSONResponse<string[]>(response);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.slice(0, 3);
      }
      return this.extractThemesHeuristic(intentText);
    } catch (error) {
      this.logger.warn(`extractThemesVision fallback: ${error instanceof Error ? error.message : error}`);
      return this.extractThemesHeuristic(intentText);
    }
  }
}
