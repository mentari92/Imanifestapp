import { IsInt, Min, Max } from "class-validator";
import { Type } from "class-transformer";

export class GetAudioUrlDto {
  @Type(() => Number)
  @IsInt({ message: "reciterId must be a valid integer" })
  @Min(1, { message: "reciterId must be a positive number" })
  reciterId!: number;

  @Type(() => Number)
  @IsInt({ message: "surahNumber must be a valid integer" })
  @Min(1, { message: "surahNumber must be at least 1" })
  @Max(114, { message: "surahNumber must be at most 114" })
  surahNumber!: number;
}