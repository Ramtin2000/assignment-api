import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InterviewSession } from './entities/interview-session.entity';
import { InterviewQA } from './entities/interview-qa.entity';
import { LogEvaluationDto } from './dto';
import OpenAI from 'openai';

@Injectable()
export class InterviewService {
  private openai: OpenAI;

  constructor(
    @InjectRepository(InterviewSession)
    private sessionRepository: Repository<InterviewSession>,
    @InjectRepository(InterviewQA)
    private qaRepository: Repository<InterviewQA>,
  ) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async createSession(userId: string): Promise<InterviewSession> {
    const session = this.sessionRepository.create({
      userId,
      status: 'active',
    });
    return await this.sessionRepository.save(session);
  }

  async getToken(
    sessionId: string,
    userId: string,
  ): Promise<{ client_secret: string; sessionId: string }> {
    // Verify session belongs to user
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Generate ephemeral client token using HTTP client
    // The frontend SDK will handle session configuration
    // We just need to provide a client_secret token
    const response = await fetch(
      'https://api.openai.com/v1/realtime/client_secrets',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session: {
            type: 'realtime',
            model: 'gpt-realtime-mini-2025-10-06' as string,
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Failed to generate client secret: ${response.statusText}`,
      );
    }

    const data = (await response.json()) as { value: string };

    return {
      client_secret: data.value,
      sessionId: session.id,
    };
  }

  async logEvaluation(
    logDto: LogEvaluationDto,
    userId: string,
  ): Promise<InterviewQA> {
    // Verify session belongs to user
    const session = await this.sessionRepository.findOne({
      where: { id: logDto.sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const qa = this.qaRepository.create({
      sessionId: logDto.sessionId,
      question: logDto.question,
      answer: logDto.answer,
      evaluation: {
        score: logDto.score,
        feedback: logDto.feedback,
      },
    });

    return await this.qaRepository.save(qa);
  }

  async getSession(
    sessionId: string,
    userId: string,
  ): Promise<InterviewSession> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, userId },
      relations: ['qas'],
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return session;
  }

  async completeSession(
    sessionId: string,
    userId: string,
  ): Promise<InterviewSession> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    session.status = 'completed';
    return await this.sessionRepository.save(session);
  }
}
