/** Direct transport for reviewed release SELECTs that exceed the management API limit. */
import { execFile } from 'node:child_process';
import path from 'node:path';

const args = ['-X', '-w', '-qAt', '-v', 'ON_ERROR_STOP=1', '-f', '-'];

function executePsql(sql, env) {
  return new Promise((resolve, reject) => {
    const child = execFile(
      'psql',
      args,
      {
        env,
        timeout: 150000,
        maxBuffer: 16 * 1024 * 1024,
      },
      (error, stdout) => {
        // Driver errors can include the URL, password or SQL. Keep them out of reports.
        if (error)
          reject(
            new Error(
              'Direct read-only query failed; check psql availability, credentials, TLS and query compatibility'
            )
          );
        else resolve(stdout);
      }
    );
    child.stdin.on('error', () => {
      reject(new Error('Direct read-only query input failed'));
    });
    child.stdin.end(sql);
  });
}

/** Credentials stay in the child environment, never process arguments or SQL. */
export function createPostgresRead(project, variable, { environment = process.env, execute = executePsql } = {}) {
  if (!/^[a-z0-9]{20}$/.test(project)) throw new Error('Invalid Supabase project reference');
  if (!/^[A-Z][A-Z0-9_]*$/.test(variable)) throw new Error('Use an environment variable name for the database URL');
  let connection, username, password;
  try {
    connection = new URL(environment[variable]);
    username = decodeURIComponent(connection.username);
    password = decodeURIComponent(connection.password);
  } catch {
    throw new Error('Database URL is missing or malformed');
  }
  const direct = connection.hostname === 'db.' + project + '.supabase.co' && username === 'postgres';
  const pooler = /^[a-z0-9-]+\.pooler\.supabase\.com$/.test(connection.hostname) && username === 'postgres.' + project;
  const parameters = [...connection.searchParams];
  if (
    !['postgres:', 'postgresql:'].includes(connection.protocol) ||
    (!direct && !pooler) ||
    connection.pathname !== '/postgres' ||
    connection.hash ||
    !password ||
    /[\x00-\x1f]/.test(password) ||
    !['', '5432', ...(pooler ? ['6543'] : [])].includes(connection.port) ||
    parameters.some(([name, value]) => name !== 'sslmode' || !['require', 'verify-full'].includes(value)) ||
    parameters.length > 1
  ) {
    throw new Error('Database URL must identify this Supabase project and the postgres database');
  }
  const rootCertificate = environment.PGSSLROOTCERT ?? 'system';
  if (rootCertificate !== 'system' && !path.isAbsolute(rootCertificate))
    throw new Error('PGSSLROOTCERT must be system or an absolute certificate path');
  // Discard libpq host/service/options overrides before constructing the fixed connection.
  const env = Object.fromEntries(
    Object.entries(environment).filter(([name]) => !name.startsWith('PG') && name !== variable)
  );
  Object.assign(env, {
    PGHOST: connection.hostname,
    PGPORT: connection.port || '5432',
    PGDATABASE: 'postgres',
    PGUSER: username,
    PGPASSWORD: password,
    PGCONNECT_TIMEOUT: '15',
    PGSSLMODE: 'verify-full',
    PGSSLROOTCERT: rootCertificate,
    PGGSSENCMODE: 'disable',
    PGAPPNAME: 'wanderers-guide-release-verifier',
  });
  return async (query) => {
    if (typeof query !== 'string' || !query.trim() || /(^|\n)\s*\\/.test(query))
      throw new Error('Expected a reviewed release SELECT without psql commands');
    const statement = query.trim().replace(/;$/, '');
    const sql =
      "begin read only;\nset local statement_timeout='120s';\nset local lock_timeout='5s';\n" +
      "select jsonb_build_object('read_only',current_setting('transaction_read_only'),'rows'," +
      "coalesce(jsonb_agg(to_jsonb(release_rows)),'[]'::jsonb)) from (\n" +
      statement +
      '\n) release_rows;\nrollback;\n';
    let stdout;
    try {
      stdout = await execute(sql, env);
    } catch {
      throw new Error('Direct read-only query failed; no release result was accepted');
    }
    let result;
    try {
      result = JSON.parse(stdout);
    } catch {
      throw new Error('Direct read-only query returned invalid JSON');
    }
    if (
      !result ||
      Object.keys(result).sort().join(',') !== 'read_only,rows' ||
      result.read_only !== 'on' ||
      !Array.isArray(result.rows) ||
      result.rows.some((row) => !row || typeof row !== 'object' || Array.isArray(row))
    )
      throw new Error('Direct query did not prove a read-only row result');
    return result.rows;
  };
}
