import { Controller, Post, UseGuards, Request, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../user/guards/jwt-auth.guard';
import { ConfigService } from '@nestjs/config';

@Controller('transcription')
@UseGuards(JwtAuthGuard)
export class TranscriptionController {
  private readonly logger = new Logger(TranscriptionController.name);

  constructor(private configService: ConfigService) {}

  @Post('session')
  async createSession(@Request() req: { user: { id: string } }) {
    const apiKey =
      this.configService.get<string>('OPENAI_API_KEY') ||
      this.configService.get<string>('OPEN_AI_KEY');

    if (!apiKey) {
      this.logger.error('OpenAI API key not configured');
      throw new Error('OpenAI API key not configured');
    }

    try {
      this.logger.log(`Creating ephemeral session for user ${req.user.id}`);

      const response = await fetch(
        'https://api.openai.com/v1/realtime/transcription_sessions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        },
      );

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({
          message: response.statusText,
        }))) as {
          message: string;
        };
        throw new Error(`OpenAI API error: ${JSON.stringify(errorData)}`);
      }

      const data = (await response.json()) as {
        client_secret: { value: string };
      };
      return data;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to create ephemeral session', errorMessage);
      throw error;
    }
  }

  @Post('tts-session')
  async createTTSSession(@Request() req: { user: { id: string } }) {
    const apiKey =
      this.configService.get<string>('OPENAI_API_KEY') ||
      this.configService.get<string>('OPEN_AI_KEY');

    if (!apiKey) {
      this.logger.error('OpenAI API key not configured');
      throw new Error('OpenAI API key not configured');
    }

    try {
      this.logger.log(`Creating TTS session for user ${req.user.id}`);

      // For TTS, we need to create a full Realtime session, not a transcription session
      // We'll use the same endpoint but with different configuration
      // Actually, we can use the same transcription_session endpoint as it provides
      // a client_secret that works with /v1/realtime/calls for full conversations
      const response = await fetch(
        'https://api.openai.com/v1/realtime/transcription_sessions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        },
      );

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({
          message: response.statusText,
        }))) as {
          message: string;
        };
        throw new Error(`OpenAI API error: ${JSON.stringify(errorData)}`);
      }

      const data = (await response.json()) as {
        client_secret: { value: string };
      };
      return data;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to create TTS session', errorMessage);
      throw error;
    }
  }
}
