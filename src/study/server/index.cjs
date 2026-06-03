const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = Number(process.env.STUDY_API_PORT || 5174);

const rootDir = path.resolve(__dirname, "..");
const dataDir = path.join(rootDir, "data");
const dataFile = path.join(dataDir, "study-state.json");

app.use(cors());
app.use(express.json({ limit: "25mb" }));

function ensureDataFile() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(dataFile)) {
    const emptyState = {
      selectedNodeId: null,
      nodes: [],
      materials: [],
      customBlockTemplates: []
    };

    fs.writeFileSync(dataFile, JSON.stringify(emptyState, null, 2), "utf8");
  }
}

function readState() {
  ensureDataFile();

  const raw = fs.readFileSync(dataFile, "utf8").replace(/^\uFEFF/, "");

  if (!raw.trim()) {
    return {
      selectedNodeId: null,
      nodes: [],
      materials: [],
      customBlockTemplates: []
    };
  }

  return JSON.parse(raw);
}

function writeState(state) {
  ensureDataFile();

  const safeState = {
    selectedNodeId: state.selectedNodeId ?? null,
    nodes: Array.isArray(state.nodes) ? state.nodes : [],
    materials: Array.isArray(state.materials) ? state.materials : [],
    customBlockTemplates: Array.isArray(state.customBlockTemplates)
      ? state.customBlockTemplates
      : []
  };

  fs.writeFileSync(dataFile, JSON.stringify(safeState, null, 2), "utf8");

  return safeState;
}

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    message: "Study JSON server is running"
  });
});

app.get("/api/study-state", (req, res) => {
  try {
    const state = readState();
    res.json(state);
  } catch (error) {
    console.error("Failed to read study state:", error);
    res.status(500).json({
      error: "Failed to read study state"
    });
  }
});

app.put("/api/study-state", (req, res) => {
  try {
    const savedState = writeState(req.body);
    res.json({
      ok: true,
      state: savedState
    });
  } catch (error) {
    console.error("Failed to save study state:", error);
    res.status(500).json({
      error: "Failed to save study state"
    });
  }
});

app.post("/api/study-state/reset", (req, res) => {
  try {
    const emptyState = {
      selectedNodeId: null,
      nodes: [],
      materials: [],
      customBlockTemplates: []
    };

    const savedState = writeState(emptyState);

    res.json({
      ok: true,
      state: savedState
    });
  } catch (error) {
    console.error("Failed to reset study state:", error);
    res.status(500).json({
      error: "Failed to reset study state"
    });
  }
});

app.listen(PORT, () => {
  ensureDataFile();
  console.log(`Study JSON server: http://localhost:${PORT}`);
  console.log(`Data file: ${dataFile}`);
});
