// Observe console — builds a Markdown error report an engineer (or a coding
// agent) can act on. Deliberately omits names and emails: roles and tenants
// are enough context for a fix, and the report tends to get pasted into
// other tools.
import type { ErrorGroupData, ErrorsRangeData, ObserveUserRef } from '@/services/types/observe'
import { roleLabel } from './format'

const fence = (s: string) => '```\n' + s.replace(/```/g, "'''") + '\n```'
const who = (u: ObserveUserRef | null) =>
  u ? `${roleLabel(u.role)} @ tenant ${u.tenantId ? u.tenantId.slice(0, 8) : 'unknown'}` : 'anonymous'

const CONTEXT = `## Codebase context
- Backend: \`thesmarthost-backend\` (Express 5, CommonJS). Pattern: routes → \`controllers/\` → \`queries/*.queries.js\` (raw \`pg\` via \`config/database.js\`, no ORM). Logging is pino + pino-http; controllers catch their own errors and log with \`logger.error\`, so a server message above is that log line plus the thrown error.
- Auth: Supabase JWTs verified in \`middleware/auth.js\`, which resolves the role (ADMIN, PROPERTY-MANAGER, TEAM_MEMBER, CLIENT, CLEANER, CONTRACTOR) and the owning property manager (tenant). PMs/team members may impersonate portal users via the \`X-Impersonate-As\` header.
- Frontend: \`thesmarthost\` (Next 16 App Router, React 19, TypeScript). All API calls go through \`src/services/apiClient.ts\` (\`/api\` base, Supabase bearer token, one silent 401 refresh-and-retry). Errors with source "client" were raised in the browser, not by the backend.
- \`request id\` matches the \`X-Request-Id\` response header and the pino-http request id (\`logger.js\` genReqId), so it can be grepped in the backend logs.

## Ask
Find the root cause, propose the smallest fix, and add a test that fails before and passes after.`

function distinctStacks(rows: { stack: string | null }[], max: number): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const r of rows) {
    if (!r.stack) continue
    const key = r.stack.split('\n').slice(0, 3).join('\n')
    if (seen.has(key)) continue
    seen.add(key)
    out.push(r.stack)
    if (out.length >= max) break
  }
  return out
}

export function buildGroupReport(d: ErrorGroupData): string {
  const g = d.group
  const stacks = distinctStacks(d.occurrences, 3)
  if (stacks.length === 0 && g.sampleStack) stacks.push(g.sampleStack)
  const affected = d.affectedUsers.map((a) => `${a.count}× ${who(a.user)}`).join(', ') || 'no signed-in users'
  const recent = d.occurrences
    .slice(0, 10)
    .map(
      (o) =>
        `- ${o.ts}${o.status !== null ? ` · HTTP ${o.status}` : ''}${o.requestId ? ` · request id ${o.requestId}` : ''} · ${who(o.user)}`
    )
  return [
    `# SmartHost error report`,
    ``,
    `- **Fingerprint:** ${g.fingerprint}`,
    `- **Source:** ${g.source} (${g.source === 'server' ? 'backend log / crash' : 'browser'})`,
    `- **Where:** \`${g.location ?? 'unknown'}\``,
    `- **Message:** ${g.message}`,
    `- **Occurrences:** ${g.count} in the last ${d.window.key} (${d.window.from} → ${d.window.to})`,
    `- **First seen:** ${g.firstSeen} · **Last seen:** ${g.lastSeen}`,
    `- **Affected:** ${affected}`,
    g.sampleRequestId ? `- **Sample request id:** ${g.sampleRequestId}` : null,
    ``,
    `## Stack trace${stacks.length > 1 ? 's (distinct)' : ''}`,
    stacks.length ? stacks.map(fence).join('\n\n') : '_No stack captured for this group._',
    ``,
    `## Recent occurrences`,
    recent.length ? recent.join('\n') : '_none in window_',
    ``,
    CONTEXT,
  ]
    .filter((l): l is string => l !== null)
    .join('\n')
}

export function buildSliceReport(r: ErrorsRangeData): string {
  const groups = r.groups.map(
    (g) => `- ${g.count}× [${g.source}] \`${g.location ?? 'unknown'}\` — ${g.message} (fingerprint ${g.fingerprint})`
  )
  const stacks = r.groups
    .slice(0, 3)
    .map((g) => {
      const sample = r.errors.find((e) => e.fingerprint === g.fingerprint && e.stack)
      return sample ? `### ${g.message}\n${fence(sample.stack as string)}` : null
    })
    .filter(Boolean)
  const requestIds = r.errors
    .filter((e) => e.requestId)
    .slice(0, 10)
    .map((e) => `- ${e.ts} · ${e.fingerprint} · request id ${e.requestId} · ${who(e.user)}`)
  return [
    `# SmartHost error spike report`,
    ``,
    `- **Slice:** ${r.from} → ${r.to}`,
    `- **Errors in slice:** ${r.errors.length}${r.errors.length >= 200 ? ' (capped at 200)' : ''} across ${r.groups.length} groups`,
    ``,
    `## What broke, most frequent first`,
    groups.join('\n') || '_nothing_',
    ``,
    `## Sample stack traces`,
    stacks.join('\n\n') || '_No stacks captured in this slice._',
    ``,
    `## Sample requests`,
    requestIds.join('\n') || '_No request ids in this slice._',
    ``,
    CONTEXT,
  ].join('\n')
}
