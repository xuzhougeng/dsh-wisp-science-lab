import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  linuxAppDataDir,
  resolveAppDataDir,
  toLocalWorkspaceDir,
  WSL_WINDOWS_APP_DATA,
} from '../src/paths.ts'

const existing = new Set([
  '/mnt/d/Wisp-Science/rna-seq',
  '/mnt/e/文章自查',
  '/mnt/c/Users/xuzhougeng/Documents/wisp-science',
])

const existsSync = (path: string) => existing.has(path) || path.endsWith('wisp.sqlite') && existing.has(path)

describe('toLocalWorkspaceDir', () => {
  it('maps D: to /mnt/d when the path exists', () => {
    assert.equal(
      toLocalWorkspaceDir('D:\\Wisp-Science\\rna-seq', { existsSync }),
      '/mnt/d/Wisp-Science/rna-seq',
    )
  })

  it('maps E: 文章自查', () => {
    assert.equal(
      toLocalWorkspaceDir('E:\\文章自查', { existsSync }),
      '/mnt/e/文章自查',
    )
  })

  it('maps C: Documents workspace', () => {
    assert.equal(
      toLocalWorkspaceDir('C:\\Users\\xuzhougeng\\Documents\\wisp-science', { existsSync }),
      '/mnt/c/Users/xuzhougeng/Documents/wisp-science',
    )
  })

  it('keeps Windows paths on win32', () => {
    assert.equal(
      toLocalWorkspaceDir('D:\\Wisp-Science\\rna-seq', { platform: 'win32', existsSync: () => false }),
      'D:\\Wisp-Science\\rna-seq',
    )
  })

  it('returns POSIX paths unchanged', () => {
    assert.equal(toLocalWorkspaceDir('/mnt/d/Wisp-Science/rna-seq'), '/mnt/d/Wisp-Science/rna-seq')
  })

  it('returns null when the /mnt translation is missing', () => {
    assert.equal(
      toLocalWorkspaceDir('D:\\missing', { existsSync: () => false }),
      null,
    )
  })
})

describe('resolveAppDataDir', () => {
  it('prefers config, then env', () => {
    assert.equal(resolveAppDataDir('/tmp/configured', { env: { WISP_APP_DATA_DIR: '/tmp/env' } }), '/tmp/configured')
    assert.equal(resolveAppDataDir('', { env: { WISP_APP_DATA_DIR: '/tmp/env' } }), '/tmp/env')
  })

  it('prefers the larger WSL Windows library over the Linux default', () => {
    const linux = linuxAppDataDir('/home/tester')
    const sizes: Record<string, number> = {
      [`${WSL_WINDOWS_APP_DATA}/wisp.sqlite`]: 125_000_000,
      [`${linux}/wisp.sqlite`]: 4096,
    }
    const present = new Set(Object.keys(sizes))
    assert.equal(resolveAppDataDir('', {
      platform: 'linux',
      env: {},
      homedir: () => '/home/tester',
      existsSync: (path) => present.has(path),
      fileSize: (path) => sizes[path] ?? 0,
    }), WSL_WINDOWS_APP_DATA)
  })

  it('falls back to Linux when the Windows library is absent', () => {
    const linux = linuxAppDataDir('/home/tester')
    assert.equal(resolveAppDataDir('', {
      platform: 'linux',
      env: {},
      homedir: () => '/home/tester',
      existsSync: () => false,
    }), linux)
  })

  it('uses %APPDATA% on win32', () => {
    assert.equal(resolveAppDataDir('', {
      platform: 'win32',
      env: { APPDATA: 'C:\\Users\\xuzhougeng\\AppData\\Roaming' },
      existsSync: () => false,
    }), 'C:\\Users\\xuzhougeng\\AppData\\Roaming\\science.wisp-science\\wisp-science')
  })
})
