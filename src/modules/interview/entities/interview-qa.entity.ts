import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { InterviewSession } from './interview-session.entity';

@Entity('interview_qas')
export class InterviewQA {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  sessionId: string;

  @ManyToOne(() => InterviewSession, (session) => session.qas)
  @JoinColumn({ name: 'sessionId' })
  session: InterviewSession;

  @Column({ type: 'text' })
  question: string;

  @Column({ type: 'text' })
  answer: string;

  @Column({ type: 'jsonb', nullable: true })
  evaluation: {
    score?: number;
    feedback?: string;
  };

  @CreateDateColumn()
  timestamp: Date;
}
