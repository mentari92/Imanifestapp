import {
  Controller,
  Get,
  Post,
  Body,
  Request,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { JwtAuthGuard } from "../auth/auth.guard";
import { Public } from "../auth/public.decorator";
import { QalbService } from "./qalb.service";

const ALLOWED_AUDIO_MIME_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/x-m4a",
];
const MAX_AUDIO_SIZE = 10 * 1024 * 1024;
const MAX_TRANSCRIPT_LENGTH = 5000;

@Controller("qalb")
@UseGuards(JwtAuthGuard)
export class QalbController {
  constructor(private readonly qalbService: QalbService) {}

  private resolveUserId(req: { user?: { userId: string } }): string {
    return req.user?.userId ?? "demo-user-hackathon";
  }

  @Public()
  @Post("reflect")
  async reflectText(
    @Request() req: { user?: { userId: string } },
    @Body() body: { transcriptText: string },
  ) {
    if (!body.transcriptText?.trim()) {
      throw new BadRequestException("transcriptText is required");
    }
    if (body.transcriptText.length > MAX_TRANSCRIPT_LENGTH) {
      throw new BadRequestException(
        `transcriptText must be ${MAX_TRANSCRIPT_LENGTH} characters or less`,
      );
    }

    return this.qalbService.reflectText(
      this.resolveUserId(req),
      body.transcriptText.trim(),
    );
  }

  @Public()
  @Post("reflect-voice")
  @UseInterceptors(
    FileInterceptor("audio", {
      limits: { fileSize: MAX_AUDIO_SIZE },
      fileFilter: (_req, file, cb) => {
        if (ALLOWED_AUDIO_MIME_TYPES.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              `Invalid audio type. Allowed: ${ALLOWED_AUDIO_MIME_TYPES.join(", ")}`,
            ),
            false,
          );
        }
      },
    }),
  )
  async reflectVoice(
    @Request() req: { user?: { userId: string } },
    @Body("transcriptText") transcriptText: string,
    @UploadedFile() file?: any,
  ) {
    if (!transcriptText?.trim()) {
      throw new BadRequestException("transcriptText is required");
    }
    if (transcriptText.length > MAX_TRANSCRIPT_LENGTH) {
      throw new BadRequestException(
        `transcriptText must be ${MAX_TRANSCRIPT_LENGTH} characters or less`,
      );
    }
    if (!file) {
      throw new BadRequestException("Audio file is required");
    }

    const audioPath = `voice:${Date.now()}`;
    return this.qalbService.reflectVoice(
      this.resolveUserId(req),
      audioPath,
      transcriptText.trim(),
    );
  }

  @Get("history")
  async getHistory(@Request() req: { user?: { userId: string } }) {
    return this.qalbService.getHistory(this.resolveUserId(req));
  }

  @Post("history")
  async getHistoryPost(@Request() req: { user?: { userId: string } }) {
    return this.qalbService.getHistory(this.resolveUserId(req));
  }
}
