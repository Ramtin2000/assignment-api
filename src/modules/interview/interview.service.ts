import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import OpenAI from 'openai';
import { Interview } from './entities/interview.entity';
import {
  InterviewSession,
  InterviewSessionStatus,
} from './entities/interview-session.entity';
import { Answer } from './entities/answer.entity';
import { EvaluationService } from './evaluation.service';

export interface InterviewQuestion {
  skill: string;
  question: string;
  difficulty: string;
  category: string;
  expectedAnswer?: string;
}

export interface GeneratedInterview {
  id?: string;
  questions: InterviewQuestion[];
  totalQuestions: number;
  skills: string[];
  difficulty: string;
}

interface OpenAIQuestionResponse {
  skill?: string;
  question?: string;
  difficulty?: string;
  category?: string;
  expectedAnswer?: string;
}

interface OpenAIResponse {
  questions?: OpenAIQuestionResponse[];
}

@Injectable()
export class InterviewService {
  private readonly logger = new Logger(InterviewService.name);
  private readonly openai: OpenAI | null;

  constructor(
    @InjectRepository(Interview)
    private interviewRepository: Repository<Interview>,
    @InjectRepository(InterviewSession)
    private sessionRepository: Repository<InterviewSession>,
    @InjectRepository(Answer)
    private answerRepository: Repository<Answer>,
    private evaluationService: EvaluationService,
  ) {
    const apiKey = process.env.OPENAI_API_KEY || process.env.OPEN_AI_KEY;

    if (!apiKey || apiKey.trim() === '') {
      this.logger.error(
        'OpenAI API key not found. Interview generation will not work. Set OPENAI_API_KEY or OPEN_AI_KEY environment variable.',
      );
      this.openai = null;
    } else {
      this.openai = new OpenAI({
        apiKey: apiKey.trim(),
      });
      this.logger.log(
        'OpenAI client initialized successfully for interview service',
      );
    }
  }

  async generateInterview(
    userId: string,
    skills: string[],
    questionsPerSkill: number = 3,
    difficulty: string = 'intermediate',
    context?: string,
  ): Promise<GeneratedInterview> {
    if (!this.openai) {
      throw new BadRequestException('OpenAI API key not configured');
    }

    if (!skills || skills.length === 0) {
      throw new BadRequestException('At least one skill is required');
    }

    this.logger.log(
      `Generating interview for skills: ${skills.join(', ')}, ${questionsPerSkill} questions per skill, difficulty: ${difficulty}`,
    );

    try {
      const prompt = this.buildPrompt(
        skills,
        questionsPerSkill,
        difficulty,
        context,
      );

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-5-nano-2025-08-07',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert technical interviewer specializing in verbal/conversational interviews. Generate high-quality interview questions that can be answered verbally through discussion and explanation. NEVER generate coding questions, implementation tasks, or questions requiring code. Focus on conceptual understanding, experience, design decisions, and problem-solving approaches that can be discussed verbally.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        throw new BadRequestException('Failed to generate interview questions');
      }

      const parsedResponse = JSON.parse(responseContent) as OpenAIResponse;
      const questions = this.parseQuestions(parsedResponse);

      this.logger.log(
        `Successfully generated ${questions.length} interview questions`,
      );

      const generatedInterview: GeneratedInterview = {
        questions,
        totalQuestions: questions.length,
        skills,
        difficulty,
      };

      // Save interview to database
      const interview = this.interviewRepository.create({
        userId,
        skills,
        difficulty,
        questionsPerSkill,
        context: context || null,
        questions,
        totalQuestions: questions.length,
      });

      const savedInterview = await this.interviewRepository.save(interview);
      this.logger.log(
        `Interview saved to database with ID: ${savedInterview.id}`,
      );

      // Return the saved interview with id included
      return {
        ...generatedInterview,
        id: savedInterview.id,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `OpenAI interview generation error: ${errorMessage}`,
        error,
      );

      if (error instanceof SyntaxError) {
        throw new BadRequestException(
          'Failed to parse interview questions. Please try again.',
        );
      }

      throw new BadRequestException(
        `Interview generation failed: ${errorMessage}`,
      );
    }
  }

  private buildPrompt(
    skills: string[],
    questionsPerSkill: number,
    difficulty: string,
    context?: string,
  ): string {
    const skillsList = skills
      .map((skill, index) => `${index + 1}. ${skill}`)
      .join('\n');
    const totalQuestions = skills.length * questionsPerSkill;

    return `Generate ${totalQuestions} verbal interview questions (${questionsPerSkill} per skill) for the following technical skills:

${skillsList}

Difficulty Level: ${difficulty}

IMPORTANT REQUIREMENTS:
- Questions must be ANSWERABLE VERBALLY - candidates should be able to explain their answer by speaking
- NO coding questions, NO implementation tasks, NO "write code" or "implement" questions
- Questions should focus on:
  * Conceptual understanding and explanations
  * Best practices and design decisions
  * Problem-solving approaches and methodologies
  * Experience-based scenarios ("Tell me about a time when...")
  * Architecture and system design discussions
  * Trade-offs and comparisons
  * Troubleshooting and debugging thought processes
- Each question should be specific to one of the listed skills
- Questions should be appropriate for ${difficulty} level
- Questions should encourage discussion and explanation
- Format questions to start with "Explain", "Describe", "Tell me about", "What would you do if", "How would you approach", etc.${context ? `\n\nAdditional Context: ${context}` : ''}

Return the response as a JSON object with this structure:
{
  "questions": [
    {
      "skill": "skill name",
      "question": "the interview question (must be answerable verbally)",
      "difficulty": "${difficulty}",
      "category": "conceptual|experience|design|troubleshooting|comparison"
    }
  ]
}
`;
  }

  private parseQuestions(parsedResponse: OpenAIResponse): InterviewQuestion[] {
    if (
      !parsedResponse ||
      !parsedResponse.questions ||
      !Array.isArray(parsedResponse.questions)
    ) {
      throw new BadRequestException('Invalid response format from OpenAI');
    }

    const questions: InterviewQuestion[] = parsedResponse.questions.map(
      (q: OpenAIQuestionResponse) => ({
        skill: q.skill || 'Unknown',
        question: q.question || '',
        difficulty: q.difficulty || 'intermediate',
        category: q.category || 'conceptual',
        expectedAnswer: q.expectedAnswer,
      }),
    );

    // Validate that all questions have required fields
    const invalidQuestions = questions.filter(
      (q) => !q.skill || !q.question || !q.difficulty || !q.category,
    );

    if (invalidQuestions.length > 0) {
      this.logger.warn(
        `Found ${invalidQuestions.length} invalid questions, filtering them out`,
      );
      return questions.filter(
        (q) => q.skill && q.question && q.difficulty && q.category,
      );
    }

    return questions;
  }

  async getUserInterviews(userId: string): Promise<Interview[]> {
    return this.interviewRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async getInterviewById(
    id: string,
    userId: string,
  ): Promise<Interview | null> {
    return this.interviewRepository.findOne({
      where: { id, userId },
    });
  }

  async startInterviewSession(
    userId: string,
    interviewId: string,
  ): Promise<{ session: InterviewSession; question: InterviewQuestion }> {
    // Verify interview exists and belongs to user
    const interview = await this.interviewRepository.findOne({
      where: { id: interviewId, userId },
    });

    if (!interview) {
      throw new NotFoundException('Interview not found');
    }

    if (interview.questions.length === 0) {
      throw new BadRequestException('Interview has no questions');
    }

    // Create new session
    const session = this.sessionRepository.create({
      interviewId,
      userId,
      currentQuestionIndex: 0,
      status: InterviewSessionStatus.IN_PROGRESS,
      startedAt: new Date(),
    });

    const savedSession = await this.sessionRepository.save(session);

    // Get first question
    const question = interview.questions[0];

    this.logger.log(
      `Interview session started: ${savedSession.id} for user ${userId}`,
    );

    return {
      session: savedSession,
      question,
    };
  }

  async getCurrentQuestion(
    sessionId: string,
    userId: string,
  ): Promise<InterviewQuestion | null> {
    const session = await this.validateSessionOwnership(sessionId, userId);

    const interview = await this.interviewRepository.findOne({
      where: { id: session.interviewId },
    });

    if (!interview) {
      throw new NotFoundException('Interview not found');
    }

    if (
      session.currentQuestionIndex < 0 ||
      session.currentQuestionIndex >= interview.questions.length
    ) {
      return null; // No more questions
    }

    return interview.questions[session.currentQuestionIndex];
  }

  async submitAnswer(
    sessionId: string,
    questionIndex: number,
    transcription: string,
    userId: string,
  ): Promise<Answer> {
    const session = await this.validateSessionOwnership(sessionId, userId);

    if (session.status === InterviewSessionStatus.COMPLETED) {
      throw new BadRequestException('Interview session is already completed');
    }

    const interview = await this.interviewRepository.findOne({
      where: { id: session.interviewId },
    });

    if (!interview) {
      throw new NotFoundException('Interview not found');
    }

    if (questionIndex < 0 || questionIndex >= interview.questions.length) {
      throw new BadRequestException('Invalid question index');
    }

    const question = interview.questions[questionIndex];

    // Check if answer already exists for this question
    const existingAnswer = await this.answerRepository.findOne({
      where: { sessionId, questionIndex },
    });

    if (existingAnswer) {
      // Update existing answer
      existingAnswer.transcription = transcription;
      existingAnswer.answeredAt = new Date();
      return await this.answerRepository.save(existingAnswer);
    }

    // Create new answer
    const answer = this.answerRepository.create({
      sessionId,
      questionIndex,
      questionText: question.question,
      transcription,
      answeredAt: new Date(),
      evaluation: null, // Will be set during batch evaluation
    });

    const savedAnswer = await this.answerRepository.save(answer);

    this.logger.log(
      `Answer submitted for session ${sessionId}, question ${questionIndex}`,
    );

    return savedAnswer;
  }

  async moveToNextQuestion(
    sessionId: string,
    userId: string,
  ): Promise<InterviewQuestion | null> {
    const session = await this.validateSessionOwnership(sessionId, userId);

    if (session.status === InterviewSessionStatus.COMPLETED) {
      throw new BadRequestException('Interview session is already completed');
    }

    const interview = await this.interviewRepository.findOne({
      where: { id: session.interviewId },
    });

    if (!interview) {
      throw new NotFoundException('Interview not found');
    }

    session.currentQuestionIndex += 1;

    if (session.currentQuestionIndex >= interview.questions.length) {
      // No more questions
      await this.sessionRepository.save(session);
      return null;
    }

    await this.sessionRepository.save(session);

    return interview.questions[session.currentQuestionIndex];
  }

  async completeInterview(
    sessionId: string,
    userId: string,
  ): Promise<{
    session: InterviewSession;
    evaluations: Array<{
      questionIndex: number;
      score: number;
      feedback: string;
      strengths: string[];
      weaknesses: string[];
    }>;
    overallScore: number;
    summary: string;
    recommendations: string[];
  }> {
    const session = await this.validateSessionOwnership(sessionId, userId);

    if (session.status === InterviewSessionStatus.COMPLETED) {
      // Return existing evaluations
      const answers = await this.answerRepository.find({
        where: { sessionId },
        order: { questionIndex: 'ASC' },
      });

      const evaluations = answers
        .filter((a) => a.evaluation)
        .map((a) => ({
          questionIndex: a.questionIndex,
          ...a.evaluation!,
        }));

      // Calculate overall score from existing evaluations
      const scores = evaluations.map((e) => e.score);
      const overallScore =
        scores.length > 0
          ? scores.reduce((sum, score) => sum + score, 0) / scores.length
          : 0;

      return {
        session,
        evaluations,
        overallScore,
        summary: 'Interview already completed',
        recommendations: [],
      };
    }

    // Get all answers
    const answers = await this.answerRepository.find({
      where: { sessionId },
      order: { questionIndex: 'ASC' },
    });

    if (answers.length === 0) {
      throw new BadRequestException('No answers found to evaluate');
    }

    // Get interview questions
    const interview = await this.interviewRepository.findOne({
      where: { id: session.interviewId },
    });

    if (!interview) {
      throw new NotFoundException('Interview not found');
    }

    // Prepare data for batch evaluation
    const questions = interview.questions;
    const answerData = answers.map((a) => ({
      questionIndex: a.questionIndex,
      questionText: a.questionText,
      transcription: a.transcription,
    }));

    // Perform batch evaluation
    const evaluationResult = await this.evaluationService.evaluateAnswers(
      questions,
      answerData,
    );

    // Store evaluations in answers
    for (const evaluation of evaluationResult.evaluations) {
      const answer = answers.find(
        (a) => a.questionIndex === evaluation.questionIndex,
      );
      if (answer) {
        answer.evaluation = {
          score: evaluation.score,
          feedback: evaluation.feedback,
          strengths: evaluation.strengths,
          weaknesses: evaluation.weaknesses,
        };
        await this.answerRepository.save(answer);
      }
    }

    // Update session status
    session.status = InterviewSessionStatus.COMPLETED;
    session.completedAt = new Date();
    await this.sessionRepository.save(session);

    this.logger.log(
      `Interview session completed: ${sessionId} with overall score: ${evaluationResult.overallScore}`,
    );

    return {
      session,
      ...evaluationResult,
    };
  }

  async getSessionById(
    sessionId: string,
    userId: string,
  ): Promise<InterviewSession> {
    return this.validateSessionOwnership(sessionId, userId);
  }

  async getSessionAnswers(
    sessionId: string,
    userId: string,
  ): Promise<Answer[]> {
    await this.validateSessionOwnership(sessionId, userId);

    return this.answerRepository.find({
      where: { sessionId },
      order: { questionIndex: 'ASC' },
    });
  }

  async getUserSessions(userId: string): Promise<InterviewSession[]> {
    return this.sessionRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      relations: ['interview'],
    });
  }

  private async validateSessionOwnership(
    sessionId: string,
    userId: string,
  ): Promise<InterviewSession> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Interview session not found');
    }

    if (session.userId !== userId) {
      throw new NotFoundException('Interview session not found');
    }

    return session;
  }
}
