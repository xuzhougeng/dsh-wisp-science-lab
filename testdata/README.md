# testdata

2026-08-19 从 Windows 活库抽出的只读夹具。实现 store 测试时据此生成很小的 `mini.sqlite`，不要把 125MB 活库拷进仓库。

| 文件 | 内容 |
|---|---|
| `projects.json` | 当时 13 个非 scratch 项目的花名册 |
| `snapshot-rna-seq.json` | 「转录组分析」的会话 / Run / 产物 / 研究节点 |
| `mini.sqlite` | 由 `pnpm build-mini` / 测试 setup 生成的小库（转录组分析 + insertsbio） |
| `workspaces/rna-seq/` | 快照测试用的 `.wisp/WISP.md` 与 memory 文件名 |
