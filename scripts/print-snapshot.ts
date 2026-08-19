import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveAppDataDir, wispSqlitePath } from '../src/paths.ts'
import { isTransientStoreError, listProjects, openSqliteFile, snapshotProject, withWispCopy } from '../src/store.ts'
import { writeMiniSqlite } from '../tests/mini-fixture.ts'

const here = dirname(fileURLToPath(import.meta.url))
const miniPath = join(here, '..', 'testdata', 'mini.sqlite')
const projectArg = process.argv.slice(2).find((arg) => !arg.startsWith('-')) ?? '转录组分析'
const forceMini = process.argv.includes('--mini')

function printFromDb(db: ReturnType<typeof openSqliteFile>, appDataDir: string, label: string): void {
  const listed = listProjects(db, { appDataDir })
  const snap = snapshotProject(db, projectArg)
  const succeeded = snap.runStatus.find((row) => row.status === 'succeeded')?.n ?? 0
  const hasQc = snap.recentArtifacts.some((art) => art.filename === 'qc-report.html')
  console.log(`source: ${label}`)
  console.log(`appDataDir: ${appDataDir}`)
  console.log(`projects (${listed.projects.length}): ${listed.projects.map((p) => p.name).join(', ')}`)
  console.log(`snapshot: ${snap.name}`)
  console.log(`succeeded runs: ${succeeded}`)
  console.log(`qc-report.html: ${hasQc}`)
  console.log(JSON.stringify(snap, null, 2))
}

if (!forceMini) {
  const appDataDir = resolveAppDataDir()
  if (existsSync(wispSqlitePath(appDataDir))) {
    try {
      withWispCopy(appDataDir, (db) => {
        printFromDb(db, appDataDir, 'live-copy')
      })
      process.exit(0)
    } catch (error) {
      if (!isTransientStoreError(error)) throw error
      console.error(`live library skipped: ${error instanceof Error ? error.message : error}`)
    }
  }
}

if (!existsSync(miniPath)) writeMiniSqlite(miniPath)
const db = openSqliteFile(miniPath)
try {
  printFromDb(db, miniPath, 'testdata/mini.sqlite')
} finally {
  db.close()
}
