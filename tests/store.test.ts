import assert from 'node:assert/strict'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { after, before, describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  copyWispDb,
  extractUserText,
  isTransientStoreError,
  listProjects,
  openSqliteFile,
  openWispCopy,
  resolveProject,
  snapshotProject,
} from '../src/store.ts'
import { resolveAppDataDir, wispSqlitePath, WSL_WINDOWS_APP_DATA } from '../src/paths.ts'
import { writeMiniSqlite } from './mini-fixture.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const miniPath = join(root, 'testdata', 'mini.sqlite')
const fixtureWorkspace = join(root, 'testdata', 'workspaces', 'rna-seq')
const tmpRoot = join(tmpdir(), `wisp-lab-test-${process.pid}`)

const resolveLocal = (workspaceDir: string) =>
  workspaceDir === 'D:\\Wisp-Science\\rna-seq' ? fixtureWorkspace : null

before(() => {
  rmSync(miniPath, { force: true })
  writeMiniSqlite(miniPath)
})

describe('store on mini.sqlite', { concurrency: false }, () => {

  it('lists the two fixture projects and hides scratch/ephemeral', () => {
    const db = openSqliteFile(miniPath)
    try {
      const listed = listProjects(db, { appDataDir: '/fixture', resolveLocal })
      assert.equal(listed.appDataDir, '/fixture')
      assert.deepEqual(listed.projects.map((p) => p.name), ['转录组分析', 'insertsbio'])
      assert.equal(listed.projects[0]!.sessions, 1)
      assert.equal(listed.projects[0]!.runs, 7)
      assert.equal(listed.projects[0]!.artifacts, 7)
      assert.equal(listed.projects[0]!.researchNodes, 14)
      assert.equal(listed.projects[0]!.workspaceDir, 'D:\\Wisp-Science\\rna-seq')
      assert.equal(listed.projects[0]!.workspaceDirLocal, fixtureWorkspace)
      assert.ok(listed.projects[0]!.updatedAtIso)
    } finally {
      db.close()
    }
  })

  it('snapshots 转录组分析 with 7 succeeded runs and qc-report.html', () => {
    const db = openSqliteFile(miniPath)
    try {
      const snap = snapshotProject(db, '转录组分析', { resolveLocal })
      assert.equal(snap.name, '转录组分析')
      assert.equal(snap.runs, 7)
      assert.deepEqual(snap.runStatus, [{ status: 'succeeded', n: 7 }])
      assert.ok(snap.recentArtifacts.some((art) => art.filename === 'qc-report.html'))
      assert.ok(snap.recentRuns.some((run) => run.title.includes('FASTQ QC')))
      assert.ok(snap.wispMd?.includes('figures/'))
      assert.ok(snap.wispMd?.includes('data/raw/'))
      assert.deepEqual(snap.memoryFiles, ['notes.md'])
      assert.equal(snap.lastUserExcerpt, '从 ENA 拉 SRR2584863，做 FASTQ QC。')
      assert.equal(snap.recentSessions[0]?.status, 'running')
      const dumped = JSON.stringify(snap)
      assert.equal(dumped.includes('This assistant body must not appear'), false)
      assert.ok(!('messages' in snap))
    } finally {
      db.close()
    }
  })

  it('resolves unique substrings and rejects 0 or >1 matches', () => {
    const db = openSqliteFile(miniPath)
    try {
      assert.equal(resolveProject(db, '804f67d2-3305-4b75-805f-81bf7fbb0b4d').name, '转录组分析')
      assert.equal(resolveProject(db, '804f67d2').name, '转录组分析')
      assert.equal(resolveProject(db, 'inserts').name, 'insertsbio')
      assert.throws(() => resolveProject(db, '不存在'), /no project matches/)
      assert.throws(() => resolveProject(db, ''), /required/)
    } finally {
      db.close()
    }
  })

  it('extracts text parts from JSON user content', () => {
    assert.equal(extractUserText('[{"type":"text","text":"hello"}]'), 'hello')
    assert.equal(extractUserText('"plain"'), 'plain')
    assert.equal(extractUserText('not-json'), 'not-json')
  })
})

describe('copy then open', { concurrency: false }, () => {
  before(() => {
    mkdirSync(tmpRoot, { recursive: true })
  })
  after(() => {
    rmSync(tmpRoot, { recursive: true, force: true })
  })

  it('errors with the probed path when wisp.sqlite is missing', () => {
    const empty = join(tmpRoot, 'empty-app')
    mkdirSync(empty, { recursive: true })
    assert.throws(
      () => copyWispDb(empty, join(tmpRoot, 'out-missing')),
      /wisp\.sqlite not found at .*empty-app\/wisp\.sqlite/,
    )
  })

  it('copies sqlite + wal + shm when they exist', () => {
    const app = join(tmpRoot, 'app-triplet')
    mkdirSync(app, { recursive: true })
    writeFileSync(join(app, 'wisp.sqlite'), readFileSync(miniPath))
    writeFileSync(join(app, 'wisp.sqlite-wal'), Buffer.from('wal'))
    writeFileSync(join(app, 'wisp.sqlite-shm'), Buffer.from('shm'))
    const destDir = join(tmpRoot, 'copy-dest')
    const { copied } = copyWispDb(app, destDir)
    assert.deepEqual(copied, ['wisp.sqlite', 'wisp.sqlite-wal', 'wisp.sqlite-shm'])
    assert.equal(readFileSync(join(destDir, 'wisp.sqlite-wal'), 'utf8'), 'wal')
    assert.equal(readFileSync(join(destDir, 'wisp.sqlite-shm'), 'utf8'), 'shm')
  })

  it('opens a copied library and deletes the temp dir on close', () => {
    const app = join(tmpRoot, 'app-open')
    mkdirSync(app, { recursive: true })
    writeFileSync(join(app, 'wisp.sqlite'), readFileSync(miniPath))
    const handle = openWispCopy(app)
    try {
      assert.ok(handle.tmpDir.includes('wisp-lab-'))
      const listed = listProjects(handle.db, { appDataDir: app, resolveLocal })
      assert.equal(listed.projects.length, 2)
    } finally {
      handle.close()
    }
    assert.equal(existsSync(handle.tmpDir), false)
  })
})

describe('live Windows library', () => {
  it('lists known project names when the host library is readable', (t) => {
    if (process.env.WISP_LAB_LIVE !== '1') {
      t.skip('set WISP_LAB_LIVE=1 to open the Windows library')
      return
    }
    const appDataDir = existsLive()
    if (!appDataDir) {
      t.skip('Windows wisp.sqlite not present')
      return
    }
    try {
      const handle = openWispCopy(appDataDir)
      try {
        const listed = listProjects(handle.db, { appDataDir })
        const names = listed.projects.map((p) => p.name)
        for (const name of ['转录组分析', '跨物种单细胞根', 'insertsbio']) {
          assert.ok(names.includes(name), `missing ${name} in ${names.join(', ')}`)
        }
        const snap = snapshotProject(handle.db, '转录组分析')
        assert.ok(snap.recentArtifacts.some((art) => art.filename === 'qc-report.html'))
        assert.ok((snap.runStatus.find((row) => row.status === 'succeeded')?.n ?? 0) >= 7)
      } finally {
        handle.close()
      }
    } catch (error) {
      if (isTransientStoreError(error)) {
        t.skip(`live library locked or unreadable: ${error instanceof Error ? error.message : error}`)
        return
      }
      throw error
    }
  })
})

function existsLive(): string | null {
  for (const dir of [resolveAppDataDir(), WSL_WINDOWS_APP_DATA]) {
    if (existsSync(wispSqlitePath(dir))) return dir
  }
  return null
}
