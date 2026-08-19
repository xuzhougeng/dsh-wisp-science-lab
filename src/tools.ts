import type { Config } from './config.ts'
import type { LabContext } from './ctx.ts'
import { resolveAppDataDir } from './paths.ts'
import { listProjects, renderSnapshotSummary, snapshotProject, withWispCopy } from './store.ts'

function limitsOf(config: Config) {
  return {
    maxSessions: config.maxSessions,
    maxRuns: config.maxRuns,
    maxArtifacts: config.maxArtifacts,
    maxMemoryFiles: config.maxMemoryFiles,
    wispMdMaxBytes: config.wispMdMaxBytes,
  }
}

export function registerTools(ctx: LabContext, config: Config): void {
  ctx.tools.register({
    name: 'wisp_list_projects',
    description: '列出宿主机 Wisp Science 的课题（只读）。需要谈某个项目的进展时先用这个，再用 wisp_project_snapshot。',
    parameters: {
      query: {
        type: 'string',
        description: '可选。按项目名、id 或描述的子串过滤。',
      },
    },
    output: {
      schema: { type: 'object', additionalProperties: true },
      render(_args, value) {
        const listed = value as ReturnType<typeof listProjects>
        const lines = listed.projects.map((project) =>
          `- ${project.name}  sessions=${project.sessions} artifacts=${project.artifacts} runs=${project.runs}  ${project.updatedAtIso ?? ''}`,
        )
        return [{ type: 'text', text: `appDataDir: ${listed.appDataDir}\n${lines.join('\n') || '（无项目）'}` }]
      },
    },
    presentCall() {
      return { card: 'generic', title: '列出 Wisp 课题', kind: 'search' }
    },
    async execute(args) {
      const appDataDir = resolveAppDataDir(config.appDataDir)
      return withWispCopy(appDataDir, (db) => listProjects(db, {
        appDataDir,
        query: typeof args.query === 'string' ? args.query : '',
      }))
    },
  })

  ctx.tools.register({
    name: 'wisp_project_snapshot',
    description: '读取一个 Wisp 课题的有界进展快照（只读）：最近会话/Run/产物、研究图标题、WISP.md、memory 文件名。用项目 id、精确名称或唯一子串指定。',
    parameters: {
      project: {
        type: 'string',
        required: true,
        description: '项目 id、精确名称，或能唯一命中的名称/id 子串。',
      },
    },
    output: {
      schema: { type: 'object', additionalProperties: true },
      render(_args, value) {
        return [{ type: 'text', text: renderSnapshotSummary(value as ReturnType<typeof snapshotProject>) }]
      },
    },
    presentCall(args) {
      return { card: 'generic', title: `快照 ${String(args.project ?? '')}`, kind: 'read' }
    },
    async execute(args) {
      if (typeof args.project !== 'string' || args.project.trim() === '') {
        throw new Error('project is required')
      }
      const appDataDir = resolveAppDataDir(config.appDataDir)
      return withWispCopy(appDataDir, (db) => snapshotProject(db, args.project as string, {
        limits: limitsOf(config),
      }))
    },
  })
}
