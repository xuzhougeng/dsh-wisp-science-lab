# dsh-wisp-science-lab

[![dsh-plugin](https://img.shields.io/badge/dsh-plugin-1f6feb)](https://github.com/topics/dsh-plugin)
[![DeepSeek Harness](https://img.shields.io/badge/DeepSeek%20Harness-cordis%20bundle-111827)](https://github.com/deepseek-ai/deepseek-harness)
[![Node](https://img.shields.io/badge/node-%5E22.19%20%7C%7C%20%3E%3D24-339933)](https://nodejs.org)

[English](README.md) | 中文

**[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 插件：让 agent 当实验室 PI，只读查看本机 [Wisp Science](https://github.com/xuzhougeng/wisp-science) 课题进展。**

dsh 给意见，Wisp 做实验。**v0 只读** —— 列出课题、抽出有界进展快照、按证据给下一步。不写 `wisp.sqlite`，不在 dsh 里跑 Python / R / FASTQ，也还不能派 Wisp 去干活。

```
你  →  dsh（PI）  →  wisp_list_projects / wisp_project_snapshot
                         ↓  拷贝 sqlite + wal + shm，只读
                    Wisp Science 桌面（实验员）
```

## 为什么用

- **看见全部本地课题** —— 名字、会话 / Run / 产物计数、Windows 与 WSL 路径。
- **有界快照** —— 最近 Run、产物、研究图标题、`.wisp/WISP.md`、memory 文件名。有上限，避免 358 个 Run 灌进上下文。
- **PI 人设** —— 必须引用 Run 标题 / 产物文件名 / WISP.md，禁止编造快照里没有的分析。
- **活库安全** —— 拷 `wisp.sqlite`（及存在的 `-wal` / `-shm`）到临时目录再读，不对原文件做 checkpoint。

## 安装

本插件跑在 **dsh 里面**。先装 DeepSeek Harness。

### 1. 安装 dsh

需要 Node.js `^22.19.0` 或 `>=24`。

```sh
npx @deepseek-ai/dsh web
```

浏览器打开 `http://127.0.0.1:3080`，在设置里填模型 API key。

若希望本机有 `dsh` 命令：

```sh
npm install -g @deepseek-ai/dsh
dsh web
```

从源码跑见 [deepseek-harness README](https://github.com/deepseek-ai/deepseek-harness#run)。

### 2. 安装本插件

```sh
dsh plugin --profile web add github:xuzhougeng/dsh-wisp-science-lab
# 没有全局 dsh 时：
npx @deepseek-ai/dsh plugin --profile web add github:xuzhougeng/dsh-wisp-science-lab
```

这一条会同时：把包装进 profile，并把 `cordis.patch.yml` 注册进插件层（`dsh.bundle`）。不要再手动 `--patch` 同一份，会双加载。

然后重新启动：

```sh
dsh web
```

终端出现 `[wisp-science-lab] plugin loaded` 即成功。

从本地 clone：

```sh
git clone https://github.com/xuzhougeng/dsh-wisp-science-lab.git
dsh plugin --profile web add ./dsh-wisp-science-lab
```

还没发 npm，不要 `npm i dsh-wisp-science-lab`。

```sh
dsh plugin --profile web remove dsh-wisp-science-lab
```

## 使用

在 dsh 里直接问：

- 列出我的 Wisp 课题
- 「转录组分析」现在做到哪了？下一步做什么？
- 比较项目 A 和项目 B 的进展

模型应调用 `wisp_list_projects` / `wisp_project_snapshot`，不要自己 `bash` 扫盘。意见必须引用快照里的证据。若你要求「去做实验」，v0 只会给出可粘贴给 Wisp 的 prompt 原文。

| 工具 | 返回 |
|---|---|
| `wisp_list_projects` | 课题花名册（可选名字 / id 子串过滤） |
| `wisp_project_snapshot` | 有界快照：最近会话、Run、产物、研究节点、WISP.md、memory 文件 |

## 配置

插件读取 Wisp 全局库 `wisp.sqlite`。探测顺序：

1. 配置项 `appDataDir`（非空）
2. 环境变量 `WISP_APP_DATA_DIR`
3. Windows：`%APPDATA%\science.wisp-science\wisp-science`
4. Linux：`~/.local/share/science.wisp-science/wisp-science`

WSL 里跑 dsh、数据在 Windows 时，把用户名换成你的：

```sh
export WISP_APP_DATA_DIR=/mnt/c/Users/<Windows用户名>/AppData/Roaming/science.wisp-science/wisp-science
```

或在 `~/.dsh/profiles/web/cordis.patch.yml`：

```yaml
- id: wisp-science-lab
  config:
    appDataDir: /mnt/c/Users/<Windows用户名>/AppData/Roaming/science.wisp-science/wisp-science
```

| 字段 | 默认 | 含义 |
|---|---|---|
| `appDataDir` | `''`（自动探测） | 含 `wisp.sqlite` 的目录 |
| `maxSessions` | 8 | 快照里最近会话条数 |
| `maxRuns` | 12 | 最近 Run |
| `maxArtifacts` | 12 | 最近产物 |
| `maxMemoryFiles` | 20 | `.wisp/memory` 文件名 |
| `wispMdMaxBytes` | 8192 | `.wisp/WISP.md` 截断 |

## 限制

- **只读。** 不写活库，也不改课题目录。
- **WAL 拷贝。** Wisp 占用时从 WSL 直接打开常会 `disk I/O error`。每次工具调用拷 sqlite + wal + shm，用完删除。
- **路径。** 库里常是 Windows 路径。WSL 下同时给 `workspaceDirLocal`（`D:\foo` → `/mnt/d/foo`，且该路径必须存在）。
- **无完整聊天。** 快照不返回整段 `messages.content`。

## 开发

源码 overlay（不要和市场安装叠在一起）：

```sh
cd /path/to/deepseek-harness
pnpm dsh web --patch /path/to/dsh-wisp-science-lab/cordis.dev.yml
```

把 `cordis.dev.yml` 改成你的 checkout 绝对路径。改 `src/` 后执行 `pnpm build`，再提交 `lib/index.js`。

```sh
pnpm test
pnpm print-snapshot            # 优先活库拷贝，否则 testdata/mini.sqlite
WISP_LAB_LIVE=1 pnpm test      # 可选；锁失败会 skip
```

本仓库带 GitHub topic [`dsh-plugin`](https://github.com/topics/dsh-plugin)，可被 `dsh-find-plugin` 和市场检索到。
