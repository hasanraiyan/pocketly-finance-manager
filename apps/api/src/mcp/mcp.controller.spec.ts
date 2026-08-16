import type { Response } from 'express';
import { McpController } from './mcp.controller';
import { McpServerFactory } from './mcp-server.factory';

function mockResponse(): {
  res: Response;
  status: jest.Mock;
  json: jest.Mock;
} {
  const json: jest.Mock = jest.fn();
  const status: jest.Mock = jest.fn(() => ({ json }));
  const res = { status, json } as unknown as Response;
  return { res, status, json };
}

describe('McpController', () => {
  // Stateless transport has no session for a GET stream to attach to, and
  // none to terminate via DELETE -- both are unconditional 405s regardless
  // of auth (McpAuthGuard, covered separately, runs before either).
  const controller = new McpController({} as McpServerFactory);

  it('GET /mcp reports method not allowed', () => {
    const { res, status, json } = mockResponse();
    controller.handleGet(res);
    expect(status).toHaveBeenCalledWith(405);
    expect(json).toHaveBeenCalledWith({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Method not allowed.' },
      id: null,
    });
  });

  it('DELETE /mcp reports method not allowed', () => {
    const { res, status } = mockResponse();
    controller.handleDelete(res);
    expect(status).toHaveBeenCalledWith(405);
  });
});
