import {
  Controller,
  Delete,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { Public } from '../common/auth/public.decorator';
import { McpAuthenticatedRequest, McpAuthGuard } from './mcp-auth.guard';
import { McpServerFactory } from './mcp-server.factory';

const METHOD_NOT_ALLOWED = {
  jsonrpc: '2.0' as const,
  error: { code: -32000, message: 'Method not allowed.' },
  id: null,
};

/**
 * Stateless Streamable HTTP transport (MCP spec): each POST gets a fresh
 * server + transport, handled, then torn down. No session affinity to
 * manage, and auth is re-verified independently on every request -- see
 * McpAuthGuard, which runs before this controller (excluded from Nest's
 * global api/v1 prefix in main.ts, since MCP clients address this at its
 * own canonical resource URI, not the REST API's routing).
 */
@Controller('mcp')
@Public()
@UseGuards(McpAuthGuard)
@ApiExcludeController()
export class McpController {
  constructor(private readonly serverFactory: McpServerFactory) {}

  @Post()
  async handlePost(@Req() req: Request, @Res() res: Response) {
    const { mcpUser, mcpToken, mcpScopes } = req as McpAuthenticatedRequest;
    const server = this.serverFactory.build(mcpUser, mcpToken, mcpScopes);

    try {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body as unknown);
      res.on('close', () => {
        void transport.close();
        void server.close();
      });
    } catch (error) {
      console.error('[mcp] Error handling request:', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error' },
          id: null,
        });
      }
    }
  }

  @Get()
  handleGet(@Res() res: Response) {
    // No server-initiated stream in stateless mode -- there's no session
    // for a GET to attach to.
    res.status(405).json(METHOD_NOT_ALLOWED);
  }

  @Delete()
  handleDelete(@Res() res: Response) {
    // No session to terminate in stateless mode.
    res.status(405).json(METHOD_NOT_ALLOWED);
  }
}
