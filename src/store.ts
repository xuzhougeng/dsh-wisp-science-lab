import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomBytes } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import { toLocalWorkspaceDir, wispSqlitePath } from './paths.ts'
import type {
  ListProjectsResult,
  ProjectRow,
  ProjectSnapshot,
  ProjectSummary,
  RecentArtifact,
  RecentRun,
  RecentSession,
  ResearchKindGroup,
  RunStatusCount,
  SnapshotLimits,
} from './types.ts'

export const DEFAULT_LIMITS: SnapshotLimits = {
  maxSessions: 8,
  maxRuns: 12,
  maxArtifacts: 12,
  maxMemoryFiles: 20,
  wispMdMaxBytes: 8192,
}

export const LAST_USER_EXCERPT_CHARS = 500
export const MAX_TITLES_PER_KIND = 8

const SESSION_IS_LISTABLE_SQL = `(
EXISTS (SELECT 1 FROM messages mm WHERE mm.frame_id = f.id AND mm.role = 'user')
OR TRIM(COALESCE(f.title, '')) <> '')`

export interface OpenedStore {
  db: DatabaseSync
  tmpDir: string
  source: string
  copied: string[]
  close(): void
}

export interface StoreColumns {
  projects: Set<string>
  frames: Set<string>
  artifacts: Set<string>
  runs: Set<string>
  research_nodes: Set<string>
}

function tableColumns(db: DatabaseSync, table: string): Set<string> {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(table)) {
    throw new Error(`invalid table name: ${table}`)
  }
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]
  return new Set(rows.map((row) => row.name))
}

export function inspectColumns(db: DatabaseSync): StoreColumns {
  return {
    projects: tableColumns(db, 'projects'),
    frames: tableColumns(db, 'frames'),
    artifacts: tableColumns(db, 'artifacts'),
    runs: tableColumns(db, 'runs'),
    research_nodes: tableColumns(db, 'research_nodes'),
  }
}

function projectPredicate(cols: StoreColumns, alias = 'p'): string {
  const parts = [`${alias}.id NOT LIKE 'scratch:%'`]
  if (cols.projects.has('ephemeral')) {
    parts.push(`COALESCE(${alias}.ephemeral, 0) = 0`)
  }
  return parts.join(' AND ')
}

function mainline(cols: Set<string>, alias: string): string {
  return cols.has('exploration_id') ? ` AND ${alias}.exploration_id IS NULL` : ''
}

function sessionListable(cols: StoreColumns): string {
  if (!cols.frames.has('title')) {
    return '1'
  }
  return SESSION_IS_LISTABLE_SQL
}

export function unixIso(seconds: number | null | undefined): string | null {
  if (seconds == null || !Number.isFinite(seconds)) return null
  return new Date(seconds * 1000).toISOString()
}

export function copyWispDb(appDataDir: string, destDir: string): { dest: string; copied: string[] } {
  const source = wispSqlitePath(appDataDir)
  if (!existsSync(source)) {
    throw new Error(`wisp.sqlite not found at ${source} (appDataDir=${appDataDir})`)
  }
  mkdirSync(destDir, { recursive: true })
  const dest = join(destDir, 'wisp.sqlite')
  const copied: string[] = []
  copyFileSync(source, dest)
  copied.push('wisp.sqlite')
  for (const suffix of ['-wal', '-shm'] as const) {
    const side = source + suffix
    if (existsSync(side)) {
      copyFileSync(side, dest + suffix)
      copied.push(`wisp.sqlite${suffix}`)
    }
  }
  return { dest, copied }
}

export function openWispCopy(appDataDir: string): OpenedStore {
  const tmpDir = join(tmpdir(), `wisp-lab-${process.pid}-${randomBytes(4).toString('hex')}`)
  const { dest, copied } = copyWispDb(appDataDir, tmpDir)
  const db = new DatabaseSync(dest, { readOnly: true })
  return {
    db,
    tmpDir,
    source: wispSqlitePath(appDataDir),
    copied,
    close() {
      try {
        db.close()
      } finally {
        rmSync(tmpDir, { recursive: true, force: true })
      }
    },
  }
}

export function openSqliteFile(path: string, readOnly = true): DatabaseSync {
  return new DatabaseSync(path, { readOnly })
}

export function withWispCopy<T>(appDataDir: string, fn: (db: DatabaseSync) => T): T {
  const handle = openWispCopy(appDataDir)
  try {
    return fn(handle.db)
  } finally {
    handle.close()
  }
}

function toSummary(row: ProjectRow, resolveLocal = toLocalWorkspaceDir): ProjectSummary {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    workspaceDir: row.workspace_dir,
    workspaceDirLocal: resolveLocal(row.workspace_dir),
    updatedAt: row.updated_at,
    updatedAtIso: unixIso(row.updated_at),
    createdAt: row.created_at,
    createdAtIso: unixIso(row.created_at),
    sessions: row.sessions,
    artifacts: row.artifacts,
    runs: row.runs,
    researchNodes: row.research_nodes,
  }
}

export function listProjectRows(db: DatabaseSync, query = ''): ProjectRow[] {
  const cols = inspectColumns(db)
  const sql = `
    SELECT p.id AS id,
           COALESCE(p.name, '') AS name,
           COALESCE(p.description, '') AS description,
           COALESCE(p.workspace_dir, '') AS workspace_dir,
           p.created_at AS created_at,
           p.updated_at AS updated_at,
           (SELECT COUNT(*) FROM frames f
             WHERE f.project_id = p.id
               AND f.parent_frame_id = f.id
               ${mainline(cols.frames, 'f')}
               AND ${sessionListable(cols)}) AS sessions,
           (SELECT COUNT(*) FROM artifacts a
             WHERE a.project_id = p.id
               ${mainline(cols.artifacts, 'a')}) AS artifacts,
           (SELECT COUNT(*) FROM runs r
             WHERE r.project_id = p.id
               ${mainline(cols.runs, 'r')}) AS runs,
           (SELECT COUNT(*) FROM research_nodes n
             WHERE n.project_id = p.id
               ${mainline(cols.research_nodes, 'n')}) AS research_nodes
    FROM projects p
    WHERE ${projectPredicate(cols, 'p')}
    ORDER BY p.updated_at DESC
  `
  const rows = db.prepare(sql).all() as ProjectRow[]
  const needle = query.trim().toLowerCase()
  if (!needle) return rows
  return rows.filter((row) =>
    row.name.toLowerCase().includes(needle)
    || row.id.toLowerCase().includes(needle)
    || row.description.toLowerCase().includes(needle),
  )
}

export function listProjects(
  db: DatabaseSync,
  options: { appDataDir: string; query?: string; resolveLocal?: typeof toLocalWorkspaceDir } ,
): ListProjectsResult {
  const resolveLocal = options.resolveLocal ?? toLocalWorkspaceDir
  return {
    appDataDir: options.appDataDir,
    projects: listProjectRows(db, options.query ?? '').map((row) => toSummary(row, resolveLocal)),
  }
}

export function resolveProject(db: DatabaseSync, project: string): ProjectRow {
  const q = project.trim()
  if (!q) throw new Error('project is required')
  const all = listProjectRows(db)
  const names = all.map((row) => row.name)
  const format = (rows: ProjectRow[]) => rows.map((row) => `${row.name} (${row.id})`).join(', ')

  const exactId = all.filter((row) => row.id === q)
  if (exactId.length === 1) return exactId[0]!

  const exactName = all.filter((row) => row.name === q)
  if (exactName.length === 1) return exactName[0]!

  const lower = q.toLowerCase()
  const partial = all.filter((row) =>
    row.name.toLowerCase().includes(lower) || row.id.toLowerCase().startsWith(lower),
  )
  if (partial.length === 1) return partial[0]!
  if (partial.length > 1) {
    throw new Error(`project ${JSON.stringify(q)} matches more than one: ${format(partial)}`)
  }
  throw new Error(`no project matches ${JSON.stringify(q)}. candidates: ${names.join(', ') || '(none)'}`)
}

export function extractUserText(raw: string | null | undefined): string {
  if (raw == null) return ''
  const trimmed = raw.trim()
  if (!trimmed) return ''
  try {
    const parsed: unknown = JSON.parse(trimmed)
    if (typeof parsed === 'string') return parsed
    if (Array.isArray(parsed)) {
      return parsed
        .filter((part): part is { type: string; text: string } =>
          Boolean(part) && typeof part === 'object' && (part as { type?: unknown }).type === 'text'
          && typeof (part as { text?: unknown }).text === 'string',
        )
        .map((part) => part.text)
        .join('\n')
    }
  } catch {
    return trimmed
  }
  return trimmed
}

function truncateChars(text: string, maxChars: number): string {
  return text.length <= maxChars ? text : text.slice(0, maxChars)
}

function readWispMd(localDir: string | null, maxBytes: number): { text: string | null; truncated: boolean } {
  if (!localDir) return { text: null, truncated: false }
  const path = join(localDir, '.wisp', 'WISP.md')
  if (!existsSync(path)) return { text: null, truncated: false }
  const buf = readFileSync(path)
  if (buf.byteLength <= maxBytes) {
    return { text: buf.toString('utf8'), truncated: false }
  }
  return { text: buf.subarray(0, maxBytes).toString('utf8'), truncated: true }
}

function listMemoryFiles(localDir: string | null, maxFiles: number): string[] {
  if (!localDir) return []
  const dir = join(localDir, '.wisp', 'memory')
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort()
    .slice(0, maxFiles)
}

function lastUserExcerpt(db: DatabaseSync, projectId: string): string | null {
  const row = db.prepare(`
    SELECT m.content AS content
    FROM messages m
    JOIN frames f ON f.id = m.frame_id
    WHERE f.project_id = ? AND m.role = 'user'
    ORDER BY m.ts DESC, m.seq DESC
    LIMIT 1
  `).get(projectId) as { content: string | null } | undefined
  if (!row) return null
  const text = extractUserText(row.content).trim()
  if (!text) return null
  return truncateChars(text, LAST_USER_EXCERPT_CHARS)
}

function explorationCount(db: DatabaseSync, cols: StoreColumns, projectId: string): number {
  if (!cols.frames.has('exploration_id')) return 0
  const row = db.prepare(`
    SELECT COUNT(DISTINCT exploration_id) AS n
    FROM frames
    WHERE project_id = ? AND exploration_id IS NOT NULL
  `).get(projectId) as { n: number }
  return row.n
}

export function snapshotProject(
  db: DatabaseSync,
  project: string,
  options: {
    limits?: Partial<SnapshotLimits>
    resolveLocal?: typeof toLocalWorkspaceDir
  } = {},
): ProjectSnapshot {
  const limits: SnapshotLimits = { ...DEFAULT_LIMITS, ...options.limits }
  const resolveLocal = options.resolveLocal ?? toLocalWorkspaceDir
  const cols = inspectColumns(db)
  const row = resolveProject(db, project)
  const local = resolveLocal(row.workspace_dir)
  const { text: wispMd, truncated: wispMdTruncated } = readWispMd(local, limits.wispMdMaxBytes)

  const recentSessions = db.prepare(`
    SELECT f.id AS id, f.title AS title, f.status AS status, f.updated_at AS updated_at
    FROM frames f
    WHERE f.project_id = ?
      AND f.parent_frame_id = f.id
      ${mainline(cols.frames, 'f')}
      AND ${sessionListable(cols)}
    ORDER BY f.updated_at DESC
    LIMIT ?
  `).all(row.id, limits.maxSessions) as { id: string; title: string | null; status: string; updated_at: number }[]

  const recentRuns = db.prepare(`
    SELECT id, title, kind, status, exit_code, ended_at
    FROM runs r
    WHERE r.project_id = ?
      ${mainline(cols.runs, 'r')}
    ORDER BY COALESCE(r.ended_at, r.created_at) DESC, r.id DESC
    LIMIT ?
  `).all(row.id, limits.maxRuns) as {
    id: string
    title: string
    kind: string
    status: string
    exit_code: number | null
    ended_at: number | null
  }[]

  const runStatus = (db.prepare(`
    SELECT status, COUNT(*) AS n
    FROM runs r
    WHERE r.project_id = ?
      ${mainline(cols.runs, 'r')}
    GROUP BY status
    ORDER BY status
  `).all(row.id) as RunStatusCount[]).map((item) => ({ status: item.status, n: Number(item.n) }))

  const recentArtifacts = db.prepare(`
    SELECT filename, content_type, created_at
    FROM artifacts a
    WHERE a.project_id = ?
      ${mainline(cols.artifacts, 'a')}
    ORDER BY a.created_at DESC, a.id DESC
    LIMIT ?
  `).all(row.id, limits.maxArtifacts) as { filename: string; content_type: string; created_at: number }[]

  const researchRows = db.prepare(`
    SELECT kind, title
    FROM research_nodes n
    WHERE n.project_id = ?
      ${mainline(cols.research_nodes, 'n')}
    ORDER BY n.updated_at DESC, n.id DESC
  `).all(row.id) as { kind: string; title: string }[]

  const groups = new Map<string, ResearchKindGroup>()
  for (const node of researchRows) {
    let group = groups.get(node.kind)
    if (!group) {
      group = { kind: node.kind, count: 0, titles: [] }
      groups.set(node.kind, group)
    }
    group.count += 1
    if (group.titles.length < MAX_TITLES_PER_KIND) group.titles.push(node.title)
  }

  return {
    ...toSummary(row, resolveLocal),
    explorationCount: explorationCount(db, cols, row.id),
    runStatus,
    recentSessions: recentSessions.map((session): RecentSession => ({
      id: session.id,
      title: session.title,
      status: session.status,
      updatedAt: session.updated_at,
      updatedAtIso: unixIso(session.updated_at),
    })),
    recentRuns: recentRuns.map((run): RecentRun => ({
      id: run.id,
      title: run.title,
      kind: run.kind,
      status: run.status,
      exitCode: run.exit_code,
      endedAt: run.ended_at,
      endedAtIso: unixIso(run.ended_at),
    })),
    recentArtifacts: recentArtifacts.map((art): RecentArtifact => ({
      filename: art.filename,
      contentType: art.content_type,
      createdAt: art.created_at,
      createdAtIso: unixIso(art.created_at),
    })),
    researchNodeGroups: [...groups.values()],
    wispMd,
    wispMdTruncated,
    memoryFiles: listMemoryFiles(local, limits.maxMemoryFiles),
    lastUserExcerpt: lastUserExcerpt(db, row.id),
  }
}

export function renderSnapshotSummary(snap: ProjectSnapshot): string {
  const succeeded = snap.runStatus.find((row) => row.status === 'succeeded')?.n ?? 0
  const failed = snap.runStatus.find((row) => row.status === 'failed')?.n ?? 0
  const runBits = snap.runStatus.map((row) => `${row.status}=${row.n}`).join(', ') || 'none'
  const recent = snap.recentRuns.slice(0, 3).map((run) => run.title).join('；') || '（无）'
  const files = snap.recentArtifacts.map((art) => art.filename).join(', ') || '（无）'
  return [
    `${snap.name}  上次更新 ${snap.updatedAtIso ?? snap.updatedAt}`,
    `Run ${runBits}（成功 ${succeeded} / 失败 ${failed}）`,
    `最近 Run：${recent}`,
    `产物：${files}`,
  ].join('\n')
}

export function isTransientStoreError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /disk I\/O error|database is locked|SQLITE_BUSY|SQLITE_IOERR|unable to open database/i.test(message)
}
