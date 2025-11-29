import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';

interface AuthenticatedSocket extends Socket {
  data: {
    user: {
      id: string;
      email: string;
    };
  };
}

interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient<Socket>();
    const token =
      (client.handshake.auth as { token?: string })?.token ||
      client.handshake.headers.authorization?.replace(/^Bearer\s+/, '') ||
      (client.handshake.query as { token?: string })?.token;

    if (!token) {
      this.logger.warn('No token found in WebSocket handshake');
      return false;
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret:
          process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      });

      // Attach user data to socket
      (client as AuthenticatedSocket).data = {
        user: {
          id: payload.sub,
          email: payload.email,
        },
      };

      return true;
    } catch (error) {
      this.logger.error('JWT verification failed:', error);
      return false;
    }
  }
}
