import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import projects from '../testdata/projects.json' with { type: 'json' }
import snapshot from '../testdata/snapshot-rna-seq.json' with { type: 'json' }

const MINI_NAMES = new Set(['转录组分析', 'insertsbio'])

const DDL = `
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT,
  description TEXT,
  workspace_dir TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  ephemeral INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE frames (
  id TEXT PRIMARY KEY,
  parent_frame_id TEXT,
  root_frame_id TEXT,
  agent_name TEXT NOT NULL,
  status TEXT NOT NULL,
  project_id TEXT,
  exploration_id TEXT,
  title TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  frame_id TEXT NOT NULL,
  seq INTEGER NOT NULL,
  role TEXT NOT NULL,
  content TEXT,
  ts INTEGER NOT NULL
);
CREATE TABLE artifacts (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  root_frame_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  storage_path TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  exploration_id TEXT
);
CREATE TABLE runs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  frame_id TEXT,
  context_id TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  kind TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  ended_at INTEGER,
  exit_code INTEGER,
  exploration_id TEXT
);
CREATE TABLE research_nodes (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  exploration_id TEXT
);
`

export function writeMiniSqlite(dest: string): void {
  mkdirSync(dirname(dest), { recursive: true })
  const db = new DatabaseSync(dest)
  try {
    db.exec('PRAGMA journal_mode=DELETE')
    db.exec(DDL)

    const insertProject = db.prepare(`
      INSERT INTO projects(id,name,description,workspace_dir,created_at,updated_at,ephemeral)
      VALUES (?,?,?,?,?,?,0)
    `)
    for (const project of projects) {
      if (!MINI_NAMES.has(project.name)) continue
      insertProject.run(
        project.id,
        project.name,
        project.description,
        project.workspace_dir,
        project.created_at,
        project.updated_at,
      )
    }

    db.prepare(`
      INSERT INTO projects(id,name,description,workspace_dir,created_at,updated_at,ephemeral)
      VALUES ('scratch:ignore','scratch','','/tmp/scratch',1,1,0)
    `).run()
    db.prepare(`
      INSERT INTO projects(id,name,description,workspace_dir,created_at,updated_at,ephemeral)
      VALUES ('ephemeral-hidden','hidden','','/tmp/hidden',1,1,1)
    `).run()

    const projectId = snapshot.project_id
    for (const frame of snapshot.frames) {
      db.prepare(`
        INSERT INTO frames(id,parent_frame_id,root_frame_id,agent_name,status,project_id,exploration_id,title,created_at,updated_at)
        VALUES (?,?,?,?,?,?,NULL,?,?,?)
      `).run(
        frame.id,
        frame.id,
        frame.id,
        'wisp',
        frame.status,
        projectId,
        frame.title,
        frame.updated_at,
        frame.updated_at,
      )
    }

    const frameId = snapshot.frames[0]!.id
    db.prepare(`
      INSERT INTO messages(id,frame_id,seq,role,content,ts)
      VALUES ('msg-user-1',?,1,'user',?,?)
    `).run(
      frameId,
      JSON.stringify([{ type: 'text', text: '从 ENA 拉 SRR2584863，做 FASTQ QC。' }]),
      snapshot.frames[0]!.updated_at,
    )
    db.prepare(`
      INSERT INTO messages(id,frame_id,seq,role,content,ts)
      VALUES ('msg-assistant-1',?,2,'assistant',?,?)
    `).run(
      frameId,
      JSON.stringify([{ type: 'text', text: 'This assistant body must not appear in the snapshot.' }]),
      snapshot.frames[0]!.updated_at + 1,
    )

    for (const run of snapshot.runs) {
      db.prepare(`
        INSERT INTO runs(id,project_id,frame_id,context_id,title,kind,status,created_at,ended_at,exit_code,exploration_id)
        VALUES (?,?,?,'ctx-rna-seq',?,?,?,?,?,?,NULL)
      `).run(
        run.id,
        projectId,
        frameId,
        run.title,
        run.kind,
        run.status,
        run.ended_at,
        run.ended_at,
        run.exit_code,
      )
    }

    for (const art of snapshot.artifacts) {
      db.prepare(`
        INSERT INTO artifacts(id,project_id,root_frame_id,filename,content_type,storage_path,created_at,exploration_id)
        VALUES (?,?,?,?,?,'',?,NULL)
      `).run(art.id, projectId, frameId, art.filename, art.content_type, art.created_at)
    }

    let nodeIndex = 0
    for (const node of snapshot.research_nodes) {
      nodeIndex += 1
      db.prepare(`
        INSERT INTO research_nodes(id,project_id,kind,title,created_at,updated_at,exploration_id)
        VALUES (?,?,?,?,?,?,NULL)
      `).run(`node-${nodeIndex}`, projectId, node.kind, node.title, 1786930000 + nodeIndex, 1786930000 + nodeIndex)
    }
  } finally {
    db.close()
  }
}
