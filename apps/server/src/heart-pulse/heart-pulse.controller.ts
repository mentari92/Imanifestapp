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
import { HeartPulseService } from "./heart-pulse.service";

@Controller("heart-pulse")
@UseGuards(JwtAuthGuard)
export class HeartPulseController {
  constructor(private readonly heartPulseService: HeartPulseService) {}

  /** Text-based reflection */
  @Post("reflect")
  async reflectText(
    @Request() req: { user: { userId: string } },
    @Body() body: { transcriptText: string },
  ) {
    if (!body.transcriptText?.trim()) {
      throw new BadRequestException("transcriptText is required");
    }
    return this.heartPulseService.reflectText(
      req.user.userId,
      body.transcriptText.trim(),
    );
  }

  /** Voice-based reflection */
  @Post("reflect-voice")
  @UseInterceptors(FileInterceptor("audio"))
  async reflectVoice(
    @Request() req: { user: { userId: string } },
    @Body("transcriptText") transcriptText: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!transcriptText?.trim()) {
      throw new BadRequestException("transcriptText is required");
    }
    if (!file) {
      throw new BadRequestException("Audio file is required");
    }

    const audioPath = `voice:${file.originalname}:${Date.now()}`;
    return this.heartPulseService.reflectVoice(
      req.user.userId,
      audioPath,
      transcriptText.trim(),
    );
  }

  /** Get reflection history + streak */
  @Get("history")
  async getHistory(@Request() req: { user: { userId: string } }) {
    return this.handleHistory(req.user.userId);
  }

  /** Get reflection history + streak (POST — legacy alias) */
  @Post("history")
  async getHistoryPost(@Request() req: { user: { userId: string } }) {
    return this.handleHistory(req.user.userId);
  }

  private handleHistory(userId: string) {
    return this.heartPulseService.getHistory(userId);
  }
}
