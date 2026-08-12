export type ActivityType =
  | 'login'
  | 'login_failed'
  | 'logout'
  | 'password_set'
  | 'account_locked'
  | 'user_created'
  | 'user_updated'
  | 'association_created'
  | 'vendor_created'
  | 'speaker_added'
  | 'access_request';

function getIp(request: Request): string | undefined {
  return request.headers.get('cf-connecting-ip') ?? undefined;
}

export async function logActivity(
  db: D1Database,
  request: Request,
  type: ActivityType,
  email: string,
  details?: string
): Promise<void> {
  try {
    await db
      .prepare(
        'INSERT INTO activity_log (event_type, email, details, ip) VALUES (?, ?, ?, ?)'
      )
      .bind(type, email, details ?? null, getIp(request) ?? null)
      .run();
  } catch {
    // best-effort -- never break auth flows
  }
}

export interface ActivityEvent {
  id: number;
  event_type: ActivityType;
  email: string | null;
  details: string | null;
  ip: string | null;
  created_at: string;
}

export async function getActivityEvents(
  db: D1Database,
  limit = 50
): Promise<ActivityEvent[]> {
  const result = await db
    .prepare('SELECT * FROM activity_log ORDER BY created_at DESC LIMIT ?')
    .bind(limit)
    .all<ActivityEvent>();
  return result.results;
}

const TYPE_LABELS: Record<string, string> = {
  login: 'Signed in',
  login_failed: 'Failed sign-in',
  logout: 'Signed out',
  password_set: 'Password changed',
  account_locked: 'Account locked',
  user_created: 'User created',
  user_updated: 'User updated',
  association_created: 'Association created',
  vendor_created: 'Vendor created',
  speaker_added: 'Speaker added',
  access_request: 'Access requested',
};

export function activityLabel(type: string): string {
  return TYPE_LABELS[type] ?? type;
}
