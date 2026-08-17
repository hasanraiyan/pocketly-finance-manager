import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtKeysService } from './jwt-keys.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';

@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    TokenService,
    JwtKeysService,
    JwtAuthGuard,
  ],
  exports: [AuthService, JwtAuthGuard, JwtKeysService, TokenService],
})
export class AuthModule {}
