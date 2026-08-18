import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PersonaService } from '@personaai/nestjs';
import type { AiChatDto } from './dto/ai-chat.dto';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly defaultAgentId?: string;

  constructor(
    private readonly config: ConfigService,
    @Optional() private readonly persona?: PersonaService,
  ) {
    this.defaultAgentId = this.config.get<string>('PERSONA_DEFAULT_AGENT_ID');
  }

  getStatus(): {
    enabled: boolean;
    provider: string;
    defaultAgentId: string | null;
    runtimeVersion: string;
  } {
    const isConfigured = Boolean(
      this.config.get<string>('PERSONA_CREDENTIAL') && this.persona,
    );
    return {
      enabled: isConfigured,
      provider: 'persona',
      defaultAgentId: this.defaultAgentId ?? null,
      runtimeVersion: '0.5.1',
    };
  }

  async *streamChat(
    userId: string,
    dto: AiChatDto,
  ): AsyncGenerator<Record<string, unknown>, void, unknown> {
    if (!this.persona) {
      yield {
        type: 'TEXT_MESSAGE_CHUNK',
        delta:
          'Persona AI is not currently configured with a PERSONA_CREDENTIAL on the server.',
      };
      return;
    }

    const agentId = dto.agentId || this.defaultAgentId;
    if (!agentId) {
      yield {
        type: 'TEXT_MESSAGE_CHUNK',
        delta: 'No default or requested Persona Agent ID specified.',
      };
      return;
    }

    const userClient = this.persona.forUser(userId);

    try {
      const stream = userClient.chat.stream(agentId, {
        messages: dto.messages,
        threadId: dto.threadId,
      });

      for await (const event of stream) {
        yield event as Record<string, unknown>;
      }
    } catch (err) {
      this.logger.error(
        `Failed to stream Persona AI chat for user ${userId}:`,
        err,
      );
      yield {
        type: 'ERROR',
        message: err instanceof Error ? err.message : 'AI Stream Error',
      };
    }
  }
}
