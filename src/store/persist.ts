const USER_KEY = 'planttrack:user';

type PersistedUser = {
  name: string;
  role: string;
  email: string;
  token: string | null;
  organizationId: number | null;
  organizationName: string;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function loadPersistedUser(): (PersistedUser & { authenticated: boolean }) | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isObject(parsed)) return null;

    const name = typeof parsed.name === 'string' ? parsed.name : 'Guest';
    const role = typeof parsed.role === 'string' ? parsed.role : 'Visitor';
    const email = typeof parsed.email === 'string' ? parsed.email : '';
    const token = typeof parsed.token === 'string' ? parsed.token : null;
    const organizationId = typeof parsed.organizationId === 'number' ? parsed.organizationId : null;
    const organizationName = typeof parsed.organizationName === 'string' ? parsed.organizationName : '';

    return {
      name,
      role,
      email,
      token,
      organizationId,
      organizationName,
      authenticated: Boolean(token)
    };
  } catch {
    return null;
  }
}

export function savePersistedUser(user: PersistedUser) {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // ignore storage failures
  }
}

export function clearPersistedUser() {
  try {
    localStorage.removeItem(USER_KEY);
  } catch {
    // ignore storage failures
  }
}

