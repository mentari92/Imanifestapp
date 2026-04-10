import { IsString, IsNotEmpty } from "class-validator";

export class GenerateTasksDto {
  @IsString()
  @IsNotEmpty()
  manifestationId!: string;
}