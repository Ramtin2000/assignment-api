import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import OpenAI from 'openai';

interface Question {
  skill: string;
  question: string;
  difficulty: string;
  category: string;
  expectedAnswer?: string;
}

interface Answer {
  questionIndex: number;
  questionText: string;
  transcription: string;
}

export interface BatchEvaluationResult {
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
  /**
   * Interview-level strengths aggregated across all questions.
   */
  interviewStrengths?: string[];
  /**
   * Interview-level weaknesses / areas for improvement aggregated across all questions.
   */
  interviewWeaknesses?: string[];
}

@Injectable()
export class EvaluationService {
  private readonly logger = new Logger(EvaluationService.name);
  private readonly openai: OpenAI | null;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY || process.env.OPEN_AI_KEY;

    if (!apiKey || apiKey.trim() === '') {
      this.logger.error(
        'OpenAI API key not found. Answer evaluation will not work. Set OPENAI_API_KEY or OPEN_AI_KEY environment variable.',
      );
      this.openai = null;
    } else {
      this.openai = new OpenAI({
        apiKey: apiKey.trim(),
      });
      this.logger.log(
        'OpenAI client initialized successfully for evaluation service',
      );
    }
  }

  async evaluateAnswers(
    questions: Question[],
    answers: Answer[],
  ): Promise<BatchEvaluationResult> {
    if (!this.openai) {
      throw new BadRequestException('OpenAI API key not configured');
    }

    if (questions.length === 0 || answers.length === 0) {
      throw new BadRequestException('Questions and answers are required');
    }

    if (questions.length !== answers.length) {
      this.logger.warn(
        `Mismatch: ${questions.length} questions but ${answers.length} answers`,
      );
    }

    this.logger.log(
      `Evaluating ${answers.length} answers for ${questions.length} questions`,
    );

    try {
      const prompt = this.buildEvaluationPrompt(questions, answers);

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert technical interviewer evaluating candidate answers. Provide comprehensive, fair, and constructive feedback. Score answers on a scale of 0-10 based on accuracy, depth, clarity, and relevance.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3, // Lower temperature for more consistent evaluations
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        throw new BadRequestException('Failed to generate evaluation');
      }

      const parsedResponse = JSON.parse(responseContent) as {
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
        interviewStrengths?: string[];
        interviewWeaknesses?: string[];
      };

      // Validate response structure
      if (
        !parsedResponse.evaluations ||
        !Array.isArray(parsedResponse.evaluations)
      ) {
        throw new BadRequestException('Invalid evaluation response format');
      }

      // Ensure scores are within 0-10 range
      parsedResponse.evaluations.forEach((evaluation) => {
        evaluation.score = Math.max(0, Math.min(10, evaluation.score));
      });

      // Calculate overall score if not provided
      if (!parsedResponse.overallScore) {
        const scores = parsedResponse.evaluations.map((e) => e.score);
        parsedResponse.overallScore =
          scores.reduce((sum, score) => sum + score, 0) / scores.length;
      }

      this.logger.log(
        `Evaluation completed. Overall score: ${parsedResponse.overallScore.toFixed(2)}`,
      );

      return parsedResponse;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`OpenAI evaluation error: ${errorMessage}`, error);

      if (error instanceof SyntaxError) {
        throw new BadRequestException(
          'Failed to parse evaluation results. Please try again.',
        );
      }

      throw new BadRequestException(`Evaluation failed: ${errorMessage}`);
    }
  }

  private buildEvaluationPrompt(
    questions: Question[],
    answers: Answer[],
  ): string {
    // Build question-answer pairs
    const questionAnswerPairs = answers
      .map((answer, i) => {
        const question = questions[answer.questionIndex] || questions[i];
        return `Question ${answer.questionIndex + 1}:
Skill: ${question.skill}
Question: ${question.question}${question.expectedAnswer ? `\nExpected Answer Context: ${question.expectedAnswer}` : ''}
Candidate Answer: ${answer.transcription}`;
      })
      .join('\n\n');

    const prompt = `You are evaluating a full technical interview.
Provide:
1) Detailed evaluation for each answer (score 0-10, feedback, strengths, weaknesses)
2) An overall interview score (0-10)
3) A comprehensive interview-level summary describing overall performance
4) Interview-level recommendations for improvement
5) Interview-level strengths and weaknesses aggregated across all questions

Evaluate the following interview answers:

${questionAnswerPairs}

Return your evaluation as a JSON object with this structure (valid JSON only):
{
  "evaluations": [
    {
      "questionIndex": 0,
      "score": 8.5,
      "feedback": "Detailed feedback about the answer",
      "strengths": ["strength1", "strength2"],
      "weaknesses": ["weakness1", "weakness2"]
    }
  ],
  "overallScore": 8.2,
  "summary": "Overall assessment of the interview performance",
  "recommendations": ["recommendation1", "recommendation2"],
  "interviewStrengths": ["overall strength 1", "overall strength 2"],
  "interviewWeaknesses": ["overall weakness 1", "overall weakness 2"]
}
`;

    return prompt;
  }
}
