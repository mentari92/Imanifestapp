import { IsBoolean } from "class-validator";

export class UpdateTaskDto {
  @IsBoolean()
  isCompleted!: boolean;
}