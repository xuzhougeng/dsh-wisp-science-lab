# dsh-wisp-science-lab

[![dsh-plugin](https://img.shields.io/badge/dsh-plugin-1f6feb)](https://github.com/topics/dsh-plugin)
[![DeepSeek Harness](https://img.shields.io/badge/DeepSeek%20Harness-cordis%20bundle-111827)](https://github.com/deepseek-ai/deepseek-harness)
[![Node](https://img.shields.io/badge/node-%5E22.19%20%7C%7C%20%3E%3D24-339933)](https://nodejs.org)

English | [中文](README.zh.md)

**A [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) plugin that turns your agent into a laboratory PI for local [Wisp Science](https://github.com/xuzhougeng/wisp-science) projects.**

dsh advises. Wisp runs the experiments. **v0 is read-only** — list projects, take a bounded progress snapshot, give evidence-backed next steps. It does not write `wisp.sqlite`, does not run Python/R/FASTQ inside dsh, and cannot dispatch the Wisp agent yet.

```
You  →  dsh (PI)  →  wisp_list_projects / wisp_project_snapshot
                         ↓  copy sqlite + wal + shm, read-only
                    Wisp Science desktop (experimenter)
```

## Why

- **See every local project** — names, session/run/artifact counts, Windows and WSL paths.
- **Bounded snapshots** — recent runs, artifacts, research-graph titles, `.wisp/WISP.md`, memory filenames. Caps so a project with 358 runs does not flood the context.
- **PI persona** — must cite Run titles / artifact names / WISP.md. Forbidden to invent analyses that are not in the snapshot.
- **Safe on a live desktop library** — copies `wisp.sqlite` (and `-wal`/`-shm` if present) to a temp dir, never checkpoints the original.

## Install

This plugin runs **inside dsh**. Install DeepSeek Harness first.

### 1. DeepSeek Harness

Requires Node.js `^22.19.0` or `>=24`.

```sh
npx @deepseek-ai/dsh web
```

Open `http://127.0.0.1:3080` and add a model API key in Settings.

To get a global `dsh` command:

```sh
npm install -g @deepseek-ai/dsh
dsh web
```

Source checkout: [deepseek-harness README](https://github.com/deepseek-ai/deepseek-harness#run).

### 2. This plugin

```sh
dsh plugin --profile web add github:xuzhougeng/dsh-wisp-science-lab
# if dsh is not on PATH:
npx @deepseek-ai/dsh plugin --profile web add github:xuzhougeng/dsh-wisp-science-lab
```

That both installs the package **and** registers `cordis.patch.yml` on the profile (`dsh.bundle`). Do not `--patch` the same layer on top — it will load twice.

Restart:

```sh
dsh web
```

You should see `[wisp-science-lab] plugin loaded`.

From a local clone:

```sh
git clone https://github.com/xuzhougeng/dsh-wisp-science-lab.git
dsh plugin --profile web add ./dsh-wisp-science-lab
```

Not published to npm yet — do not `npm i dsh-wisp-science-lab`.

```sh
dsh plugin --profile web remove dsh-wisp-science-lab
```

## Usage

Talk to the agent in dsh:

- List my Wisp projects
- How far is “转录组分析”? What should we do next?
- Compare progress of project A and project B

The model should call `wisp_list_projects` / `wisp_project_snapshot` instead of `bash`-scanning the disk. Advice must quote snapshot evidence. If you ask it to “go run the experiment”, v0 only returns a prompt you can paste into Wisp.

| Tool | What it returns |
|---|---|
| `wisp_list_projects` | Project roster (optional name/id substring filter) |
| `wisp_project_snapshot` | Bounded snapshot: recent sessions, runs, artifacts, research nodes, WISP.md, memory files |

## Config

The plugin reads Wisp’s global `wisp.sqlite`. Resolution order:

1. `appDataDir` in plugin config (if non-empty)
2. `WISP_APP_DATA_DIR`
3. Windows: `%APPDATA%\science.wisp-science\wisp-science`
4. Linux: `~/.local/share/science.wisp-science/wisp-science`

If dsh runs in WSL and the library lives on Windows, set (use your Windows username):

```sh
export WISP_APP_DATA_DIR=/mnt/c/Users/<WindowsUser>/AppData/Roaming/science.wisp-science/wisp-science
```

Or in `~/.dsh/profiles/web/cordis.patch.yml`:

```yaml
- id: wisp-science-lab
  config:
    appDataDir: /mnt/c/Users/<WindowsUser>/AppData/Roaming/science.wisp-science/wisp-science
```

| Field | Default | Meaning |
|---|---|---|
| `appDataDir` | `''` (auto) | Directory that contains `wisp.sqlite` |
| `maxSessions` | 8 | Recent sessions in a snapshot |
| `maxRuns` | 12 | Recent runs |
| `maxArtifacts` | 12 | Recent artifacts |
| `maxMemoryFiles` | 20 | `.wisp/memory` filenames |
| `wispMdMaxBytes` | 8192 | Truncate `.wisp/WISP.md` |

## Limits

- **Read-only.** Does not write the live library or project trees.
- **WAL copy.** Direct `sqlite3` on a locked Windows file from WSL often hits `disk I/O error`. Each tool call copies sqlite + wal + shm, then deletes the temp dir.
- **Paths.** Store rows are usually Windows paths. On WSL the result also includes `workspaceDirLocal` (`D:\foo` → `/mnt/d/foo` when that path exists).
- **No full transcripts.** Snapshots never dump complete `messages.content`.

## Develop

Source overlay (do not stack on a marketplace install):

```sh
cd /path/to/deepseek-harness
pnpm dsh web --patch /path/to/dsh-wisp-science-lab/cordis.dev.yml
```

Point `cordis.dev.yml` at your checkout. After editing `src/`, run `pnpm build` and commit `lib/index.js`.

```sh
pnpm test
pnpm print-snapshot            # live copy, else testdata/mini.sqlite
WISP_LAB_LIVE=1 pnpm test      # optional; skips on lock
```

This repo is tagged [`dsh-plugin`](https://github.com/topics/dsh-plugin) so `dsh-find-plugin` and plugin markets can index it.
