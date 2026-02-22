import { describe, expect, it } from 'vitest';
import { ApiError, parseApiError, toUserMessage } from '../lib/errors';

describe('web/lib/errors', () => {
  it('maps ApiError codes to user messages', () => {
    const err = new ApiError({ status: 400, code: 'INVALID_PARAMS', message: 'Invalid params' });
    expect(toUserMessage(err)).toBe('Bitte prüfen Sie die Eingaben (Parameter sind ungültig).');

    const err2 = new ApiError({ status: 404, code: 'NOT_FOUND', message: 'Not found' });
    expect(toUserMessage(err2)).toBe('Die Station wurde nicht gefunden.');
  });

  it('parses structured API error responses', async () => {
    const response = new Response(
      JSON.stringify({ error: { code: 'INVALID_PARAMS', message: 'Invalid query parameters' } }),
      { status: 400, headers: { 'content-type': 'application/json' } },
    );

    const apiErr = await parseApiError(response);

    expect(apiErr).toBeInstanceOf(ApiError);
    expect(apiErr.status).toBe(400);
    expect(apiErr.code).toBe('INVALID_PARAMS');
    expect(apiErr.message).toBe('Invalid query parameters');
  });
});