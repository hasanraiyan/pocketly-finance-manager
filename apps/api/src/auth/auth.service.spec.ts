import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Model } from 'mongoose';
import { AuthService } from './auth.service';
import { JwtKeysService } from './jwt-keys.service';
import { PasswordService } from './password.service';
import {
  RefreshToken,
  RefreshTokenDocument,
  RefreshTokenSchema,
} from './schemas/refresh-token.schema';
import { SigningKey, SigningKeySchema } from './schemas/signing-key.schema';
import { TokenService } from './token.service';
import { User, UserDocument, UserSchema } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import { Account, AccountSchema } from '../accounts/schemas/account.schema';
import { Budget, BudgetSchema } from '../budgets/schemas/budget.schema';
import {
  Category,
  CategorySchema,
} from '../categories/schemas/category.schema';
import { Goal, GoalSchema } from '../goals/schemas/goal.schema';
import {
  Transaction,
  TransactionSchema,
} from '../transactions/schemas/transaction.schema';

describe('AuthService', () => {
  let mongod: MongoMemoryServer;
  let moduleRef: TestingModule;
  let authService: AuthService;
  let refreshTokenModel: Model<RefreshTokenDocument>;
  let userModel: Model<UserDocument>;

  const meta = { ipAddress: '127.0.0.1', userAgent: 'jest' };

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();

    moduleRef = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongod.getUri()),
        MongooseModule.forFeature([
          { name: User.name, schema: UserSchema },
          { name: RefreshToken.name, schema: RefreshTokenSchema },
          { name: SigningKey.name, schema: SigningKeySchema },
          { name: Account.name, schema: AccountSchema },
          { name: Category.name, schema: CategorySchema },
          { name: Transaction.name, schema: TransactionSchema },
          { name: Budget.name, schema: BudgetSchema },
          { name: Goal.name, schema: GoalSchema },
        ]),
      ],
      providers: [
        AuthService,
        UsersService,
        PasswordService,
        TokenService,
        JwtKeysService,
      ],
    }).compile();

    authService = moduleRef.get(AuthService);
    refreshTokenModel = moduleRef.get(getModelToken(RefreshToken.name));
    userModel = moduleRef.get(getModelToken(User.name));

    // JwtKeysService establishes its signing key in onModuleInit -- init the
    // module so it's ready before any test signs a token.
    await moduleRef.init();
  }, 60_000);

  afterAll(async () => {
    await moduleRef.close();
    await mongod.stop();
  });

  afterEach(async () => {
    await userModel.deleteMany({});
    await refreshTokenModel.deleteMany({});
  });

  describe('register', () => {
    it('creates a user and issues a session', async () => {
      const session = await authService.register(
        { email: 'a@b.com', password: 'correct-password', name: 'A' },
        meta,
      );

      expect(session.user.email).toBe('a@b.com');
      expect(session.accessToken).toEqual(expect.any(String));
      expect(session.refreshToken).toEqual(expect.any(String));
      // The stored password is never the plaintext.
      expect(session.user.passwordHash).not.toBe('correct-password');
    });

    it('rejects a duplicate email', async () => {
      await authService.register(
        { email: 'dup@b.com', password: 'correct-password', name: 'A' },
        meta,
      );

      await expect(
        authService.register(
          { email: 'dup@b.com', password: 'another-password', name: 'B' },
          meta,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      await authService.register(
        { email: 'login@b.com', password: 'correct-password', name: 'A' },
        meta,
      );
    });

    it('issues a session for the correct password', async () => {
      const session = await authService.login(
        { email: 'login@b.com', password: 'correct-password' },
        meta,
      );
      expect(session.user.email).toBe('login@b.com');
    });

    it('rejects the wrong password with the same message as an unknown email', async () => {
      const wrongPassword = authService
        .login({ email: 'login@b.com', password: 'nope' }, meta)
        .catch((e: UnauthorizedException) => e.message);
      const unknownEmail = authService
        .login({ email: 'nobody@b.com', password: 'nope' }, meta)
        .catch((e: UnauthorizedException) => e.message);

      expect(await wrongPassword).toBe(await unknownEmail);
    });
  });

  describe('refresh', () => {
    it('rotates the token -- the old one stops working, the new one works', async () => {
      const first = await authService.register(
        { email: 'refresh@b.com', password: 'correct-password', name: 'A' },
        meta,
      );

      const second = await authService.refresh(first.refreshToken, meta);
      expect(second.accessToken).not.toBe(first.accessToken);

      await expect(
        authService.refresh(first.refreshToken, meta),
      ).rejects.toThrow(UnauthorizedException);

      const third = await authService.refresh(second.refreshToken, meta);
      expect(third.user.email).toBe('refresh@b.com');
    });

    it('rejects an unknown token', async () => {
      await expect(
        authService.refresh('not-a-real-token', meta),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('revokes the refresh token so it can no longer refresh', async () => {
      const session = await authService.register(
        { email: 'logout@b.com', password: 'correct-password', name: 'A' },
        meta,
      );

      await authService.logout(session.refreshToken);

      await expect(
        authService.refresh(session.refreshToken, meta),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('sessions', () => {
    it('lists every live session and marks the caller’s own as current', async () => {
      const first = await authService.register(
        { email: 'sessions@b.com', password: 'correct-password', name: 'A' },
        meta,
      );
      // A second device, same account.
      await authService.login(
        { email: 'sessions@b.com', password: 'correct-password' },
        meta,
      );

      const firstRow = await refreshTokenModel
        .findOne({ userId: first.user._id })
        .sort({ createdAt: 1 })
        .exec();
      const sessions = await authService.listSessions(
        first.user._id,
        firstRow?._id.toString(),
      );

      expect(sessions).toHaveLength(2);
      expect(sessions.filter((s) => s.current)).toHaveLength(1);
    });

    it('revokeSession only lets a user revoke their own session', async () => {
      const owner = await authService.register(
        { email: 'owner@b.com', password: 'correct-password', name: 'A' },
        meta,
      );
      const stranger = await authService.register(
        { email: 'stranger@b.com', password: 'correct-password', name: 'B' },
        meta,
      );
      const ownerSession = await refreshTokenModel
        .findOne({ userId: owner.user._id })
        .exec();

      await expect(
        authService.revokeSession(
          stranger.user._id,
          ownerSession!._id.toString(),
        ),
      ).rejects.toThrow('Session not found');

      await authService.revokeSession(
        owner.user._id,
        ownerSession!._id.toString(),
      );
      await expect(
        authService.refresh(owner.refreshToken, meta),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('revokeOtherSessions leaves the current session alone', async () => {
      const first = await authService.register(
        { email: 'multi@b.com', password: 'correct-password', name: 'A' },
        meta,
      );
      const second = await authService.login(
        { email: 'multi@b.com', password: 'correct-password' },
        meta,
      );
      const secondRow = await refreshTokenModel
        .findOne({ userId: first.user._id })
        .sort({ createdAt: -1 })
        .exec();

      await authService.revokeOtherSessions(
        first.user._id,
        secondRow!._id.toString(),
      );

      await expect(
        authService.refresh(first.refreshToken, meta),
      ).rejects.toThrow(UnauthorizedException);
      // The kept session still works.
      await authService.refresh(second.refreshToken, meta);
    });
  });

  describe('changePassword', () => {
    it('requires the current password and lets a future login use the new one', async () => {
      const session = await authService.register(
        { email: 'pw@b.com', password: 'old-password', name: 'A' },
        meta,
      );

      await expect(
        authService.changePassword(
          session.user,
          'wrong-current',
          'new-password',
        ),
      ).rejects.toThrow(UnauthorizedException);

      await authService.changePassword(
        session.user,
        'old-password',
        'new-password',
      );

      await expect(
        authService.login(
          { email: 'pw@b.com', password: 'old-password' },
          meta,
        ),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        authService.login(
          { email: 'pw@b.com', password: 'new-password' },
          meta,
        ),
      ).resolves.toBeDefined();
    });
  });
});
