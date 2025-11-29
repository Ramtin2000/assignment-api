import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity('interviews')
export class Interview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('simple-array')
  skills: string[];

  @Column()
  difficulty: string;

  @Column({ type: 'int', default: 3 })
  questionsPerSkill: number;

  @Column({ type: 'text', nullable: true })
  context: string | null;

  @Column('jsonb')
  questions: Array<{
    skill: string;
    question: string;
    difficulty: string;
    category: string;
    expectedAnswer?: string;
  }>;

  @Column({ type: 'int' })
  totalQuestions: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
