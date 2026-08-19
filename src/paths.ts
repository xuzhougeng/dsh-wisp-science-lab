import { existsSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, win32 } from 'node:path'

/** Default Windows-on-WSL library (larger than the nearly-empty Linux copy). */
export const WSL_WINDOWS_APP_DATA =
  '/mnt/c/Users/xuzhougeng/AppData/Roaming/science.wisp-science/wisp-science'

export const LINUX_APP_DATA_SEGMENTS = ['science.wisp-science', 'wisp-science'] as const

export interface PathProbe {
  platform?: NodeJS.Platform
  env?: NodeJS.ProcessEnv
  homedir?: () => string
  existsSync?: (path: string) => boolean
  fileSize?: (path: string) => number
}

const WIN_ABS = /^([A-Za-z]):[\\/](.*)$/

export function toLocalWorkspaceDir(workspaceDir: string, probe: PathProbe = {}): string | null {
  const platform = probe.platform ?? process.platform
  const exists = probe.existsSync ?? existsSync
  const trimmed = workspaceDir.trim()
  if (!trimmed) return null
  if (platform === 'win32') return trimmed
  if (trimmed.startsWith('/')) return trimmed
  const match = WIN_ABS.exec(trimmed)
  if (!match) return null
  const drive = match[1]!.toLowerCase()
  const rest = match[2]!.replaceAll('\\', '/')
  const local = `/mnt/${drive}/${rest}`
  return exists(local) ? local : null
}

export function linuxAppDataDir(home = homedir()): string {
  return join(home, '.local', 'share', ...LINUX_APP_DATA_SEGMENTS)
}

export function windowsAppDataDir(env: NodeJS.ProcessEnv = process.env): string | null {
  const appdata = env.APPDATA
  if (!appdata) return null
  return win32.join(appdata, ...LINUX_APP_DATA_SEGMENTS)
}

function sqliteSize(dir: string, fileSize: (path: string) => number, exists: (path: string) => boolean): number {
  const file = join(dir, 'wisp.sqlite')
  if (!exists(file)) return 0
  try {
    return fileSize(file)
  } catch {
    return 0
  }
}

function defaultFileSize(path: string): number {
  return statSync(path).size
}

/**
 * Resolve the Wisp app-data directory that contains `wisp.sqlite`.
 * Prefer an explicit config / env value. On WSL, pick the Windows library
 * when it exists and is larger than the Linux default (which is often empty).
 */
export function resolveAppDataDir(configDir = '', probe: PathProbe = {}): string {
  const platform = probe.platform ?? process.platform
  const env = probe.env ?? process.env
  const exists = probe.existsSync ?? existsSync
  const fileSize = probe.fileSize ?? defaultFileSize
  const home = probe.homedir ?? homedir

  const configured = configDir.trim()
  if (configured) return configured

  const fromEnv = env.WISP_APP_DATA_DIR?.trim()
  if (fromEnv) return fromEnv

  const linux = linuxAppDataDir(home())
  const wslWindows = WSL_WINDOWS_APP_DATA
  if (exists(join(wslWindows, 'wisp.sqlite'))) {
    const winSize = sqliteSize(wslWindows, fileSize, exists)
    const linuxSize = exists(join(linux, 'wisp.sqlite')) ? sqliteSize(linux, fileSize, exists) : 0
    if (winSize > linuxSize) return wslWindows
  }

  if (platform === 'win32') {
    const win = windowsAppDataDir(env)
    if (win) return win
  }

  return linux
}

export function wispSqlitePath(appDataDir: string): string {
  return join(appDataDir, 'wisp.sqlite')
}
