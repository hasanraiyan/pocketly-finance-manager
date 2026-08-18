import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../common/auth/current-user.decorator';
import type { UserDocument } from '../users/schemas/user.schema';
import { AiService } from './ai.service';
import { AiChatDto } from './dto/ai-chat.dto';
import { AiStatusResponseDto } from './dto/ai-status.dto';

@ApiTags('ai')
@ApiBearerAuth('jwt')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('status')
  @ApiOperation({ summary: 'Check status of Persona AI Integration' })
  @ApiOkResponse({
    type: AiStatusResponseDto,
    description: 'Current configuration status of Persona AI integration',
  })
  getStatus() {
    return this.aiService.getStatus();
  }

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stream AI Financial Copilot conversation (SSE)' })
  @ApiProduces('text/event-stream')
  @ApiOkResponse({
    description: 'Server-Sent Events stream of AI chat chunks',
    schema: {
      type: 'string',
      example: 'data: {"type":"TEXT_MESSAGE_CHUNK","delta":"Hello!"}\n\n',
    },
  })
  async chat(
    @CurrentUser() user: UserDocument,
    @Body() dto: AiChatDto,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }

    try {
      for await (const chunk of this.aiService.streamChat(
        user._id.toString(),
        dto,
      )) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }
    } finally {
      if (!res.writableEnded) {
        res.end();
      }
    }
  }
}
