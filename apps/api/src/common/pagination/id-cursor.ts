import { Types } from 'mongoose';

/**
 * Cursor pagination keyed on _id alone, for lists with no independent sort
 * field (unlike transactions, which sort by a user-editable `date` -- see
 * date-cursor.ts). MongoDB ObjectIds are monotonically increasing, so
 * sorting/paginating by _id is equivalent to insertion order.
 */
export function encodeIdCursor(id: Types.ObjectId): string {
  return Buffer.from(id.toString()).toString('base64url');
}

export function decodeIdCursor(cursor: string): Types.ObjectId {
  return new Types.ObjectId(Buffer.from(cursor, 'base64url').toString('utf8'));
}
