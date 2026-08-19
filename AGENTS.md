# AGENTS.md — dsh-wisp-science-lab

先读 [PLAN.md](./PLAN.md)，再改代码。第一次实现只做 **v0（只读：列出项目 + 进展快照 + PI 提示词）**。不要实现 `wisp_instruct`，除非用户明确要求进入 v1。

## 身份

这是树外 dsh bundle，不是 harness 或 Wisp 的 workspace 包。

- 不要改 `/home/xzg/project/dsh-reader/deepseek-harness`
- 不要改 `/home/xzg/project/wisp-science`
- 不要 `UPDATE` / `INSERT` / `DELETE` 任何 `wisp.sqlite`
- 不要把科学计算工具（Python / R / FASTQ / 文献 MCP）做进本插件

## 数据

Windows 桌面库（真源）：

`/mnt/c/Users/xuzhougeng/AppData/Roaming/science.wisp-science/wisp-science/wisp.sqlite`

Wisp 打开时，从 WSL 直接 `sqlite3` 这个文件会 `disk I/O error`。必须把 `wisp.sqlite` + `-wal` + `-shm` 拷到临时目录再读。

项目工作区在 `D:` / `E:` / `C:`，WSL 下对应 `/mnt/d` `/mnt/e` `/mnt/c`。库里存的是 Windows 路径。

Linux 本机还有一份几乎空的 `~/.local/share/science.wisp-science/wisp-science/wisp.sqlite`，默认不要用它当真源。

## 测试

- 单元测试用 [`testdata/`](./testdata/)，不要把 125MB 的活库提交进 git
- 可选 live 测试：检测到 Windows 库才跑，锁失败就跳过
- 不要对活库做写入测试
