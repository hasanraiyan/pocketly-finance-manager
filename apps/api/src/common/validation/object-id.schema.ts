import { isValidObjectId } from 'mongoose';
import { z } from 'zod';

export const objectIdSchema = z.string().refine(isValidObjectId, {
  message: 'Must be a valid id',
});
