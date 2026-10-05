import { getRandomWord } from '../practice';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

describe('getRandomWord', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('fetches a random word successfully', async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ word: 'test' }),
    });
    global.fetch = mockFetch as any;

    const result = await getRandomWord();
    expect(result).toBe('TEST');
    expect(mockFetch).toHaveBeenCalledWith('https://word-frog-dictionary-api.superjeffc.workers.dev/random');
  });

  it('returns a fallback word on network error', async () => {
    global.fetch = jest.fn().mockRejectedValueOnce(new Error('Network error')) as any;

    const result = await getRandomWord();
    expect(["FROG", "LEAP", "POND", "TOAD", "WATER", "GREEN", "JUMP", "CROAK"]).toContain(result);
    expect(console.error).toHaveBeenCalled();
  });

  it('returns a fallback word on non-ok status', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
    }) as any;

    const result = await getRandomWord();
    expect(["FROG", "LEAP", "POND", "TOAD", "WATER", "GREEN", "JUMP", "CROAK"]).toContain(result);
    expect(console.error).toHaveBeenCalled();
  });
});
