import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import worker from './index';

describe('Dictionary Worker', () => {
  const MOCK_ORIGIN = "https://wordfrog.superjeffc.com";
  const LOCAL_ORIGIN = "http://localhost:3000";
  const INVALID_ORIGIN = "https://evil.com";

  const setupFetchMock = () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes('wordfrogwordoftheday.superjeffc.com')) {
        return Promise.resolve(new Response(JSON.stringify({ word: 'frog' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        }));
      }
      return Promise.reject(new Error("Network Error"));
    });
    vi.stubGlobal('fetch', fetchMock);
  };

  beforeAll(async () => {
    // Populate KV mock for tests
    await env.DICTIONARY_KV.put('APPLE', 'true');
    await env.DICTIONARY_KV.put('BANANA', 'true');
    // For random endpoint mock
    setupFetchMock();
  });

  afterEach(() => {
    vi.clearAllMocks();
    setupFetchMock();
  });

  it('responds with 404 for unknown paths', async () => {
    const request = new Request('http://localhost/', {
        headers: { Origin: MOCK_ORIGIN }
    });
    const ctx = createExecutionContext();
    // @ts-ignore
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(404);
    const text = await response.text();
    expect(text).toContain('Not Found');
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(MOCK_ORIGIN);
  });

  describe('CORS', () => {
    it('handles OPTIONS request for valid origin', async () => {
      const request = new Request('http://localhost/validate', {
          method: 'OPTIONS',
          headers: { Origin: MOCK_ORIGIN }
      });
      const ctx = createExecutionContext();
      // @ts-ignore
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe(MOCK_ORIGIN);
    });

    it('handles OPTIONS request for localhost origin', async () => {
      const request = new Request('http://localhost/validate', {
          method: 'OPTIONS',
          headers: { Origin: LOCAL_ORIGIN }
      });
      const ctx = createExecutionContext();
      // @ts-ignore
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe(LOCAL_ORIGIN);
    });

    it('rejects OPTIONS request for invalid origin', async () => {
      const request = new Request('http://localhost/validate', {
          method: 'OPTIONS',
          headers: { Origin: INVALID_ORIGIN }
      });
      const ctx = createExecutionContext();
      // @ts-ignore
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(403);
    });
  });

  describe('/validate endpoint', () => {
    it('validates a known word', async () => {
      const request = new Request('http://localhost/validate', {
          method: 'POST',
          headers: {
            Origin: MOCK_ORIGIN,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ word: 'apple' })
      });
      const ctx = createExecutionContext();
      // @ts-ignore
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(200);
      const data = await response.json() as any;
      expect(data.valid).toBe(true);
    });

    it('rejects an unknown word', async () => {
      const request = new Request('http://localhost/validate', {
          method: 'POST',
          headers: {
            Origin: MOCK_ORIGIN,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ word: 'xyzzy' })
      });
      const ctx = createExecutionContext();
      // @ts-ignore
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(200);
      const data = await response.json() as any;
      expect(data.valid).toBe(false);
    });

    it('rejects malformed words', async () => {
      const request = new Request('http://localhost/validate', {
          method: 'POST',
          headers: {
            Origin: MOCK_ORIGIN,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ word: 'a123' })
      });
      const ctx = createExecutionContext();
      // @ts-ignore
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(200);
      const data = await response.json() as any;
      expect(data.valid).toBe(false);
    });

    it('handles missing body', async () => {
      const request = new Request('http://localhost/validate', {
          method: 'POST',
          headers: { Origin: MOCK_ORIGIN }
      });
      const ctx = createExecutionContext();
      // @ts-ignore
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(400);
    });

    it('handles missing word parameter', async () => {
      const request = new Request('http://localhost/validate', {
          method: 'POST',
          headers: {
            Origin: MOCK_ORIGIN,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ somethingElse: 'apple' })
      });
      const ctx = createExecutionContext();
      // @ts-ignore
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(400);
      const data = await response.json() as any;
      expect(data.error).toBe('Missing word parameter');
    });
  });

  describe('/random endpoint', () => {
    it('returns a random word', async () => {
      const request = new Request('http://localhost/random', {
          method: 'GET',
          headers: { Origin: MOCK_ORIGIN }
      });
      const ctx = createExecutionContext();
      // @ts-ignore
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(200);
      const data = await response.json() as any;
      expect(data.word).toBe('FROG'); // Mapped to uppercase
    });

    it('returns a fallback word if fetch fails', async () => {
      // Override the mock to throw for this test
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network Error')));

      const request = new Request('http://localhost/random', {
          method: 'GET',
          headers: { Origin: MOCK_ORIGIN }
      });
      const ctx = createExecutionContext();
      // @ts-ignore
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(200);
      const data = await response.json() as any;
      expect(data.error).toBe('Failed to fetch random date word, using fallback');
      const fallbacks = ["FROG", "LEAP", "POND", "TOAD", "WATER", "GREEN", "JUMP", "CROAK"];
      expect(fallbacks).toContain(data.word);
    });
  });
});
