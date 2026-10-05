// Applies every SQL file in supabase/migrations to your Supabase database.
//
// Usage:
//   1. Create `supabase/.env.local` (git-ignored) with:
//        SUPABASE_DB_URL=postgresql://postgres:<YOUR-PASSWORD>@db.<project-ref>.supabase.co:5432/postgres
//      (URL-encode special characters in the password, e.g. % → %25, + → %2B)
//   2. npm run db:migrate
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import pg from 'pg'

const root = new URL('..', import.meta.url).pathname
const localEnv = join(root, 'supabase/.env.local')
if (existsSync(localEnv)) {
  for (const line of readFileSync(localEnv, 'utf8').split('\n')) {
    const i = line.indexOf('=')
    if (i > 0 && !line.trim().startsWith('#')) process.env[line.slice(0, i).trim()] ??= line.slice(i + 1).trim()
  }
}

const connectionString = process.env.SUPABASE_DB_URL
if (!connectionString) {
  console.error('Missing SUPABASE_DB_URL. Add it to supabase/.env.local (see the comment at the top of this script).')
  process.exit(1)
}

const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } })
const dir = join(root, 'supabase/migrations')
const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()

await client.connect()
try {
  for (const file of files) {
    process.stdout.write(`→ ${file} … `)
    await client.query(readFileSync(join(dir, file), 'utf8'))
    console.log('ok')
  }
  console.log(`\nDone — ${files.length} migration(s) applied.`)
} catch (err) {
  console.error('\nMigration failed:', err.message)
  process.exitCode = 1
} finally {
  await client.end()
}
