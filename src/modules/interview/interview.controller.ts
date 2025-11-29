import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../user/guards/jwt-auth.guard';
import { InterviewService } from './interview.service';
import { LogEvaluationDto } from './dto';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
  };
}

@ApiTags('interview')
@ApiBearerAuth('JWT-auth')
@Controller('interview')
@UseGuards(JwtAuthGuard)
export class InterviewController {
  constructor(private interviewService: InterviewService) {}

  @Post('session')
  @ApiOperation({
    summary: 'Create a new interview session',
    description: 'Creates a new interview session for the authenticated user',
  })
  @ApiResponse({
    status: 201,
    description: 'Interview session created successfully',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async createSession(@Request() req: AuthenticatedRequest) {
    const session = await this.interviewService.createSession(req.user.id);
    return session;
  }

  @Post('token')
  @ApiOperation({
    summary: 'Get ephemeral token for realtime session',
    description: 'Generates an ephemeral client token for WebRTC connection',
  })
  @ApiResponse({
    status: 200,
    description: 'Token generated successfully',
    schema: {
      example: {
        client_secret: 'ek_...',
        sessionId: 'uuid',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getToken(
    @Body() body: { sessionId: string },
    @Request() req: AuthenticatedRequest,
  ) {
    return await this.interviewService.getToken(body.sessionId, req.user.id);
  }

  @Post('log-evaluation')
  @ApiOperation({
    summary: 'Log evaluation for a Q&A',
    description: 'Saves evaluation data for a question-answer pair',
  })
  @ApiResponse({
    status: 201,
    description: 'Evaluation logged successfully',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async logEvaluation(
    @Body() logDto: LogEvaluationDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return await this.interviewService.logEvaluation(logDto, req.user.id);
  }

  @Get('session/:id')
  @ApiOperation({
    summary: 'Get interview session',
    description: 'Retrieves an interview session with all Q&As',
  })
  @ApiResponse({
    status: 200,
    description: 'Session retrieved successfully',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getSession(
    @Param('id') sessionId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return await this.interviewService.getSession(sessionId, req.user.id);
  }

  @Post('session/:id/complete')
  @ApiOperation({
    summary: 'Complete interview session',
    description: 'Marks an interview session as completed',
  })
  @ApiResponse({
    status: 200,
    description: 'Session completed successfully',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async completeSession(
    @Param('id') sessionId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return await this.interviewService.completeSession(sessionId, req.user.id);
  }
}
