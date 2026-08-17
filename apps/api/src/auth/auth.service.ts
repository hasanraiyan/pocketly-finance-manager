import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtKeysService } from './jwt-keys.service';
import { PasswordService } from './password.service';
import {
  RefreshToken,
  RefreshTokenDocument,
} from './schemas/refresh-token.schema';
import { TokenService } from './token.service';
import { UserDocument } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import type { LoginDto, RegisterDto } from './dto/auth.dto';

/** Signed but self-verified -- the API is the only thing that ever checks a session token. */
const ISSUER = 'pocketly';
const SESSION_AUDIENCE = 'pocketly-api';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface SessionMeta {
  ipAddress?: string;
  userAgent?: string;
}

export interface IssuedSession {
  user: UserDocument;
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly keys: JwtKeysService,
    @InjectModel(RefreshToken.name)
    private readonly refreshTokenModel: Model<RefreshTokenDocument>,
  ) {}

  async register(dto: RegisterDto, meta: SessionMeta): Promise<IssuedSession> {
    const existing = await this.users.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await this.passwords.hash(dto.password);
    const user = await this.users.register(dto.email, passwordHash, dto.name);
    return this.issueSession(user, meta);
  }

  async login(dto: LoginDto, meta: SessionMeta): Promise<IssuedSession> {
    const user = await this.users.findByEmail(dto.email);
    // Same message either way -- confirming an email exists via a different
    // error is a real enumeration leak, small as it seems.
    const invalid = () =>
      new UnauthorizedException('Invalid email or password');
    if (!user) throw invalid();

    const valid = await this.passwords.verify(user.passwordHash, dto.password);
    if (!valid) throw invalid();

    return this.issueSession(user, meta);
  }

  /**
   * Rotation, not reuse: the presented token is revoked and a new one issued
   * in the same call, so a refresh token is single-use. Presenting an
   * already-rotated (or expired, or logged-out) token fails the same way --
   * "session expired, sign in again" -- rather than distinguishing why.
   */
  async refresh(rawToken: string, meta: SessionMeta): Promise<IssuedSession> {
    const tokenHash = this.tokens.hashToken(rawToken);
    const existing = await this.refreshTokenModel
      .findOne({ tokenHash, revokedAt: null })
      .exec();

    if (!existing || existing.expiresAt < new Date()) {
      throw new UnauthorizedException('Session expired — sign in again');
    }

    existing.revokedAt = new Date();
    existing.lastUsedAt = new Date();
    await existing.save();

    const user = await this.users.findById(existing.userId.toString());
    if (!user) throw new UnauthorizedException();

    return this.issueSession(user, meta);
  }

  async logout(rawToken: string): Promise<void> {
    const tokenHash = this.tokens.hashToken(rawToken);
    await this.refreshTokenModel.updateOne(
      { tokenHash, revokedAt: null },
      { revokedAt: new Date() },
    );
  }

  /**
   * Every live refresh token for a user is one row in the "Active Sessions &
   * Devices" list -- `currentSessionId` (the `sid` claim on the caller's own
   * access token, see `issueSession`) is what lets the UI mark one of them
   * as "this device" without the request carrying its refresh token too.
   */
  async listSessions(userId: Types.ObjectId, currentSessionId?: string) {
    const sessions = await this.refreshTokenModel
      .find({ userId, revokedAt: null })
      .sort({ createdAt: -1 })
      .exec();

    return sessions.map((session) => ({
      _id: session._id.toString(),
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      createdAt: session.createdAt,
      lastUsedAt: session.lastUsedAt,
      current: session._id.toString() === currentSessionId,
    }));
  }

  async revokeSession(
    userId: Types.ObjectId,
    sessionId: string,
  ): Promise<void> {
    const session = await this.refreshTokenModel
      .findOne({ _id: sessionId, userId, revokedAt: null })
      .exec();
    if (!session) throw new NotFoundException('Session not found');
    session.revokedAt = new Date();
    await session.save();
  }

  /** Every live session except the caller's own, for "sign out other devices". */
  async revokeOtherSessions(
    userId: Types.ObjectId,
    keepSessionId?: string,
  ): Promise<void> {
    await this.refreshTokenModel.updateMany(
      { userId, _id: { $ne: keepSessionId }, revokedAt: null },
      { revokedAt: new Date() },
    );
  }

  async changePassword(
    user: UserDocument,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const valid = await this.passwords.verify(
      user.passwordHash,
      currentPassword,
    );
    if (!valid) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    user.passwordHash = await this.passwords.hash(newPassword);
    await user.save();
  }

  private async issueSession(
    user: UserDocument,
    meta: SessionMeta,
  ): Promise<IssuedSession> {
    const rawRefreshToken = this.tokens.generateToken(32);
    const refreshTokenDoc = await this.refreshTokenModel.create({
      userId: user._id,
      tokenHash: this.tokens.hashToken(rawRefreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    // `sid` ties the access token back to the refresh-token row that minted
    // it, so `GET /auth/sessions` can mark "this device" without the request
    // needing to carry the refresh token too.
    const accessToken = await this.keys.sign({
      sub: user._id.toString(),
      issuer: ISSUER,
      audience: SESSION_AUDIENCE,
      expiresIn: ACCESS_TOKEN_TTL,
      claims: { sid: refreshTokenDoc._id.toString() },
    });

    return { user, accessToken, refreshToken: rawRefreshToken };
  }
}

export { ISSUER as SESSION_ISSUER, SESSION_AUDIENCE };
