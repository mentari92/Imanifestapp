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
import { RedisService } from "../common/redis.service";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Rate limit configuration
const TEXT_RATE_LIMIT = 10; // max 10 text requests per hour
const VISION_RATE_LIMIT = 5; // max 5 vision requests per hour
const RATE_WINDOW_SECONDS = 3600; // 1 hour

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

  @Post("analyze")
  async analyze(
    @Request() req: { user: { userId: string } },
    @Body() dto: AnalyzeDto,
  ) {
    await this.checkRateLimit(req.user.userId, "text", TEXT_RATE_LIMIT);
    return this.imanSyncService.analyze(req.user.userId, dto);
  }

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
    @Request() req: { user: { userId: string } },
    @Body("intentText") intentText: string,
    @UploadedFile() file?: Express.Multer.File,
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

    await this.checkRateLimit(req.user.userId, "vision", VISION_RATE_LIMIT);

    const imageBase64 = file.buffer.toString("base64");
    const imagePath = `vision:${Date.now()}`;

    return this.imanSyncService.analyzeVision(
      req.user.userId,
      intentText.trim(),
      imageBase64,
      file.mimetype,
      imagePath,
    );
  }
}
