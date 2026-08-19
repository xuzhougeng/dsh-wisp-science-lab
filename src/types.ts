export interface ProjectRow {
  id: string
  name: string
  description: string
  workspace_dir: string
  created_at: number
  updated_at: number
  sessions: number
  artifacts: number
  runs: number
  research_nodes: number
}

export interface ProjectSummary {
  id: string
  name: string
  description: string
  workspaceDir: string
  workspaceDirLocal: string | null
  updatedAt: number
  updatedAtIso: string | null
  createdAt: number
  createdAtIso: string | null
  sessions: number
  artifacts: number
  runs: number
  researchNodes: number
}

export interface RecentSession {
  id: string
  title: string | null
  status: string
  updatedAt: number
  updatedAtIso: string | null
}

export interface RecentRun {
  id: string
  title: string
  kind: string
  status: string
  exitCode: number | null
  endedAt: number | null
  endedAtIso: string | null
}

export interface RunStatusCount {
  status: string
  n: number
}

export interface RecentArtifact {
  filename: string
  contentType: string
  createdAt: number
  createdAtIso: string | null
}

export interface ResearchKindGroup {
  kind: string
  count: number
  titles: string[]
}

export interface SnapshotLimits {
  maxSessions: number
  maxRuns: number
  maxArtifacts: number
  maxMemoryFiles: number
  wispMdMaxBytes: number
}

export interface ProjectSnapshot {
  id: string
  name: string
  description: string
  workspaceDir: string
  workspaceDirLocal: string | null
  updatedAt: number
  updatedAtIso: string | null
  createdAt: number
  createdAtIso: string | null
  sessions: number
  artifacts: number
  runs: number
  researchNodes: number
  explorationCount: number
  runStatus: RunStatusCount[]
  recentSessions: RecentSession[]
  recentRuns: RecentRun[]
  recentArtifacts: RecentArtifact[]
  researchNodeGroups: ResearchKindGroup[]
  wispMd: string | null
  wispMdTruncated: boolean
  memoryFiles: string[]
  lastUserExcerpt: string | null
}

export interface ListProjectsResult {
  appDataDir: string
  projects: ProjectSummary[]
}
