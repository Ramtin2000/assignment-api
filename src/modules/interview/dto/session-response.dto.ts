import { ApiProperty } from '@nestjs/swagger';

export class EvaluationResponseDto {
  @ApiProperty({ example: 0 })
  questionIndex: number;

  @ApiProperty({ example: 8.5, minimum: 0, maximum: 10 })
  score: number;

  @ApiProperty({
    example: 'The candidate demonstrated good understanding of the concept...',
  })
  feedback: string;

  @ApiProperty({
    example: ['Clear explanation', 'Good examples'],
    type: [String],
  })
  strengths: string[];

  @ApiProperty({
    example: ['Could provide more detail', 'Missing edge cases'],
    type: [String],
  })
  weaknesses: string[];
}

export class SessionResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  interviewId: string;

  @ApiProperty({ example: 0 })
  currentQuestionIndex: number;

  @ApiProperty({
    example: 'in-progress',
    enum: ['not-started', 'in-progress', 'completed'],
  })
  status: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', nullable: true })
  startedAt: Date | null;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', nullable: true })
  completedAt: Date | null;

  @ApiProperty({ type: [EvaluationResponseDto], required: false })
  evaluations?: EvaluationResponseDto[];

  @ApiProperty({ example: 8.2, required: false })
  overallScore?: number;

  @ApiProperty({
    example:
      'Overall, the candidate demonstrated strong understanding of core concepts with a few areas for deeper exploration.',
    required: false,
  })
  summary?: string;

  @ApiProperty({
    example: [
      'Review advanced React performance optimization techniques.',
      'Practice explaining system design trade-offs more concretely.',
    ],
    required: false,
    type: [String],
  })
  recommendations?: string[];

  @ApiProperty({
    description: 'Average score and question count per skill',
    required: false,
    example: [
      { skill: 'React', averageScore: 8.5, questionCount: 3 },
      { skill: 'Node.js', averageScore: 7.8, questionCount: 2 },
    ],
  })
  skillBreakdown?: Array<{
    skill: string;
    averageScore: number;
    questionCount: number;
  }>;

  @ApiProperty({
    description: 'Average score and question count per category',
    required: false,
    example: [
      { category: 'conceptual', averageScore: 8.2, questionCount: 3 },
      { category: 'design', averageScore: 7.5, questionCount: 2 },
    ],
  })
  categoryBreakdown?: Array<{
    category: string;
    averageScore: number;
    questionCount: number;
  }>;

  @ApiProperty({
    description: 'Aggregate score distribution for the interview',
    required: false,
    example: { min: 6.5, max: 9.0, median: 8.2 },
  })
  performanceMetrics?: {
    min: number;
    max: number;
    median: number;
  };
}
