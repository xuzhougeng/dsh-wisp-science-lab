# PLAN：dsh-wisp-science-lab（实验室 PI）

给下一个 Grok / 实现 agent 的执行说明书。读完本文就可以开工，不必回看原对话。

## 0. 你要做什么

做一个 **树外 dsh 插件包**，让 dsh 里的 agent 当实验室 PI：

1. 列出宿主机 Wisp Science 的各个课题
2. 抽出有界进展快照，据此给意见
3. （v1，本次不做）指挥该课题目录里的 `wisp-science` agent 去干活

dsh 不跑科学计算。Wisp 才是实验员。

**本次实现范围：只做 v0。** v0 验收通过即可停。v1 留在文末，另开一轮。

对用户说「项目 1 / 项目 2 进展如何」时，模型应调用本插件的工具，而不是自己 `bash` 扫盘。

### 开工提示词（用户可贴给下一个 agent）

```
实现 /home/xzg/project/wisp-plugins/dsh-wisp-science-lab/PLAN.md 的 v0。
先读该目录 AGENTS.md 和 PLAN.md。不要改 deepseek-harness 或 wisp-science 本体。
完成后按 PLAN 的验收清单自测，并说明怎么用 --patch 挂进 dsh web。
```

## 1. 环境（已核实，2026-08-19）

| 角色 | 路径 |
|---|---|
| 本仓库 | `/home/xzg/project/wisp-plugins/dsh-wisp-science-lab` |
| 插件伞目录 | `/home/xzg/project/wisp-plugins` |
| dsh 源码（只读参考） | `/home/xzg/project/dsh-reader/deepseek-harness` |
| Wisp 源码（只读参考） | `/home/xzg/project/wisp-science` |
| 开发机 | WSL2，`Linux DESKTOP-BE2AE9A` |
| Wisp 桌面 | Windows 宿主机，用户 `xuzhougeng` |
| **真源 SQLite** | `/mnt/c/Users/xuzhougeng/AppData/Roaming/science.wisp-science/wisp-science/wisp.sqlite` |
| 对应 Windows 路径 | `%APPDATA%\science.wisp-science\wisp-science\wisp.sqlite` |
| 不要用的空库 | `/home/xzg/.local/share/science.wisp-science/wisp-science/wisp.sqlite` |
| Linux 侧 `wisp-science` 二进制 | `/home/xzg/project/wisp-science/target/release/wisp-science`（v1 才需要） |

dsh 插件写法以这些文档为准（只读）：

- `docs/user/develop/basic/index.md` — `apply` + `--patch`，路径必须绝对
- `docs/user/develop/basic/tool.md` — `defineTool`
- `docs/user/develop/basic/config.md` — Schemastery `Config`
- `docs/cookbook/adding-a-tool.md` — `execute` 返回规范 JSON，不是内容块
- `docs/user/develop/basic/publish.md` — bundle / profile（v0 用 `--patch` 即可）

## 2. 宿主机上真实存在的 13 个项目

`testdata/projects.json` 是 2026-08-19 从 Windows 库抽出的只读夹具。实现后 `wisp_list_projects` 对着活库应能认出同一批名字（条数可能变，名字应仍在）。

| name | id（前 8 位） | workspace_dir | sessions | artifacts | runs |
|---|---|---|---:|---:|---:|
| 转录组分析 | `804f67d2` | `D:\Wisp-Science\rna-seq` | 1 | 7 | 7 |
| insertsbio | `0767a32d` | `D:\Wisp-Science\insertsbio` | 11 | 3 | 25 |
| Workspace | `default` | `C:\Users\xuzhougeng\Documents\wisp-science` | 162 | 26 | 30 |
| wisp-science-innovation | `1c0a8026` | `D:\Wisp-Science\wisp-science-innovation` | 33 | 9 | 31 |
| 合作项目 | `2e6108c7` | `D:\Wisp-Science\合作项目` | 14 | 11 | 153 |
| GCOMM投稿 | `e7d0bcb7` | `D:\Wisp-Science\GCOMM` | 9 | 2 | 6 |
| 复杂序列组装 | `a4100d52` | `D:\Wisp-Science\complex-genome-assembly` | 4 | 1 | 0 |
| 跨物种单细胞根 | `8608603f` | `E:\cross-species-root` | 22 | 9 | 358 |
| wanglab | `93475286` | `E:\文章自查` | 2 | 0 | 9 |
| 新时代的R语言控制台 | `adccb79b` | `E:\r-project` | 10 | 5 | 25 |
| ggtree-ai-powered | `5069b614` | `D:\Wisp-Science\ggtree-ai-powered` | 6 | 3 | 0 |
| 浒苔 | `c7ee53ef` | `D:\浒苔` | 11 | 2 | 97 |
| 水蕨基因组 | `efcb23f9` | `E:\shui-jue` | 18 | 2 | 19 |

WSL 下这些盘都挂着：`/mnt/c` `/mnt/d` `/mnt/e`。例如 `/mnt/d/Wisp-Science/rna-seq` 存在，且有 `.wisp/WISP.md`。

「转录组分析」是快照样例（见 `testdata/snapshot-rna-seq.json`）：7 个 SSH Run 全成功，产物包括 `qc-report.html`、`srr2584863-per-cycle-quality.png`、下载/QC 脚本。会话标题为空、状态 `running`。PI 意见应能说出：数据已从 ENA 拉到 omics-server、FASTQ QC 做完、还没有差异分析/主线结论。

## 3. 产品边界

### 做

- 只读打开 Wisp 全局 `wisp.sqlite`
- 把 Windows 路径翻译成当前进程能用的路径（WSL `/mnt/x` 或原样 Windows）
- 两个模型工具 + 一段系统提示词
- 有界 JSON 快照：元数据、Run 计数、最近 Run 标题、最近会话、产物文件名、研究图节点标题、`.wisp/WISP.md` 全文（通常很短）、`.wisp/memory` 文件名列表

### 不做（v0 和以后都不要做）

- 改 Wisp / dsh 本体
- 写入 `wisp.sqlite`
- 把整段 `messages.content` 塞进工具结果
- 在 dsh 里重做 Python/R/MCP/文献检索
- 用 `dsh-subagent-acp` 冒充 Wisp（Wisp 的 ACP 是客户端，不是 server）
- 把 125MB 活库提交进 git

## 4. 建议的仓库形状（v0 建出来）

```
dsh-wisp-science-lab/
  AGENTS.md
  PLAN.md
  README.md                 # 用户怎么 --patch / 配 appDataDir
  package.json              # name: dsh-wisp-science-lab, type: module
  tsconfig.json
  cordis.patch.yml          # insert 本插件；name 用绝对路径指向 src/index.ts
  src/
    index.ts                # name / inject / Config / apply
    config.ts
    paths.ts                # 探测 appDataDir + Windows↔WSL
    store.ts                # 快照打开 sqlite + 查询
    prompt.ts               # PI 人设
    tools.ts                # 注册两个 defineTool
  testdata/
    projects.json           # 已有
    snapshot-rna-seq.json   # 已有
    mini.sqlite             # 实现时用 fixture 生成的小库，不要用活库
  tests/
    paths.test.ts
    store.test.ts
```

依赖：

- `@deepseek-ai/cordis` peer+dev，版本范围对齐 harness 根 `package.json`
- `@deepseek-ai/dsh-tools`、`@deepseek-ai/dsh-system-prompt`、`@deepseek-ai/schemastery`
- 开发时从 harness 的 pnpm store 解析：在本包 `package.json` 里写 `pnpm.overrides` 或用 `pnpm-workspace.yaml` 不划算。更简单：**本包独立 `pnpm install`，把 dsh 包指到 harness 的 `packages/...` 绝对路径**，或在 `package.json` 里：

  ```json
  "@deepseek-ai/dsh-tools": "file:../../dsh-reader/deepseek-harness/packages/core/tools"
  ```

  相对本仓库即 `/home/xzg/project/dsh-reader/deepseek-harness/packages/core/tools`。`cordis` / `schemastery` 用 harness `vendor/` 或已发布名，以能 `tsx` 加载为准。

- SQLite：优先 Node 22 的 `node:sqlite`（`DatabaseSync`）。不要加 `better-sqlite3` native 依赖，Windows/WSL 交叉编译麻烦。

测试跑 `node --test` 或 vitest，二选一，保持最小。

## 5. 打开数据库：必须拷贝快照

活库经常带 `-wal` / `-shm`，Wisp 桌面占用时，WSL 里直接打开会 `disk I/O error`。本机已复现。

`store.open(appDataDir)` 必须：

1. 确认 `appDataDir/wisp.sqlite` 存在，否则抛明确错误（点出探测到的路径）
2. 在 `os.tmpdir()` 下建 `wisp-lab-<pid>-<rand>/`
3. 拷贝 `wisp.sqlite`；若存在则同时拷 `wisp.sqlite-wal`、`wisp.sqlite-shm`
4. 打开拷贝（只读）
5. 通过 `ctx.effect()` 在插件卸载时删掉临时目录

禁止：

- 对原文件 `PRAGMA wal_checkpoint`（会写活库）
- 用 Linux 那份空库 silently fallback
- 把拷贝留在项目目录里

探测 `appDataDir` 的顺序（可用配置覆盖）：

1. `config.appDataDir` 若非空
2. 环境变量 `WISP_APP_DATA_DIR`
3. 若存在且体积更大：`/mnt/c/Users/xuzhougeng/AppData/Roaming/science.wisp-science/wisp-science`
4. Windows：`%APPDATA%\science.wisp-science\wisp-science`
5. Linux：`~/.local/share/science.wisp-science/wisp-science`

第 3 步是给 **在 WSL 里开发、数据在 Windows** 的默认。不要选错空库。

## 6. 路径翻译

库内 `workspace_dir` 是 Windows 路径。插件跑在 WSL 时，工具结果里要同时给出：

```ts
{
  workspaceDir: "D:\\Wisp-Science\\rna-seq",      // 库里的原值
  workspaceDirLocal: "/mnt/d/Wisp-Science/rna-seq" // 当前进程能 stat 的路径；无法翻译则为 null
}
```

规则：

- `X:\foo` → 若 `/mnt/<小写盘符>/foo` 存在，用它；把 `\` 换成 `/`
- 已经是 POSIX 路径则原样
- `workspaceDirLocal` 仅用于读 `.wisp/WISP.md` 和列 `.wisp/memory`。v0 不要用它去 spawn 进程

`paths.test.ts` 至少覆盖：

- `D:\Wisp-Science\rna-seq` → `/mnt/d/Wisp-Science/rna-seq`
- `E:\文章自查` → `/mnt/e/文章自查`
- `C:\Users\xuzhougeng\Documents\wisp-science` → `/mnt/c/Users/xuzhougeng/Documents/wisp-science`
- 在 `process.platform === 'win32'` 的假想下保持原样（可用函数注入 platform，不要真去 Windows 上测）

## 7. 查询约定

忽略 `id LIKE 'scratch:%'` 以及 `ephemeral = 1`。

会话数：根会话，与 Wisp `list_projects` 一致。实现时读 `crates/wisp-store/src/projects.rs` 里的 `SESSION_IS_LISTABLE_SQL`。若引用太重，退化为：

```sql
f.parent_frame_id = f.id AND f.exploration_id IS NULL
```

这和夹具里的 `sessions` 一致。

产物 / Run / 研究节点：默认 `exploration_id IS NULL`（主线）。快照里可另给 `explorationCount`。

**快照必须有上限**，避免「跨物种单细胞根」358 个 Run 灌进上下文：

| 字段 | 上限 |
|---|---|
| `recentSessions` | 8，按 `updated_at` 降序：id、title、status、updatedAt |
| `recentRuns` | 12：id、title、kind、status、exitCode、endedAt |
| `runStatus` | 全部分组计数（行数很少） |
| `recentArtifacts` | 12：filename、contentType、createdAt |
| `researchNodes` | 按 kind 计数 + 每种最多 8 个 title |
| `wispMd` | 全文，但截断到 8KiB |
| `memoryFiles` | 只文件名，最多 20 |
| `lastUserExcerpt` | 最近一条 `messages.role='user'` 的文本，截断 500 字。不要 assistant / tool 正文 |

时间戳是 Unix 秒。工具输出同时给 `updatedAt`（数字）和 `updatedAtIso`（ISO 字符串），方便模型阅读。

「转录组分析」的 `.wisp/WISP.md` 是目录约定（figures/results/analysis/data），应出现在快照里。

## 8. 插件 API

### Config

```ts
export interface Config {
  appDataDir: string        // default '' → 按 §5 探测
  maxSessions: number       // default 8
  maxRuns: number           // default 12
  maxArtifacts: number      // default 12
  maxMemoryFiles: number    // default 20
  wispMdMaxBytes: number    // default 8192
}
```

全部用 Schemastery，带 default。不要硬编码部署路径在 `execute` 里。

`inject = ['tools', 'systemPrompt']`

### 工具

`wisp_list_projects`

- 参数：无（或可选 `query: string` 做名字子串过滤）
- 规范值：`{ appDataDir, projects: ProjectSummary[] }`
- `ProjectSummary`：id、name、description、workspaceDir、workspaceDirLocal、updatedAt、updatedAtIso、sessions、artifacts、runs、researchNodes

`wisp_project_snapshot`

- 参数：`project`（string，required）—— id 或精确 name 或唯一子串。0 个匹配或 >1 个匹配都要失败，错误信息列出候选名字
- 规范值：一个 `ProjectSnapshot` 对象（§7）
- `output.render` 给人看的短摘要：名字、上次更新、Run 成功/失败、最近 3 个 Run 标题、产物文件名

两个工具的 `presentCall` 用 `generic` 即可。

### 系统提示词

`ctx.systemPrompt.section({ name: 'wisp-lab:persona', order: /* 选一个不冲突的偏后值，如 80 */, text })`

人设要点（写进 `prompt.ts`，中文）：

- 你是实验室 PI，不是实验员
- 先 `wisp_list_projects` / `wisp_project_snapshot`，再给意见
- 意见必须引用快照里的 Run / 产物 / WISP.md，禁止编造没出现的实验
- 不要自己 `bash`/`write` 去改课题目录；v0 也还不能派 Wisp，若用户要求「去做实验」就说明 v0 只读，列出你建议派给 Wisp 的 prompt 原文
- 比较两个项目时各打一份 snapshot，再对比阻塞点

## 9. 实现顺序（按这个做，做完就停）

### 步骤 A — 包骨架

1. `package.json` / `tsconfig.json`（`"type": "module"`，NodeNext）
2. 接上 dsh 依赖（file: 到 harness 包）
3. `src/index.ts` 先只 `console.log` 加载成功
4. `cordis.patch.yml`：`id: wisp-science-lab`，`name` 为 **绝对路径** `/home/xzg/project/wisp-plugins/dsh-wisp-science-lab/src/index.ts`

验证：

```sh
cd /home/xzg/project/dsh-reader/deepseek-harness
pnpm dsh web --patch /home/xzg/project/wisp-plugins/dsh-wisp-science-lab/cordis.patch.yml
```

终端出现加载日志。不需要 API key 也能看到这一步。

### 步骤 B — paths + store + 测试

1. 实现 `paths.ts` 与单测
2. 用 `testdata/projects.json` 的字段形状写 TypeScript 类型
3. 写一个脚本或测试 setup：从 `testdata` 生成 `testdata/mini.sqlite`（建 `projects` / `frames` / `runs` / `artifacts` / `research_nodes` / `messages` 最小表，插入转录组分析 + insertsbio 两行及快照夹具里的 Run/产物）。`mini.sqlite` 可提交，必须很小
4. `store.list` / `store.snapshot` 对着 `mini.sqlite` 断言
5. 实现活库「拷贝再打开」；单测用假目录复现「缺文件报错」「三件套都拷」
6. 可选：`WISP_LAB_LIVE=1` 时打开 Windows 活库，断言 13 个名字里至少包含 `转录组分析`、`跨物种单细胞根`、`insertsbio`。锁失败则 skip，不要红

验证：测试全绿。

### 步骤 C — 注册工具 + 提示词

1. `tools.ts` + `prompt.ts` + `apply`
2. `README.md`：配置、`--patch` 命令、已知限制（只读、WAL 拷贝、WSL 路径）

验证（有 `DEEPSEEK_API_KEY` 时）：

```
比较「转录组分析」和「insertsbio」的进展，各给下一步建议。
```

期望：模型调用两个 snapshot（或先 list 再 snapshot），引用 QC 产物 / Run 标题，不编造不存在的分析。

没有 key：写一个小的 `scripts/print-snapshot.ts`，对活库或 mini 库打印 JSON，人工看「转录组分析」是否含 `qc-report.html` 和 7 个 succeeded。

## 10. 验收清单（v0）

- [ ] 仓库在 `/home/xzg/project/wisp-plugins/dsh-wisp-science-lab`，不改 harness / wisp-science
- [ ] `pnpm test`（或等价命令）对 `mini.sqlite` 和 paths 全绿
- [ ] 活库通过拷贝打开；测试或脚本能列出约 13 个项目
- [ ] `wisp_project_snapshot` 对「转录组分析」返回 7 个 succeeded Run 和 `qc-report.html`
- [ ] 工具结果不含完整聊天记录
- [ ] 没有任何代码写活库
- [ ] README 写清 WSL 默认 `appDataDir` 和 `--patch` 命令
- [ ] git 初始化本仓库（只要 `wisp-plugins` 或只要子目录均可），不要提交 `wisp.sqlite` 拷贝

## 11. v1（不要在第一轮做）

指挥 Wisp agent：

```sh
# cwd = 该项目的 workspaceDirLocal
wisp-science rpc
# stdin: {"schema":"wisp.agent-rpc.v1","id":"t1","type":"prompt","prompt":"..."}
```

要点：

- Wisp CLI **没有** `--project`，cwd 就是项目根
- `run --output jsonl` 会自动拒绝审批，不能当「去干活」
- 桌面密钥在 Windows keyring；CLI 要 `WISP_API_KEY` / `WISP_PROVIDER` / `WISP_MODEL`
- 用 `ctx.jobs.start` 做后台；规范值 `{ kind: 'background', jobId, projectId }`
- 不要走 `dsh-subagent-acp`

## 12. 参考查询（活库，只读）

在拷贝上跑，不要对 `%APPDATA%` 原文件跑 checkpoint。

```sql
SELECT id, name, workspace_dir, updated_at FROM projects
WHERE id NOT LIKE 'scratch:%' AND ephemeral = 0
ORDER BY updated_at DESC;
```
