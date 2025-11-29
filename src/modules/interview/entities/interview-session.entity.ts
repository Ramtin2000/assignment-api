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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
