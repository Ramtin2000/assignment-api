import {
  IsArray,
  IsString,
  IsOptional,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInterviewDto {
  @ApiProperty({
    description: 'List of technical skills to generate interview questions for',
    example: ['JavaScript', 'React', 'Node.js', 'TypeScript'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  skills: string[];

  @ApiPropertyOptional({
    description: 'Number of questions to generate per skill',
    example: 3,
    default: 3,
    minimum: 1,
    maximum: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  questionsPerSkill?: number;

  @ApiPropertyOptional({
    description: 'Difficulty level of the questions',
    example: 'intermediate',
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'intermediate',
  })
  @IsOptional()
  @IsString()
  difficulty?: 'beginner' | 'intermediate' | 'advanced';

  @ApiPropertyOptional({
    description: 'Additional context or specific focus areas',
    example: 'Focus on best practices and performance optimization',
  })
  @IsOptional()
  @IsString()
  context?: string;
}
