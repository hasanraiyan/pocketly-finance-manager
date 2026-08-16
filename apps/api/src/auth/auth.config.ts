import { MongoClient } from 'mongodb';
import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { bearer } from 'better-auth/plugins/bearer';

const mongoUri =
  process.env.MONGODB_URI ?? 'mongodb://localhost:27017/pocketly';
const client = new MongoClient(mongoUri);
const db = client.db();

const trustedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

/**
 * Owns identity (email/password, sessions, multi-device revocation) in its
 * own MongoDB collections -- separate from the app-domain `User` Mongoose
 * model (name/currency/timezone), which is our own profile linked to
 * Better Auth's user id via `User.authUserId`. See AppAuthGuard for how the
 * two are stitched together on every request.
 *
 * `transaction: false` because a standalone (non-replica-set) MongoDB
 * instance -- the normal local dev setup -- doesn't support transactions.
 * Safe to enable once running against a real replica set / Atlas.
 */
export const auth = betterAuth({
  database: mongodbAdapter(db, { client, transaction: false }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.API_BASE_URL ?? 'http://localhost:4000',
  trustedOrigins,
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      // TODO: wire up a real email provider (Resend/SMTP) before launch.
      // Logging the link keeps the reset flow fully testable until then.
      console.log(`[auth] Password reset requested for ${user.email}: ${url}`);
    },
  },
  plugins: [bearer()],
});
