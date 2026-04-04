const SUPABASE_API_BASE = 'https://api.supabase.com/v1';

function getAccessToken() {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) throw new Error('SUPABASE_ACCESS_TOKEN environment variable is not set');
  return token;
}

async function supabaseRequest(method, path, body) {
  const token = getAccessToken();
  const res = await fetch(`${SUPABASE_API_BASE}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!res.ok) {
    throw new Error(`Supabase API error ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

export async function listOrganizations() {
  return supabaseRequest('GET', '/organizations');
}

export async function createProject({ name, organizationId, dbPassword, region = 'eu-central-1', plan = 'free' }) {
  return supabaseRequest('POST', '/projects', {
    name,
    organization_id: organizationId,
    db_pass: dbPassword,
    region,
    plan,
  });
}

export async function getProject(projectRef) {
  return supabaseRequest('GET', `/projects/${projectRef}`);
}

export async function waitForProjectReady(projectRef, timeoutMs = 300000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const project = await getProject(projectRef);
    if (project.status === 'ACTIVE_HEALTHY') return project;
    if (project.status === 'INACTIVE' || project.status === 'REMOVED') {
      throw new Error(`Project entered unexpected status: ${project.status}`);
    }
    await new Promise(r => setTimeout(r, 5000));
  }
  throw new Error('Timeout waiting for Supabase project to become ready');
}

export async function getProjectDatabaseUrl(projectRef, dbPassword) {
  const host = `db.${projectRef}.supabase.co`;
  return `postgresql://postgres:${encodeURIComponent(dbPassword)}@${host}:5432/postgres`;
}

export function generateDbPassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let pass = '';
  for (let i = 0; i < 24; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}
