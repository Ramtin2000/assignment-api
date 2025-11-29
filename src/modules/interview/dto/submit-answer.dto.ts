import { IsUUID, IsInt, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubmitAnswerDto {
  @ApiProperty({
    description: 'ID of the interview session',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  sessionId: string;

  @ApiProperty({
    description: 'Index of the question being answered',
    example: 0,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  questionIndex: number;

  @ApiProperty({
    description: 'Transcription of the candidate answer',
    example:
      'I would approach this problem by first understanding the requirements...',
  })
  @IsString()
  transcription: string;
}
