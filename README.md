# dsh-wisp-science-lab

DeepSeek Harness（dsh）插件：让 agent 当实验室 PI，只读查看本机 [Wisp Science](https://github.com/xuzhougeng/wisp-science) 课题进展并给意见。

**v0 只读。** 不写 `wisp.sqlite`，不在 dsh 里跑 Python / R / FASTQ，也不能派 Wisp 去干活。

## 别人怎么装

需要已经能跑 `dsh web`，并且本机有 Wisp Science（存在 `wisp.sqlite`）。

```sh
dsh plugin --profile web add github:xuzhougeng/dsh-wisp-science-lab
dsh web
```

这一条会同时做两件事：

1. 把包装进当前 profile 的 `node_modules`
2. 因为 `package.json` 声明了 `dsh.bundle`，把 `cordis.patch.yml` 注册进该 profile 的插件层（插入 `wisp-science-lab` 这一行）

不要再手动 `--patch` 同一份配置，否则会双加载。仓库已带编译后的 `lib/`，一般不必跑 `prepare`，也不用改 `allowBuilds`。装完重启 `dsh web`。终端出现 `[wisp-science-lab] plugin loaded` 即成功。

本仓库带 GitHub topic **`dsh-plugin`**，可被 `dsh-find-plugin` 和市场按 topic 检索到。

从本地 clone 安装：

```sh
git clone https://github.com/xuzhougeng/dsh-wisp-science-lab.git
dsh plugin --profile web add ./dsh-wisp-science-lab
```

卸载：

```sh
dsh plugin --profile web remove dsh-wisp-science-lab
```

还没发 npm。请用上面的 GitHub / 本地路径，不要 `npm i dsh-wisp-science-lab`。

## 怎么用

在 dsh 里直接问，例如：

- 列出我的 Wisp 课题
- 「转录组分析」现在做到哪了？下一步做什么？
- 比较项目 A 和项目 B 的进展

模型应调用 `wisp_list_projects` / `wisp_project_snapshot`，不要自己 `bash` 扫盘。意见必须引用快照里的 Run、产物或 `WISP.md`。若你要求「去做实验」，v0 只会给出建议派给 Wisp 的 prompt 原文。

## 数据目录

插件要读 Wisp 的全局库 `wisp.sqlite`。探测顺序：

1. 配置项 `appDataDir`（非空）
2. 环境变量 `WISP_APP_DATA_DIR`
3. Windows：`%APPDATA%\science.wisp-science\wisp-science`
4. Linux：`~/.local/share/science.wisp-science/wisp-science`

WSL 里跑 dsh、数据在 Windows 宿主机时，请显式指定（把用户名换成你的）：

```sh
export WISP_APP_DATA_DIR=/mnt/c/Users/<你的Windows用户名>/AppData/Roaming/science.wisp-science/wisp-science
```

或在 **profile** 的 `cordis.patch.yml`（一般是 `~/.dsh/profiles/web/cordis.patch.yml`）覆盖：

```yaml
- id: wisp-science-lab
  config:
    appDataDir: /mnt/c/Users/<你的Windows用户名>/AppData/Roaming/science.wisp-science/wisp-science
```

| 配置 | 默认 | 含义 |
|---|---|---|
| `appDataDir` | `''`（自动探测） | 含 `wisp.sqlite` 的目录 |
| `maxSessions` | 8 | 快照里最近会话条数 |
| `maxRuns` | 12 | 最近 Run 条数 |
| `maxArtifacts` | 12 | 最近产物条数 |
| `maxMemoryFiles` | 20 | `.wisp/memory` 文件名上限 |
| `wispMdMaxBytes` | 8192 | `.wisp/WISP.md` 截断 |

## 已知限制

- **只读。** 不改活库，也不改课题目录。
- **WAL 拷贝。** Wisp 占用库时，直接打开会 `disk I/O error`。每次工具调用把 `wisp.sqlite` 和存在的 `-wal` / `-shm` 拷到临时目录再读，用完删除。
- **路径。** 库里常是 Windows 路径。在 WSL 下结果同时给 `workspaceDir` 和 `workspaceDirLocal`（`D:\foo` → `/mnt/d/foo`，且该路径必须存在）。
- **有界快照。** 不返回完整聊天记录。

## 从源码开发

改插件本身、用 harness 源码启动时（开发 overlay，不要和市场安装叠在一起）：

```sh
cd /path/to/deepseek-harness
pnpm dsh web --patch /path/to/dsh-wisp-science-lab/cordis.dev.yml
```

`cordis.dev.yml` 里的路径改成你的 checkout 绝对路径。改 `src/` 后执行 `pnpm build`，再提交 `lib/index.js`。

```sh
pnpm test
pnpm print-snapshot            # 优先活库拷贝，否则 testdata/mini.sqlite
WISP_LAB_LIVE=1 pnpm test      # 可选；锁失败会 skip
```
