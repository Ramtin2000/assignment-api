import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { InterviewSession } from './interview-session.entity';

export interface AnswerEvaluation {
  score: number; // 0-10
  feedback: string;
  strengths: string[];
  weaknesses: string[];
}

@Entity('answers')
@Index(['sessionId'])
export class Answer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  sessionId: string;

  @ManyToOne(() => InterviewSession, (session) => session.answers)
  @JoinColumn({ name: 'sessionId' })
  session: InterviewSession;

  @Column({ type: 'int' })
  questionIndex: number;

  @Column({ type: 'text' })
  questionText: string;

  @Column({ type: 'text' })
  transcription: string;

  @Column({ type: 'jsonb', nullable: true })
  evaluation: AnswerEvaluation | null;

  @Column({ type: 'timestamp' })
  answeredAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
