import {setToken, getToken, setOnSessionExpired, ensureToken, api} from '../../api/client';

const mockFetch = global.fetch as jest.Mock;

beforeEach(() => {
  setToken(null);
  setOnSessionExpired(() => {});
  mockFetch.mockReset();
});

describe('Token management', () => {
  it('setToken / getToken round-trip', () => {
    expect(getToken()).toBeNull();
    setToken('abc123');
    expect(getToken()).toBe('abc123');
  });

  it('request adds Authorization header when token is set', async () => {
    setToken('my-token');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve([]),
    });

    await api.getUsers();

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers.Authorization).toBe('Bearer my-token');
  });

  it('request omits Authorization when no token', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve([]),
    });

    await api.getUsers();

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers.Authorization).toBeUndefined();
  });
});

describe('Response handling', () => {
  it('401 response clears token and calls onSessionExpired', async () => {
    setToken('valid-token');
    const onExpired = jest.fn();
    setOnSessionExpired(onExpired);

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({detail: 'Unauthorized'}),
    });

    await expect(api.getUsers()).rejects.toThrow('Session expired');
    expect(getToken()).toBeNull();
    expect(onExpired).toHaveBeenCalled();
  });

  it('204 response returns undefined', async () => {
    setToken('tok');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
    });

    const result = await api.deleteTicket(1);
    expect(result).toBeUndefined();
  });

  it('non-OK response throws with detail message', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () => Promise.resolve({detail: 'Bad request data'}),
    });

    await expect(api.getUsers()).rejects.toThrow('Bad request data');
  });
});

describe('getTickets query string', () => {
  it('builds correct query string from filters', async () => {
    setToken('tok');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({tickets: [], total: 0}),
    });

    await api.getTickets({
      queue_id: 10,
      status: ['OPEN', 'BLOCKED'],
      priority: ['SEV1'],
      search: 'prod',
      skip: 0,
      limit: 20,
    });

    const url: string = mockFetch.mock.calls[0][0];
    expect(url).toContain('queue_id=10');
    expect(url).toContain('status=OPEN');
    expect(url).toContain('status=BLOCKED');
    expect(url).toContain('priority=SEV1');
    expect(url).toContain('search=prod');
    expect(url).toContain('limit=20');
  });
});

describe('ensureToken', () => {
  it('loads from keychain when token is null', async () => {
    const Keychain = require('react-native-keychain');
    Keychain.getGenericPassword.mockResolvedValueOnce({
      password: 'keychain-token',
    });

    await ensureToken();
    expect(getToken()).toBe('keychain-token');
  });

  it('skips keychain when token already set', async () => {
    const Keychain = require('react-native-keychain');
    Keychain.getGenericPassword.mockClear();
    setToken('existing');

    await ensureToken();
    expect(Keychain.getGenericPassword).not.toHaveBeenCalled();
  });
});
