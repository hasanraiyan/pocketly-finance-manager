import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { GoogleAuthService } from './oauth/google.service';
import { OAuthController } from './oauth/oauth.controller';
import { OAuthService } from './oauth/oauth.service';
import { JwtService } from './oauth/jwt.service';
import { WellKnownController } from './oauth/well-known.controller';
import { AuthUser, AuthUserSchema } from './schemas/auth-user.schema';
import { AuthSession, AuthSessionSchema } from './schemas/auth-session.schema';
import { AuthToken, AuthTokenSchema } from './schemas/auth-token.schema';
import { OAuthClient, OAuthClientSchema } from './schemas/oauth-client.schema';
import { OAuthCode, OAuthCodeSchema } from './schemas/oauth-code.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AuthUser.name, schema: AuthUserSchema },
      { name: AuthSession.name, schema: AuthSessionSchema },
      { name: AuthToken.name, schema: AuthTokenSchema },
      { name: OAuthClient.name, schema: OAuthClientSchema },
      { name: OAuthCode.name, schema: OAuthCodeSchema },
    ]),
    forwardRef(() => UsersModule),
  ],
  controllers: [AuthController, OAuthController, WellKnownController],
  providers: [
    AuthService,
    PasswordService,
    TokenService,
    GoogleAuthService,
    OAuthService,
    JwtService,
  ],
  exports: [
    AuthService,
    PasswordService,
    TokenService,
    GoogleAuthService,
    OAuthService,
    JwtService,
  ],
})
export class AuthModule {}
