import { Controller, Get, Header } from "@nestjs/common";
import { Public } from "./auth/public.decorator";

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ImanifestApp — Islamic Spiritual Wellness</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%);
      color: #e2e8f0;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }
    .container { max-width: 600px; text-align: center; }
    .logo { font-size: 3rem; margin-bottom: 0.5rem; }
    h1 {
      font-size: 2.2rem;
      background: linear-gradient(135deg, #60a5fa, #a78bfa, #f472b6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 0.5rem;
    }
    .subtitle { font-size: 1.1rem; color: #94a3b8; margin-bottom: 2rem; }
    .status {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(34, 197, 94, 0.15);
      border: 1px solid rgba(34, 197, 94, 0.3);
      border-radius: 9999px;
      padding: 0.4rem 1rem;
      font-size: 0.9rem;
      color: #4ade80;
      margin-bottom: 2rem;
    }
    .status::before {
      content: '';
      width: 8px;
      height: 8px;
      background: #4ade80;
      border-radius: 50%;
      animation: pulse 2s infinite;
    }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
    .features {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-bottom: 2rem;
      text-align: left;
    }
    .feature {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 1rem;
    }
    .feature .icon { font-size: 1.5rem; margin-bottom: 0.3rem; }
    .feature .name { font-weight: 600; font-size: 0.95rem; margin-bottom: 0.2rem; }
    .feature .desc { font-size: 0.8rem; color: #94a3b8; }
    .api-badge {
      display: inline-block;
      background: rgba(96, 165, 250, 0.15);
      border: 1px solid rgba(96, 165, 250, 0.3);
      border-radius: 8px;
      padding: 0.5rem 1rem;
      font-size: 0.85rem;
      color: #60a5fa;
      margin-top: 1rem;
    }
    .footer { margin-top: 2rem; font-size: 0.8rem; color: #475569; }
    @media (max-width: 480px) { .features { grid-template-columns: 1fr; } h1 { font-size: 1.8rem; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">🕌</div>
    <h1>ImanifestApp</h1>
    <p class="subtitle">Islamic Spiritual Wellness App</p>
    <div class="status">All Systems Operational</div>
    <div class="features">
      <div class="feature">
        <div class="icon">🤲</div>
        <div class="name">Iman Sync</div>
        <div class="desc">AI-powered intention analysis with Quran verses</div>
      </div>
      <div class="feature">
        <div class="icon">✅</div>
        <div class="name">Dua To-Do</div>
        <div class="desc">Smart task generation from your prayers</div>
      </div>
      <div class="feature">
        <div class="icon">💚</div>
        <div class="name">Heart Pulse</div>
        <div class="desc">Voice journaling with sentiment analysis</div>
      </div>
      <div class="feature">
        <div class="icon">🎧</div>
        <div class="name">Sakinah</div>
        <div class="desc">Quran audio player with beautiful reciters</div>
      </div>
    </div>
    <div class="api-badge">📡 API v1.0.0 — Backend Running</div>
    <div class="footer">
      <p>&copy; 2026 ImanifestApp &middot; Built with &#10084;&#65039; for the Ummah</p>
    </div>
  </div>
</body>
</html>`;

@Controller()
export class AppController {
  @Public()
  @Get()
  @Header("Content-Type", "text/html; charset=utf-8")
  welcome(): string {
    return LANDING_HTML;
  }

  @Public()
  @Get("health")
  health() {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Public()
  @Get("api-info")
  apiInfo() {
    return {
      name: "ImanifestApp API",
      version: "1.0.0",
      status: "running",
      endpoints: {
        auth: { register: "POST /auth/register", login: "POST /auth/login" },
        imanSync: "POST /iman-sync/analyze",
        duaTodo: "POST /dua-to-do/generate",
        heartPulse: "POST /heart-pulse/reflect",
        sakinah: {
          reciters: "GET /sakinah/reciters",
          surahs: "GET /sakinah/surahs",
          audio: "GET /sakinah/audio",
        },
        dashboard: "GET /dashboard/overview (requires auth)",
      },
    };
  }
}