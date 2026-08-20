// src/config.ts
var defaults = {
  appDataDir: "",
  maxSessions: 8,
  maxRuns: 12,
  maxArtifacts: 12,
  maxMemoryFiles: 20,
  wispMdMaxBytes: 8192
};
function asNumber(value, fallback) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
function resolveConfig(raw) {
  const input = raw && typeof raw === "object" ? raw : {};
  return {
    appDataDir: typeof input.appDataDir === "string" ? input.appDataDir : defaults.appDataDir,
    maxSessions: asNumber(input.maxSessions, defaults.maxSessions),
    maxRuns: asNumber(input.maxRuns, defaults.maxRuns),
    maxArtifacts: asNumber(input.maxArtifacts, defaults.maxArtifacts),
    maxMemoryFiles: asNumber(input.maxMemoryFiles, defaults.maxMemoryFiles),
    wispMdMaxBytes: asNumber(input.wispMdMaxBytes, defaults.wispMdMaxBytes)
  };
}
var Config = {
  "~standard": {
    version: 1,
    vendor: "dsh-wisp-science-lab",
    validate(value) {
      return { value: resolveConfig(value) };
    }
  }
};

// src/prompt.ts
var PI_PROMPT = `\u4F60\u662F\u5B9E\u9A8C\u5BA4 PI\uFF0C\u4E0D\u662F\u5B9E\u9A8C\u5458\u3002Wisp Science \u624D\u662F\u5B9E\u9A8C\u5458\uFF1B\u4F60\u53EA\u8BFB\u8FDB\u5C55\u3001\u7ED9\u610F\u89C1\uFF0C\u4E0D\u81EA\u5DF1\u505A\u79D1\u5B66\u8BA1\u7B97\u3002

\u5DE5\u4F5C\u65B9\u5F0F\uFF1A
- \u7528\u6237\u95EE\u8D77\u8BFE\u9898/\u9879\u76EE\u8FDB\u5C55\u65F6\uFF0C\u5148\u8C03\u7528 wisp_list_projects \u6216 wisp_project_snapshot\uFF0C\u4E0D\u8981\u81EA\u5DF1 bash \u626B\u76D8\u6216\u731C\u6D4B\u76EE\u5F55\u3002
- \u6BD4\u8F83\u4E24\u4E2A\u9879\u76EE\u65F6\uFF0C\u5404\u6253\u4E00\u4EFD snapshot\uFF0C\u518D\u5BF9\u6BD4\u963B\u585E\u70B9\u3002
- \u610F\u89C1\u5FC5\u987B\u5F15\u7528\u5FEB\u7167\u91CC\u5B9E\u9645\u51FA\u73B0\u7684 Run\u3001\u4EA7\u7269\u6587\u4EF6\u540D\u6216 .wisp/WISP.md \u5185\u5BB9\u3002\u7981\u6B62\u7F16\u9020\u6CA1\u6709\u51FA\u73B0\u7684\u5B9E\u9A8C\u3001\u56FE\u8868\u3001\u5DEE\u5F02\u5206\u6790\u7ED3\u679C\u6216\u4E3B\u7EBF\u7ED3\u8BBA\u3002
- \u4E0D\u8981\u7528 bash / write \u53BB\u6539\u8BFE\u9898\u76EE\u5F55\u3002\u5F53\u524D\u7248\u672C\uFF08v0\uFF09\u662F\u53EA\u8BFB\u7684\uFF0C\u8FD8\u4E0D\u80FD\u6D3E Wisp \u53BB\u5E72\u6D3B\u3002
- \u82E5\u7528\u6237\u8981\u6C42\u300C\u53BB\u505A\u5B9E\u9A8C / \u8DD1\u5206\u6790 / \u8BA9 Wisp \u7EE7\u7EED\u300D\uFF0C\u8BF4\u660E v0 \u53EA\u8BFB\uFF0C\u5E76\u5217\u51FA\u4F60\u5EFA\u8BAE\u6D3E\u7ED9 Wisp \u7684 prompt \u539F\u6587\uFF08\u5B8C\u6574\u3001\u53EF\u7C98\u8D34\uFF09\uFF0C\u4F46\u4E0D\u8981\u5047\u88C5\u5DF2\u7ECF\u6D3E\u51FA\u3002

\u5FEB\u7167\u89E3\u8BFB\u8981\u70B9\uFF1A
- Run \u72B6\u6001\u4E0E\u6807\u9898\u662F\u5DF2\u53D1\u751F\u7684\u5B9E\u9A8C\u6B65\u9AA4\uFF1B\u4EA7\u7269\u6587\u4EF6\u540D\u662F\u5DF2\u843D\u5730\u7684\u7ED3\u679C\u3002
- \u4F1A\u8BDD\u6807\u9898\u4E3A\u7A7A\u3001\u72B6\u6001 running \u53EA\u8BF4\u660E\u5BF9\u8BDD\u8FD8\u5F00\u7740\uFF0C\u4E0D\u4EE3\u8868\u5206\u6790\u505A\u5B8C\u4E86\u3002
- \u6CA1\u6709\u5DEE\u5F02\u5206\u6790 / \u7EC4\u88C5 / \u4F5C\u56FE\u4EA7\u7269\uFF0C\u5C31\u4E0D\u8981\u5199\u300C\u5DF2\u7ECF\u5B8C\u6210\u4E86\u67D0\u67D0\u5206\u6790\u300D\u3002`;

// src/paths.ts
import { existsSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join, win32 } from "node:path";
var WSL_WINDOWS_APP_DATA = "/mnt/c/Users/xuzhougeng/AppData/Roaming/science.wisp-science/wisp-science";
var LINUX_APP_DATA_SEGMENTS = ["science.wisp-science", "wisp-science"];
var WIN_ABS = /^([A-Za-z]):[\\/](.*)$/;
function toLocalWorkspaceDir(workspaceDir, probe = {}) {
  const platform = probe.platform ?? process.platform;
  const exists = probe.existsSync ?? existsSync;
  const trimmed = workspaceDir.trim();
  if (!trimmed) return null;
  if (platform === "win32") return trimmed;
  if (trimmed.startsWith("/")) return trimmed;
  const match = WIN_ABS.exec(trimmed);
  if (!match) return null;
  const drive = match[1].toLowerCase();
  const rest = match[2].replaceAll("\\", "/");
  const local = `/mnt/${drive}/${rest}`;
  return exists(local) ? local : null;
}
function linuxAppDataDir(home = homedir()) {
  return join(home, ".local", "share", ...LINUX_APP_DATA_SEGMENTS);
}
function windowsAppDataDir(env = process.env) {
  const appdata = env.APPDATA;
  if (!appdata) return null;
  return win32.join(appdata, ...LINUX_APP_DATA_SEGMENTS);
}
function sqliteSize(dir, fileSize, exists) {
  const file = join(dir, "wisp.sqlite");
  if (!exists(file)) return 0;
  try {
    return fileSize(file);
  } catch {
    return 0;
  }
}
function defaultFileSize(path) {
  return statSync(path).size;
}
function resolveAppDataDir(configDir = "", probe = {}) {
  const platform = probe.platform ?? process.platform;
  const env = probe.env ?? process.env;
  const exists = probe.existsSync ?? existsSync;
  const fileSize = probe.fileSize ?? defaultFileSize;
  const home = probe.homedir ?? homedir;
  const configured = configDir.trim();
  if (configured) return configured;
  const fromEnv = env.WISP_APP_DATA_DIR?.trim();
  if (fromEnv) return fromEnv;
  const linux = linuxAppDataDir(home());
  const wslWindows = WSL_WINDOWS_APP_DATA;
  if (exists(join(wslWindows, "wisp.sqlite"))) {
    const winSize = sqliteSize(wslWindows, fileSize, exists);
    const linuxSize = exists(join(linux, "wisp.sqlite")) ? sqliteSize(linux, fileSize, exists) : 0;
    if (winSize > linuxSize) return wslWindows;
  }
  if (platform === "win32") {
    const win = windowsAppDataDir(env);
    if (win) return win;
  }
  return linux;
}
function wispSqlitePath(appDataDir) {
  return join(appDataDir, "wisp.sqlite");
}

// src/store.ts
import { copyFileSync, existsSync as existsSync2, mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join as join2 } from "node:path";
import { randomBytes } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
var DEFAULT_LIMITS = {
  maxSessions: 8,
  maxRuns: 12,
  maxArtifacts: 12,
  maxMemoryFiles: 20,
  wispMdMaxBytes: 8192
};
var LAST_USER_EXCERPT_CHARS = 500;
var MAX_TITLES_PER_KIND = 8;
var SESSION_IS_LISTABLE_SQL = `(
EXISTS (SELECT 1 FROM messages mm WHERE mm.frame_id = f.id AND mm.role = 'user')
OR TRIM(COALESCE(f.title, '')) <> '')`;
function tableColumns(db, table) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(table)) {
    throw new Error(`invalid table name: ${table}`);
  }
  const rows = db.prepare(`PRAGMA table_info(${table})`).all();
  return new Set(rows.map((row) => row.name));
}
function inspectColumns(db) {
  return {
    projects: tableColumns(db, "projects"),
    frames: tableColumns(db, "frames"),
    artifacts: tableColumns(db, "artifacts"),
    runs: tableColumns(db, "runs"),
    research_nodes: tableColumns(db, "research_nodes")
  };
}
function projectPredicate(cols, alias = "p") {
  const parts = [`${alias}.id NOT LIKE 'scratch:%'`];
  if (cols.projects.has("ephemeral")) {
    parts.push(`COALESCE(${alias}.ephemeral, 0) = 0`);
  }
  return parts.join(" AND ");
}
function mainline(cols, alias) {
  return cols.has("exploration_id") ? ` AND ${alias}.exploration_id IS NULL` : "";
}
function sessionListable(cols) {
  if (!cols.frames.has("title")) {
    return "1";
  }
  return SESSION_IS_LISTABLE_SQL;
}
function unixIso(seconds) {
  if (seconds == null || !Number.isFinite(seconds)) return null;
  return new Date(seconds * 1e3).toISOString();
}
function copyWispDb(appDataDir, destDir) {
  const source = wispSqlitePath(appDataDir);
  if (!existsSync2(source)) {
    throw new Error(`wisp.sqlite not found at ${source} (appDataDir=${appDataDir})`);
  }
  mkdirSync(destDir, { recursive: true });
  const dest = join2(destDir, "wisp.sqlite");
  const copied = [];
  copyFileSync(source, dest);
  copied.push("wisp.sqlite");
  for (const suffix of ["-wal", "-shm"]) {
    const side = source + suffix;
    if (existsSync2(side)) {
      copyFileSync(side, dest + suffix);
      copied.push(`wisp.sqlite${suffix}`);
    }
  }
  return { dest, copied };
}
function openWispCopy(appDataDir) {
  const tmpDir = join2(tmpdir(), `wisp-lab-${process.pid}-${randomBytes(4).toString("hex")}`);
  const { dest, copied } = copyWispDb(appDataDir, tmpDir);
  const db = new DatabaseSync(dest, { readOnly: true });
  return {
    db,
    tmpDir,
    source: wispSqlitePath(appDataDir),
    copied,
    close() {
      try {
        db.close();
      } finally {
        rmSync(tmpDir, { recursive: true, force: true });
      }
    }
  };
}
function withWispCopy(appDataDir, fn) {
  const handle = openWispCopy(appDataDir);
  try {
    return fn(handle.db);
  } finally {
    handle.close();
  }
}
function toSummary(row, resolveLocal = toLocalWorkspaceDir) {
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
    researchNodes: row.research_nodes
  };
}
function listProjectRows(db, query = "") {
  const cols = inspectColumns(db);
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
               ${mainline(cols.frames, "f")}
               AND ${sessionListable(cols)}) AS sessions,
           (SELECT COUNT(*) FROM artifacts a
             WHERE a.project_id = p.id
               ${mainline(cols.artifacts, "a")}) AS artifacts,
           (SELECT COUNT(*) FROM runs r
             WHERE r.project_id = p.id
               ${mainline(cols.runs, "r")}) AS runs,
           (SELECT COUNT(*) FROM research_nodes n
             WHERE n.project_id = p.id
               ${mainline(cols.research_nodes, "n")}) AS research_nodes
    FROM projects p
    WHERE ${projectPredicate(cols, "p")}
    ORDER BY p.updated_at DESC
  `;
  const rows = db.prepare(sql).all();
  const needle = query.trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter(
    (row) => row.name.toLowerCase().includes(needle) || row.id.toLowerCase().includes(needle) || row.description.toLowerCase().includes(needle)
  );
}
function listProjects(db, options) {
  const resolveLocal = options.resolveLocal ?? toLocalWorkspaceDir;
  return {
    appDataDir: options.appDataDir,
    projects: listProjectRows(db, options.query ?? "").map((row) => toSummary(row, resolveLocal))
  };
}
function resolveProject(db, project) {
  const q = project.trim();
  if (!q) throw new Error("project is required");
  const all = listProjectRows(db);
  const names = all.map((row) => row.name);
  const format = (rows) => rows.map((row) => `${row.name} (${row.id})`).join(", ");
  const exactId = all.filter((row) => row.id === q);
  if (exactId.length === 1) return exactId[0];
  const exactName = all.filter((row) => row.name === q);
  if (exactName.length === 1) return exactName[0];
  const lower = q.toLowerCase();
  const partial = all.filter(
    (row) => row.name.toLowerCase().includes(lower) || row.id.toLowerCase().startsWith(lower)
  );
  if (partial.length === 1) return partial[0];
  if (partial.length > 1) {
    throw new Error(`project ${JSON.stringify(q)} matches more than one: ${format(partial)}`);
  }
  throw new Error(`no project matches ${JSON.stringify(q)}. candidates: ${names.join(", ") || "(none)"}`);
}
function extractUserText(raw) {
  if (raw == null) return "";
  const trimmed = raw.trim();
  if (!trimmed) return "";
  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed === "string") return parsed;
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (part) => Boolean(part) && typeof part === "object" && part.type === "text" && typeof part.text === "string"
      ).map((part) => part.text).join("\n");
    }
  } catch {
    return trimmed;
  }
  return trimmed;
}
function truncateChars(text, maxChars) {
  return text.length <= maxChars ? text : text.slice(0, maxChars);
}
function readWispMd(localDir, maxBytes) {
  if (!localDir) return { text: null, truncated: false };
  const path = join2(localDir, ".wisp", "WISP.md");
  if (!existsSync2(path)) return { text: null, truncated: false };
  const buf = readFileSync(path);
  if (buf.byteLength <= maxBytes) {
    return { text: buf.toString("utf8"), truncated: false };
  }
  return { text: buf.subarray(0, maxBytes).toString("utf8"), truncated: true };
}
function listMemoryFiles(localDir, maxFiles) {
  if (!localDir) return [];
  const dir = join2(localDir, ".wisp", "memory");
  if (!existsSync2(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).filter((entry) => entry.isFile()).map((entry) => entry.name).sort().slice(0, maxFiles);
}
function lastUserExcerpt(db, projectId) {
  const row = db.prepare(`
    SELECT m.content AS content
    FROM messages m
    JOIN frames f ON f.id = m.frame_id
    WHERE f.project_id = ? AND m.role = 'user'
    ORDER BY m.ts DESC, m.seq DESC
    LIMIT 1
  `).get(projectId);
  if (!row) return null;
  const text = extractUserText(row.content).trim();
  if (!text) return null;
  return truncateChars(text, LAST_USER_EXCERPT_CHARS);
}
function explorationCount(db, cols, projectId) {
  if (!cols.frames.has("exploration_id")) return 0;
  const row = db.prepare(`
    SELECT COUNT(DISTINCT exploration_id) AS n
    FROM frames
    WHERE project_id = ? AND exploration_id IS NOT NULL
  `).get(projectId);
  return row.n;
}
function snapshotProject(db, project, options = {}) {
  const limits = { ...DEFAULT_LIMITS, ...options.limits };
  const resolveLocal = options.resolveLocal ?? toLocalWorkspaceDir;
  const cols = inspectColumns(db);
  const row = resolveProject(db, project);
  const local = resolveLocal(row.workspace_dir);
  const { text: wispMd, truncated: wispMdTruncated } = readWispMd(local, limits.wispMdMaxBytes);
  const recentSessions = db.prepare(`
    SELECT f.id AS id, f.title AS title, f.status AS status, f.updated_at AS updated_at
    FROM frames f
    WHERE f.project_id = ?
      AND f.parent_frame_id = f.id
      ${mainline(cols.frames, "f")}
      AND ${sessionListable(cols)}
    ORDER BY f.updated_at DESC
    LIMIT ?
  `).all(row.id, limits.maxSessions);
  const recentRuns = db.prepare(`
    SELECT id, title, kind, status, exit_code, ended_at
    FROM runs r
    WHERE r.project_id = ?
      ${mainline(cols.runs, "r")}
    ORDER BY COALESCE(r.ended_at, r.created_at) DESC, r.id DESC
    LIMIT ?
  `).all(row.id, limits.maxRuns);
  const runStatus = db.prepare(`
    SELECT status, COUNT(*) AS n
    FROM runs r
    WHERE r.project_id = ?
      ${mainline(cols.runs, "r")}
    GROUP BY status
    ORDER BY status
  `).all(row.id).map((item) => ({ status: item.status, n: Number(item.n) }));
  const recentArtifacts = db.prepare(`
    SELECT filename, content_type, created_at
    FROM artifacts a
    WHERE a.project_id = ?
      ${mainline(cols.artifacts, "a")}
    ORDER BY a.created_at DESC, a.id DESC
    LIMIT ?
  `).all(row.id, limits.maxArtifacts);
  const researchRows = db.prepare(`
    SELECT kind, title
    FROM research_nodes n
    WHERE n.project_id = ?
      ${mainline(cols.research_nodes, "n")}
    ORDER BY n.updated_at DESC, n.id DESC
  `).all(row.id);
  const groups = /* @__PURE__ */ new Map();
  for (const node of researchRows) {
    let group = groups.get(node.kind);
    if (!group) {
      group = { kind: node.kind, count: 0, titles: [] };
      groups.set(node.kind, group);
    }
    group.count += 1;
    if (group.titles.length < MAX_TITLES_PER_KIND) group.titles.push(node.title);
  }
  return {
    ...toSummary(row, resolveLocal),
    explorationCount: explorationCount(db, cols, row.id),
    runStatus,
    recentSessions: recentSessions.map((session) => ({
      id: session.id,
      title: session.title,
      status: session.status,
      updatedAt: session.updated_at,
      updatedAtIso: unixIso(session.updated_at)
    })),
    recentRuns: recentRuns.map((run) => ({
      id: run.id,
      title: run.title,
      kind: run.kind,
      status: run.status,
      exitCode: run.exit_code,
      endedAt: run.ended_at,
      endedAtIso: unixIso(run.ended_at)
    })),
    recentArtifacts: recentArtifacts.map((art) => ({
      filename: art.filename,
      contentType: art.content_type,
      createdAt: art.created_at,
      createdAtIso: unixIso(art.created_at)
    })),
    researchNodeGroups: [...groups.values()],
    wispMd,
    wispMdTruncated,
    memoryFiles: listMemoryFiles(local, limits.maxMemoryFiles),
    lastUserExcerpt: lastUserExcerpt(db, row.id)
  };
}
function renderSnapshotSummary(snap) {
  const succeeded = snap.runStatus.find((row) => row.status === "succeeded")?.n ?? 0;
  const failed = snap.runStatus.find((row) => row.status === "failed")?.n ?? 0;
  const runBits = snap.runStatus.map((row) => `${row.status}=${row.n}`).join(", ") || "none";
  const recent = snap.recentRuns.slice(0, 3).map((run) => run.title).join("\uFF1B") || "\uFF08\u65E0\uFF09";
  const files = snap.recentArtifacts.map((art) => art.filename).join(", ") || "\uFF08\u65E0\uFF09";
  return [
    `${snap.name}  \u4E0A\u6B21\u66F4\u65B0 ${snap.updatedAtIso ?? snap.updatedAt}`,
    `Run ${runBits}\uFF08\u6210\u529F ${succeeded} / \u5931\u8D25 ${failed}\uFF09`,
    `\u6700\u8FD1 Run\uFF1A${recent}`,
    `\u4EA7\u7269\uFF1A${files}`
  ].join("\n");
}

// src/tools.ts
function limitsOf(config) {
  return {
    maxSessions: config.maxSessions,
    maxRuns: config.maxRuns,
    maxArtifacts: config.maxArtifacts,
    maxMemoryFiles: config.maxMemoryFiles,
    wispMdMaxBytes: config.wispMdMaxBytes
  };
}
function registerTools(ctx, config) {
  ctx.tools.register({
    name: "wisp_list_projects",
    description: "\u5217\u51FA\u5BBF\u4E3B\u673A Wisp Science \u7684\u8BFE\u9898\uFF08\u53EA\u8BFB\uFF09\u3002\u9700\u8981\u8C08\u67D0\u4E2A\u9879\u76EE\u7684\u8FDB\u5C55\u65F6\u5148\u7528\u8FD9\u4E2A\uFF0C\u518D\u7528 wisp_project_snapshot\u3002",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "\u53EF\u9009\u3002\u6309\u9879\u76EE\u540D\u3001id \u6216\u63CF\u8FF0\u7684\u5B50\u4E32\u8FC7\u6EE4\u3002"
        }
      }
    },
    output: {
      schema: { type: "object", additionalProperties: true },
      render(_args, value) {
        const listed = value;
        const lines = listed.projects.map(
          (project) => `- ${project.name}  sessions=${project.sessions} artifacts=${project.artifacts} runs=${project.runs}  ${project.updatedAtIso ?? ""}`
        );
        return [{ type: "text", text: `appDataDir: ${listed.appDataDir}
${lines.join("\n") || "\uFF08\u65E0\u9879\u76EE\uFF09"}` }];
      }
    },
    presentCall() {
      return { card: "generic", title: "\u5217\u51FA Wisp \u8BFE\u9898", kind: "search" };
    },
    async execute(args) {
      const appDataDir = resolveAppDataDir(config.appDataDir);
      return withWispCopy(appDataDir, (db) => listProjects(db, {
        appDataDir,
        query: typeof args.query === "string" ? args.query : ""
      }));
    }
  });
  ctx.tools.register({
    name: "wisp_project_snapshot",
    description: "\u8BFB\u53D6\u4E00\u4E2A Wisp \u8BFE\u9898\u7684\u6709\u754C\u8FDB\u5C55\u5FEB\u7167\uFF08\u53EA\u8BFB\uFF09\uFF1A\u6700\u8FD1\u4F1A\u8BDD/Run/\u4EA7\u7269\u3001\u7814\u7A76\u56FE\u6807\u9898\u3001WISP.md\u3001memory \u6587\u4EF6\u540D\u3002\u7528\u9879\u76EE id\u3001\u7CBE\u786E\u540D\u79F0\u6216\u552F\u4E00\u5B50\u4E32\u6307\u5B9A\u3002",
    parameters: {
      type: "object",
      properties: {
        project: {
          type: "string",
          description: "\u9879\u76EE id\u3001\u7CBE\u786E\u540D\u79F0\uFF0C\u6216\u80FD\u552F\u4E00\u547D\u4E2D\u7684\u540D\u79F0/id \u5B50\u4E32\u3002"
        }
      },
      required: ["project"]
    },
    output: {
      schema: { type: "object", additionalProperties: true },
      render(_args, value) {
        return [{ type: "text", text: renderSnapshotSummary(value) }];
      }
    },
    presentCall(args) {
      return { card: "generic", title: `\u5FEB\u7167 ${String(args.project ?? "")}`, kind: "read" };
    },
    async execute(args) {
      if (typeof args.project !== "string" || args.project.trim() === "") {
        throw new Error("project is required");
      }
      const appDataDir = resolveAppDataDir(config.appDataDir);
      return withWispCopy(appDataDir, (db) => snapshotProject(db, args.project, {
        limits: limitsOf(config)
      }));
    }
  });
}

// src/index.ts
var name = "wisp-science-lab";
var inject = ["tools", "systemPrompt"];
function apply(ctx, raw) {
  const config = resolveConfig(raw);
  console.log("[wisp-science-lab] plugin loaded");
  ctx.systemPrompt.section({
    name: "wisp-lab:persona",
    order: 80,
    text: PI_PROMPT
  });
  registerTools(ctx, config);
}
export {
  Config,
  apply,
  inject,
  name
};
