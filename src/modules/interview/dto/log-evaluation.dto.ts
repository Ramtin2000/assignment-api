import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';

export class LogEvaluationDto {
  @IsString()
  sessionId: string;

  @IsString()
  question: string;

  @IsString()
  answer: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  score?: number;

  @IsOptional()
  @IsString()
  feedback?: string;
}
