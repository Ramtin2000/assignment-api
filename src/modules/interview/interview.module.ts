import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { InterviewController } from './interview.controller';
import { InterviewService } from './interview.service';
import { EvaluationService } from './evaluation.service';
import { Interview } from './entities/interview.entity';
import { InterviewSession } from './entities/interview-session.entity';
import { Answer } from './entities/answer.entity';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Interview, InterviewSession, Answer]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      signOptions: { expiresIn: '24h' },
    }),
    UserModule,
  ],
  controllers: [InterviewController],
  providers: [InterviewService, EvaluationService],
  exports: [InterviewService, EvaluationService],
})
export class InterviewModule {}
