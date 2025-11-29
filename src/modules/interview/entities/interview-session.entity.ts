import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { InterviewQA } from './interview-qa.entity';

@Entity('interview_sessions')
export class InterviewSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar', default: 'active' })
  status: 'active' | 'completed';

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => InterviewQA, (qa) => qa.session)
  qas: InterviewQA[];
}
