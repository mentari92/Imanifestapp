import { IsString, IsNotEmpty, MaxLength } from "class-validator";

export class AnalyzeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  intentText!: string;
}
