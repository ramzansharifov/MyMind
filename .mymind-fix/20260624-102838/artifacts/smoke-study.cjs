const fs = require("node:fs");

const dbPath = process.argv[2];
const outPath = process.argv[3];

const result = {
  dbPath,
  exists: fs.existsSync(dbPath),
  tables: [],
  checks: {},
  error: null
};

try {
  if (!result.exists) {
    result.checks.databaseExists = false;
    fs.writeFileSync(outPath, JSON.stringify(result, null, 2), "utf8");
    process.exit(0);
  }

  const Database = require("better-sqlite3");
  const db = new Database(dbPath);

  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");

  result.tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    .all()
    .map((x) => x.name);

  result.checks.databaseExists = true;
  result.checks.hasCollections = result.tables.includes("collections");
  result.checks.hasStudyMaterials = result.tables.includes("study_materials");

  if (result.checks.hasCollections && result.checks.hasStudyMaterials) {
    const now = new Date().toISOString();
    const materialId = "ps-smoke-study-" + Date.now();
    const nodeId = "ps-smoke-node-" + Date.now();

    db.prepare(`
      INSERT INTO collections (name, payload, created_at, updated_at)
      VALUES (@name, @payload, @createdAt, @updatedAt)
      ON CONFLICT(name) DO UPDATE SET
        payload = excluded.payload,
        updated_at = excluded.updated_at
    `).run({
      name: "study",
      payload: JSON.stringify({
        selectedNodeId: nodeId,
        nodes: [{
          id: nodeId,
          type: "material",
          title: "PowerShell smoke material",
          materialId,
          parentId: null,
          order: 0,
          createdAt: now,
          updatedAt: now
        }]
      }),
      createdAt: now,
      updatedAt: now
    });

    db.prepare(`
      INSERT INTO study_materials
        (id, title, editor_content, plain_text, board_links, created_at, updated_at)
      VALUES
        (@id, @title, @editorContent, @plainText, @boardLinks, @createdAt, @updatedAt)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        editor_content = excluded.editor_content,
        plain_text = excluded.plain_text,
        board_links = excluded.board_links,
        updated_at = excluded.updated_at
    `).run({
      id: materialId,
      title: "PowerShell smoke material",
      editorContent: JSON.stringify({ type: "doc", plainText: "study save/load ok" }),
      plainText: "study save/load ok",
      boardLinks: JSON.stringify([]),
      createdAt: now,
      updatedAt: now
    });

    const saved = db.prepare("SELECT id, title, plain_text FROM study_materials WHERE id = ?").get(materialId);
    const tree = db.prepare("SELECT name, payload FROM collections WHERE name = 'study'").get();

    result.checks.studyMaterialSaveLoad = Boolean(saved && saved.id === materialId);
    result.checks.studyTreeSaveLoad = Boolean(tree && tree.name === "study");

    db.prepare("DELETE FROM study_materials WHERE id = ?").run(materialId);
  }

  db.close();
}
catch (e) {
  result.error = {
    message: e && e.message ? e.message : String(e),
    stack: e && e.stack ? e.stack : null
  };
}

fs.writeFileSync(outPath, JSON.stringify(result, null, 2), "utf8");
