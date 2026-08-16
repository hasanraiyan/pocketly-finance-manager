import { Types } from 'mongoose';

export interface CursorPayload {
  date: Date;
  id: Types.ObjectId;
}

export function encodeCursor(doc: { date: Date; _id: Types.ObjectId }): string {
  return Buffer.from(
    JSON.stringify({ date: doc.date.toISOString(), id: doc._id.toString() }),
  ).toString('base64url');
}

export function decodeCursor(cursor: string): CursorPayload {
  const { date, id } = JSON.parse(
    Buffer.from(cursor, 'base64url').toString('utf8'),
  ) as {
    date: string;
    id: string;
  };
  return { date: new Date(date), id: new Types.ObjectId(id) };
}
