import { Response } from 'express';
import { McpController } from './mcp.controller';
import { McpServerFactory } from './mcp-server.factory';

function mockResponse() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res as unknown as Response;
}

describe('McpController', () => {
  // Stateless transport has no session for a GET stream to attach to, and
  // none to terminate via DELETE -- both are unconditional 405s regardless
  // of auth (McpAuthGuard, covered separately, runs before either).
  const controller = new McpController({} as McpServerFactory);

  it('GET /mcp reports method not allowed', () => {
    const res = mockResponse();
    controller.handleGet(res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: -32000 }),
      }),
    );
  });

  it('DELETE /mcp reports method not allowed', () => {
    const res = mockResponse();
    controller.handleDelete(res);
    expect(res.status).toHaveBeenCalledWith(405);
  });
});
