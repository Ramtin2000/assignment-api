import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TranscriptionController } from './transcription.controller';
import { UserModule } from '../user/user.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      signOptions: { expiresIn: '24h' },
    }),
    UserModule,
    ConfigModule,
  ],
  controllers: [TranscriptionController],
  providers: [],
  exports: [],
})
export class TranscriptionModule {}
