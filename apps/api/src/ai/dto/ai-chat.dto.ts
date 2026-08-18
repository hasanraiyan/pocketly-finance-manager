import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const AiMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1),
});

export const AiChatDtoSchema = z.object({
  
  agentId: z.string().optional(),
  messages: z.array(AiMessageSchema).min(1),
  threadId: z.string().optional(),
});

export class AiChatDto extends createZodDto(AiChatDtoSchema) {}
