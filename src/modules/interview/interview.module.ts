import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InterviewSession } from './entities/interview-session.entity';
import { InterviewQA } from './entities/interview-qa.entity';
import { InterviewService } from './interview.service';
import { InterviewController } from './interview.controller';

@Module({
  imports: [TypeOrmModule.forFeature([InterviewSession, InterviewQA])],
  controllers: [InterviewController],
  providers: [InterviewService],
  exports: [InterviewService],
})
export class InterviewModule {}
