import Schema from '@deepseek-ai/schemastery'

export interface Config {
  appDataDir: string
  maxSessions: number
  maxRuns: number
  maxArtifacts: number
  maxMemoryFiles: number
  wispMdMaxBytes: number
}

export const Config: Schema<Config> = Schema.object({
  appDataDir: Schema.string().default('').description('Wisp app data directory that contains wisp.sqlite. Empty = auto-detect.'),
  maxSessions: Schema.number().default(8).description('Max recent sessions in a snapshot.'),
  maxRuns: Schema.number().default(12).description('Max recent runs in a snapshot.'),
  maxArtifacts: Schema.number().default(12).description('Max recent artifacts in a snapshot.'),
  maxMemoryFiles: Schema.number().default(20).description('Max .wisp/memory filenames in a snapshot.'),
  wispMdMaxBytes: Schema.number().default(8192).description('Truncate .wisp/WISP.md to this many bytes.'),
})
