export interface Config {
  appDataDir: string
  maxSessions: number
  maxRuns: number
  maxArtifacts: number
  maxMemoryFiles: number
  wispMdMaxBytes: number
}

export const defaults: Config = {
  appDataDir: '',
  maxSessions: 8,
  maxRuns: 12,
  maxArtifacts: 12,
  maxMemoryFiles: 20,
  wispMdMaxBytes: 8192,
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

export function resolveConfig(raw: unknown): Config {
  const input = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
  return {
    appDataDir: typeof input.appDataDir === 'string' ? input.appDataDir : defaults.appDataDir,
    maxSessions: asNumber(input.maxSessions, defaults.maxSessions),
    maxRuns: asNumber(input.maxRuns, defaults.maxRuns),
    maxArtifacts: asNumber(input.maxArtifacts, defaults.maxArtifacts),
    maxMemoryFiles: asNumber(input.maxMemoryFiles, defaults.maxMemoryFiles),
    wispMdMaxBytes: asNumber(input.wispMdMaxBytes, defaults.wispMdMaxBytes),
  }
}

/** Standard Schema so Cordis can validate `config:` in the patch / profile. */
export const Config = {
  '~standard': {
    version: 1 as const,
    vendor: 'dsh-wisp-science-lab',
    validate(value: unknown) {
      return { value: resolveConfig(value) }
    },
  },
}
