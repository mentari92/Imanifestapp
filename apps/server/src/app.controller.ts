import { Controller, Get, Header } from "@nestjs/common";
import { Public } from "./auth/public.decorator";

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ImanifestApp — Islamic Law of Attraction</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(160deg, #064E3B 0%, #065F46 50%, #054035 100%);
      color: #F1F5F0;
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
      background: linear-gradient(135deg, #E3C567, #F5D878, #CA9A3C);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 0.5rem;
    }
    .subtitle { font-size: 1.1rem; color: #A7F3D0; margin-bottom: 2rem; }
    .status {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(227, 197, 103, 0.15);
      border: 1px solid rgba(227, 197, 103, 0.4);
      border-radius: 9999px;
      padding: 0.4rem 1rem;
      font-size: 0.9rem;
      color: #E3C567;
      margin-bottom: 2rem;
    }
    .status::before {
      content: '';
      width: 8px;
      height: 8px;
      background: #E3C567;
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
      background: rgba(241, 245, 240, 0.07);
      border: 1px solid rgba(227, 197, 103, 0.2);
      border-radius: 12px;
      padding: 1rem;
    }
    .feature .icon { font-size: 1.5rem; margin-bottom: 0.3rem; }
    .feature .name { font-weight: 600; font-size: 0.95rem; margin-bottom: 0.2rem; color: #E3C567; }
    .feature .desc { font-size: 0.8rem; color: #6EE7B7; }
    .api-badge {
      display: inline-block;
      background: rgba(84, 22, 27, 0.4);
      border: 1px solid rgba(253, 164, 175, 0.3);
      border-radius: 8px;
      padding: 0.5rem 1rem;
      font-size: 0.85rem;
      color: #FDA4AF;
      margin-top: 1rem;
    }
    .footer { margin-top: 2rem; font-size: 0.8rem; color: #6EE7B7; }
    @media (max-width: 480px) { .features { grid-template-columns: 1fr; } h1 { font-size: 1.8rem; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">🕌</div>
    <h1>ImanifestApp</h1>
    <p class="subtitle">Imanifest : Islamic Law of Attraction</p>
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