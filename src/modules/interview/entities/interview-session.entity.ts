import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Interview } from './interview.entity';
import { Answer } from './answer.entity';

export enum InterviewSessionStatus {
  NOT_STARTED = 'not-started',
  IN_PROGRESS = 'in-progress',
  COMPLETED = 'completed',
}

@Entity('interview_sessions')
@Index(['userId'])
@Index(['status'])
@Index(['interviewId'])
export class InterviewSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  interviewId: string;

  @ManyToOne(() => Interview)
  @JoinColumn({ name: 'interviewId' })
  interview: Interview;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'int', default: 0 })
  currentQuestionIndex: number;

  @Column({
    type: 'enum',
    enum: InterviewSessionStatus,
    default: InterviewSessionStatus.NOT_STARTED,
  })
  status: InterviewSessionStatus;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @OneToMany(() => Answer, (answer) => answer.session)
  answers: Answer[];

  /**
   * Stored overall interview score (0-10), derived from per-question scores
   * and/or AI evaluation. This is persisted so we can show it efficiently
   * in dashboards without recalculating each time.
   */
  @Column({ type: 'float', nullable: true })
  overallScore: number | null;

  /**
   * AI-generated, interview-level summary describing the candidate's
   * overall performance across all questions.
   */
  @Column({ type: 'text', nullable: true })
  summary: string | null;

  /**
   * AI-generated, interview-level recommendations for improvement.
   */
  @Column({ type: 'jsonb', nullable: true })
  recommendations: string[] | null;

  /**
   * Calculated metrics per skill, e.g.:
   * [
   *   { skill: 'React', averageScore: 8.2, questionCount: 3 }
   * ]
   */
  @Column({ type: 'jsonb', nullable: true })
  skillBreakdown: Array<{
    skill: string;
    averageScore: number;
    questionCount: number;
  }> | null;

  /**
   * Calculated metrics per question category, e.g. conceptual / design.
   */
  @Column({ type: 'jsonb', nullable: true })
  categoryBreakdown: Array<{
    category: string;
    averageScore: number;
    questionCount: number;
  }> | null;

  /**
   * Aggregate performance metrics for the interview: min, max, median score.
   */
  @Column({ type: 'jsonb', nullable: true })
  performanceMetrics: {
    min: number;
    max: number;
    median: number;
  } | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
