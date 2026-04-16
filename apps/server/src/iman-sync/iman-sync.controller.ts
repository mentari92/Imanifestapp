import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ImanSyncService } from "./iman-sync.service";
import { AnalyzeDto } from "./dto/analyze.dto";
import { JwtAuthGuard } from "../auth/auth.guard";
import { Public } from "../auth/public.decorator";
import { RedisService } from "../common/redis.service";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Rate limit configuration — DISABLED for Hackathon
const TEXT_RATE_LIMIT = 99999; 
const VISION_RATE_LIMIT = 99999; 
const RATE_WINDOW_SECONDS = 3600;

@Controller("iman-sync")
@UseGuards(JwtAuthGuard)
export class ImanSyncController {
  constructor(
    private readonly imanSyncService: ImanSyncService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Check rate limit using Redis counter.
   * Graceful degradation: if Redis unavailable, allow request through.
   */
  private async checkRateLimit(
    userId: string,
    endpoint: string,
    maxRequests: number,
  ): Promise<void> {
    const key = `rate:iman-sync:${endpoint}:${userId}`;
    const count = await this.redis.incr(key, RATE_WINDOW_SECONDS);

    // If Redis is unavailable, count will be 0 — allow request
    if (count === 0) return;

    if (count > maxRequests) {
      throw new HttpException(
        {
          statusCode: 429,
          message: `Rate limit exceeded. You can make at most ${maxRequests} ${endpoint} requests per hour. Please try again later.`,
          error: "Too Many Requests",
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  @Public()
  @Post("quick-search")
  async quickSearch(
    @Request() req: { user?: { userId: string } },
    @Body("text") text: string,
  ) {
    if (!text?.trim()) return { verses: [] };
    return this.imanSyncService.quickSearch(text);
  }

  @Public()
  @Post("analyze")
  async analyze(
    @Request() req: { user?: { userId: string } },
    @Body() dto: AnalyzeDto,
  ) {
    const userId = req.user?.userId ?? "demo-user-hackathon";
    await this.checkRateLimit(userId, "text", TEXT_RATE_LIMIT);
    return this.imanSyncService.analyze(userId, dto);
  }

  @Public()
  @Post("analyze-vision")
  @UseInterceptors(
    FileInterceptor("image", {
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
        if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              "Invalid file type. Only JPG and PNG images are allowed.",
            ),
            false,
          );
        }
      },
    }),
  )
  async analyzeVision(
    @Request() req: { user?: { userId: string } },
    @Body("intentText") intentText: string,
    @UploadedFile() file?: any,
  ) {
    if (!intentText?.trim()) {
      throw new BadRequestException("intentText is required");
    }
    if (intentText.length > 500) {
      throw new BadRequestException("intentText must be 500 characters or less");
    }
    if (!file) {
      throw new BadRequestException("Image file is required");
    }

    const userId = req.user?.userId ?? "demo-user-hackathon";
    await this.checkRateLimit(userId, "vision", VISION_RATE_LIMIT);

    const imageBase64 = file.buffer.toString("base64");
    const imagePath = `vision:${Date.now()}`;

    return this.imanSyncService.analyzeVision(
      userId,
      intentText.trim(),
      imageBase64,
      file.mimetype,
      imagePath,
    );
  }
}
