# dsh-wisp-science-lab

给 DeepSeek Harness（dsh）用的树外插件：让 agent 当实验室 PI。

**v0 只读。** 列出宿主机 [Wisp Science](https://github.com/) 课题，抽出有界进展快照，据此给意见。不会改 `wisp.sqlite`，也不会在 dsh 里跑 Python / R / FASTQ。指挥 Wisp 干活是 v1，还没做。

## 挂进 dsh web

插件路径必须是绝对路径。从 harness 仓库启动：

```sh
cd /home/xzg/project/dsh-reader/deepseek-harness
pnpm dsh web --patch /home/xzg/project/wisp-plugins/dsh-wisp-science-lab/cordis.patch.yml
```

终端应出现 `[wisp-science-lab] plugin loaded`。若 web 前端尚未构建，harness 可能在这一行之后报 `frontend dist not built`；那是 harness 自己的环境，与本插件无关。需要完整 UI 时在 harness 仓库先 `pnpm run build`。

加载成功后可以问：

```
比较「转录组分析」和「insertsbio」的进展，各给下一步建议。
```

模型应调用 `wisp_list_projects` / `wisp_project_snapshot`，不要自己 `bash` 扫盘。

## 配置

`cordis.patch.yml` 里可给这一行加 `config:`（全部有默认值）：

| 字段 | 默认 | 含义 |
|---|---|---|
| `appDataDir` | `''`（自动探测） | 含 `wisp.sqlite` 的 Wisp 数据目录 |
| `maxSessions` | 8 | 快照里最近会话条数 |
| `maxRuns` | 12 | 最近 Run 条数 |
| `maxArtifacts` | 12 | 最近产物条数 |
| `maxMemoryFiles` | 20 | `.wisp/memory` 文件名上限 |
| `wispMdMaxBytes` | 8192 | `.wisp/WISP.md` 截断 |

探测 `appDataDir` 的顺序：

1. 配置 `appDataDir`（非空）
2. 环境变量 `WISP_APP_DATA_DIR`
3. 若存在且体积更大：`/mnt/c/Users/xuzhougeng/AppData/Roaming/science.wisp-science/wisp-science`（WSL 开发、数据在 Windows 宿主机）
4. Windows：`%APPDATA%\science.wisp-science\wisp-science`
5. Linux：`~/.local/share/science.wisp-science/wisp-science`

不要用第 5 步那份几乎空的 Linux 库当真源。也可以显式指定：

```yaml
- insert:
    - id: wisp-science-lab
      name: '/home/xzg/project/wisp-plugins/dsh-wisp-science-lab/src/index.ts'
      config:
        appDataDir: '/mnt/c/Users/xuzhougeng/AppData/Roaming/science.wisp-science/wisp-science'
```

## 已知限制

- **只读。** 不写活库，也不改课题目录。用户要「去做实验」时，v0 只会给出建议派给 Wisp 的 prompt 原文。
- **WAL 拷贝。** Wisp 打开时，WSL 直接 `sqlite3` 活库会 `disk I/O error`。每次工具调用都把 `wisp.sqlite` 以及存在的 `-wal` / `-shm` 拷到 `os.tmpdir()/wisp-lab-*` 再读，用完删除。不对原文件做 `wal_checkpoint`。
- **路径。** 库里是 Windows 路径。跑在 WSL 时，工具结果同时给 `workspaceDir` 和 `workspaceDirLocal`（`D:\foo` → `/mnt/d/foo`，且该路径必须存在）。
- **有界快照。** 不返回完整 `messages.content`。最近会话 / Run / 产物有上限，避免 358 个 Run 灌进上下文。

## 本地测试

需要 Node 22.19+（用内置 `node:sqlite`，不要 `better-sqlite3`）。

```sh
cd /home/xzg/project/wisp-plugins/dsh-wisp-science-lab
pnpm test
pnpm print-snapshot            # 优先活库拷贝，否则 testdata/mini.sqlite
pnpm print-snapshot --mini     # 强制夹具
```

可选：`WISP_LAB_LIVE=1 pnpm test` 打开 Windows 活库；锁失败会 skip，不会红。

夹具在 `testdata/`。不要把 125MB 活库提交进 git。

## 依赖和以后怎么发布

`@deepseek-ai/cordis`、`dsh-tools`、`dsh-system-prompt`、`schemastery` 是 **peer**（宿主 dsh 已经带着），版本写 semver，不要写 `file:`。`--patch` 加载本仓库的 `src/index.ts` 时，这些包由 harness 解析；本包不必、也不该把 harness checkout 打进 registry。

本地编辑器用 `tsconfig.json` 的 `paths` 指到旁边的 harness 源码，只影响类型检查，不进发布物。

以后要做成可安装 bundle 时：加上 `dsh.bundle.patch`，把 `cordis.patch.yml` 里的 `name` 从绝对路径改成包名 `dsh-wisp-science-lab`，然后 `dsh plugin add`。v0 继续用 `--patch` 即可。
