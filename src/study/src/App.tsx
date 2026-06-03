import { useEffect, useState, type ReactNode } from "react";
import type {
  CustomBlockTemplate,
  StudyNodeType,
  StudyState,
} from "./types/study";
import { AppShell } from "./components/layout/AppShell";
import { TopBar } from "./components/layout/TopBar";
import { StudyTree } from "./components/tree/StudyTree";
import { FolderView } from "./components/folder/FolderView";
import { MaterialEditor } from "./components/editor/MaterialEditor";
import { CommandPalette } from "./components/command/CommandPalette";
import { TextInputModal } from "./components/modals/TextInputModal";
import { DangerConfirmModal } from "./components/modals/DangerConfirmModal";
import { SimpleConfirmModal } from "./components/modals/SimpleConfirmModal";
import { AppNoticeViewport } from "./components/ui/AppNoticeViewport";
import { useStudyState } from "./hooks/useStudyState";
import { getNodePath } from "./utils/tree";
import {
  createEmptyStudyState,
  normalizeImportedStudyState,
} from "./utils/studyStateValidation";
import {
  clearAllStoredFiles,
  markFileStorageResetDone,
  wasFileStorageResetDone,
} from "./utils/fileStore";
import {
  createStudyBackup,
  formatStudyBackupLabel,
  getLastStudyBackup,
  hasStudyBackup,
} from "./utils/appBackup";

import {
  showAppError,
  showAppSuccess,
  showAppWarning,
} from "./utils/appNotice";
const HARD_RESET_STORAGE_KEY = "mymind-study-hard-reset-clean-storage-v1";

type NodeTextDialog =
  | {
      mode: "create";
      nodeType: StudyNodeType;
      parentId?: string | null;
    }
  | {
      mode: "rename";
      nodeId: string;
      initialValue: string;
    };

interface DeleteNodeDialog {
  nodeId: string;
  title: string;
  nodeType: StudyNodeType;
}

function App() {
  const {
    state,
    status,
    selectedNode,
    selectedMaterial,
    actions,
  } = useStudyState();

  const [commandOpen, setCommandOpen] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [focusBlockId, setFocusBlockId] = useState<string | null>(null);
  const [nodeTextDialog, setNodeTextDialog] = useState<NodeTextDialog | null>(null);
  const [deleteNodeDialog, setDeleteNodeDialog] = useState<DeleteNodeDialog | null>(null);
  const [clearOpen, setClearOpen] = useState(false);
  const [restoreBackupOpen, setRestoreBackupOpen] = useState(false);
  const [backupVersion, setBackupVersion] = useState(0);
  const [pendingImportState, setPendingImportState] = useState<StudyState | null>(null);

  const path = selectedNode ? getNodePath(state.nodes, selectedNode.id) : "Study";
  const lastBackup = getLastStudyBackup();
  const backupLabel = formatStudyBackupLabel(lastBackup);
  const backupAvailable = hasStudyBackup();

  function refreshBackupStatus() {
    setBackupVersion((version) => version + 1);
  }

  function saveBackup(reason: "before-import" | "before-clear" | "manual") {
    createStudyBackup(state, reason);
    refreshBackupStatus();
  }

  function restoreLastBackup() {
    const backup = getLastStudyBackup();

    if (!backup) {
      showAppWarning("Backup не найден", "Пока нет сохранённого состояния для восстановления.");
      setRestoreBackupOpen(false);
      refreshBackupStatus();
      return;
    }

    actions.setState(backup.state);
    setRestoreBackupOpen(false);
    showAppSuccess("Backup восстановлен", "Данные приложения заменены последним backup.");
    refreshBackupStatus();
  }

  // Keep backupVersion intentionally used to refresh backup availability after creating/restoring backups.
  void backupVersion;

  useEffect(() => {
    if (wasFileStorageResetDone(HARD_RESET_STORAGE_KEY)) {
      return;
    }

    clearAllStoredFiles()
      .catch((error) => {
        console.error(error);
      })
      .finally(() => {
        actions.setState(createEmptyStudyState());
        markFileStorageResetDone(HARD_RESET_STORAGE_KEY);
      });
  }, []);

  useEffect(() => {
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((previous) => !previous);
      }

      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "s") {
        event.preventDefault();
        setSidebarHidden((previous) => !previous);
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z" && !event.shiftKey) {
        event.preventDefault();

        if (actions.canUndo) {
          actions.undo();
        }
      }

      if (
        ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") ||
        ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "z")
      ) {
        event.preventDefault();

        if (actions.canRedo) {
          actions.redo();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [actions]);

  function createFolder(parentId?: string | null) {
    setNodeTextDialog({
      mode: "create",
      nodeType: "folder",
      parentId,
    });
  }

  function createMaterial(parentId?: string | null) {
    setNodeTextDialog({
      mode: "create",
      nodeType: "material",
      parentId,
    });
  }

  function renameNode(nodeId: string) {
    const node = state.nodes.find((item) => item.id === nodeId);

    if (!node) return;

    setNodeTextDialog({
      mode: "rename",
      nodeId,
      initialValue: node.title,
    });
  }

  function deleteNode(nodeId: string) {
    const node = state.nodes.find((item) => item.id === nodeId);

    if (!node) return;

    setDeleteNodeDialog({
      nodeId,
      title: node.title,
      nodeType: node.type,
    });
  }

  function handleNodeTextSubmit(value: string) {
    if (!nodeTextDialog) return;

    if (nodeTextDialog.mode === "create") {
      actions.createNode(nodeTextDialog.nodeType, value, nodeTextDialog.parentId);
    } else {
      actions.renameNode(nodeTextDialog.nodeId, value);
    }

    setNodeTextDialog(null);
  }

  function updateTemplates(templates: CustomBlockTemplate[]) {
    actions.setState((previous) => ({
      ...previous,
      customBlockTemplates: templates,
    }));
  }

  function exportJson() {
    const json = JSON.stringify(state, null, 2);
    const blob = new Blob([json], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    const date = new Date().toISOString().slice(0, 10);

    link.href = url;
    link.download = `mymind-study-${date}.json`;
    link.click();

    URL.revokeObjectURL(url);

    showAppSuccess("JSON экспортирован", `Файл mymind-study-${date}.json скачан.`);
  }

  function exportEmergencyJson() {
    const json = JSON.stringify(state, null, 2);
    const blob = new Blob([json], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const date = new Date().toISOString().replace(/[:.]/g, "-");

    link.href = url;
    link.download = `mymind-emergency-state-${date}.json`;
    link.click();

    URL.revokeObjectURL(url);

    showAppWarning("Аварийный JSON экспортирован", "Файл сохранён на случай ручного восстановления.");
  }

  function resetAfterLoadError() {
    saveBackup("manual");
    actions.setState(createEmptyStudyState());
    showAppSuccess("Приложение сброшено", "Перед сбросом была сохранена резервная копия текущего состояния.");
  }

  function restoreBackupAfterLoadError() {
    const backup = getLastStudyBackup();

    if (!backup) {
      showAppWarning("Backup не найден", "Пока нет сохранённого состояния для восстановления.");
      return;
    }

    actions.setState(backup.state);
    showAppSuccess("Backup восстановлен", "Данные приложения заменены последним backup.");
  }

  function importJson(file: File) {
    const reader = new FileReader();

    reader.onload = () => {
      try {
        const text = String(reader.result ?? "");
        const parsed = JSON.parse(text) as unknown;
        const normalizedState = normalizeImportedStudyState(parsed);

        setPendingImportState(normalizedState);
        showAppWarning("JSON готов к импорту", "Подтверди импорт в модальном окне. Перед заменой будет сохранён backup.");
      } catch (error) {
        console.error(error);
        showAppError("Ошибка импорта JSON", "Файл не удалось прочитать. Проверь структуру JSON и попробуй снова.");
      }
    };

    reader.readAsText(file);
  }

  function clearState() {
    setClearOpen(true);
  }

  function openBlockFromCommandPalette(nodeId: string, blockId: string) {
    actions.selectNode(nodeId);
    setFocusBlockId(blockId);
  }

  const sidebar = (
    <StudyTree
      nodes={state.nodes}
      selectedNodeId={state.selectedNodeId}
      onSelect={actions.selectNode}
      onCreateFolder={createFolder}
      onCreateMaterial={createMaterial}
      onRename={renameNode}
      onDelete={deleteNode}
      onDuplicateMaterial={actions.duplicateMaterial}
      onMoveNode={actions.moveNode}
    />
  );

  const topbar = (
    <TopBar
      path={path}
      status={status}
      sidebarHidden={sidebarHidden}
      canUndo={actions.canUndo}
      canRedo={actions.canRedo}
      onUndo={actions.undo}
      onRedo={actions.redo}
      onToggleSidebar={() => setSidebarHidden((previous) => !previous)}
      onOpenCommandPalette={() => setCommandOpen(true)}
      onExportJson={exportJson}
      onImportJson={importJson}
      onClearState={clearState}
      hasBackup={backupAvailable}
      backupLabel={backupLabel}
      onRestoreBackup={() => setRestoreBackupOpen(true)}
    />
  );

  const commandPalette = (
    <CommandPalette
      open={commandOpen}
      nodes={state.nodes}
      materials={state.materials}
      templates={state.customBlockTemplates}
      selectedNodeId={state.selectedNodeId}
      sidebarHidden={sidebarHidden}
      canUndo={actions.canUndo}
      canRedo={actions.canRedo}
      onClose={() => setCommandOpen(false)}
      onOpenNode={actions.selectNode}
      onOpenBlock={openBlockFromCommandPalette}
      onCreateFolder={() => createFolder()}
      onCreateMaterial={() => createMaterial()}
      onToggleSidebar={() => setSidebarHidden((previous) => !previous)}
      onUndo={actions.undo}
      onRedo={actions.redo}
      onExportJson={exportJson}
      onClearState={clearState}
    />
  );

  const modals = (
    <>
      <TextInputModal
        open={Boolean(nodeTextDialog)}
        title={
          nodeTextDialog?.mode === "rename"
            ? "Переименовать"
            : nodeTextDialog?.nodeType === "folder"
              ? "Новая папка"
              : "Новый материал"
        }
        label={
          nodeTextDialog?.mode === "rename"
            ? "Новое название"
            : "Название"
        }
        initialValue={nodeTextDialog?.mode === "rename" ? nodeTextDialog.initialValue : ""}
        confirmLabel={nodeTextDialog?.mode === "rename" ? "Сохранить" : "Создать"}
        onCancel={() => setNodeTextDialog(null)}
        onSubmit={handleNodeTextSubmit}
      />

      <DangerConfirmModal
        open={Boolean(deleteNodeDialog)}
        title="Удаление"
        message={
          deleteNodeDialog
            ? deleteNodeDialog.nodeType === "folder"
              ? `Будет удалена папка "${deleteNodeDialog.title}" вместе со всеми вложенными папками и материалами.`
              : `Будет удалён материал "${deleteNodeDialog.title}" вместе со всеми блоками.`
            : ""
        }
        requiredText={deleteNodeDialog?.title ?? ""}
        confirmLabel="Удалить"
        onCancel={() => setDeleteNodeDialog(null)}
        onConfirm={() => {
          if (!deleteNodeDialog) return;

          actions.deleteNode(deleteNodeDialog.nodeId);
          setDeleteNodeDialog(null);
        }}
      />

      <DangerConfirmModal
        open={clearOpen}
        title="Очистить приложение"
        message="Все папки, материалы, блоки и шаблоны будут удалены из текущего JSON-состояния. Перед очисткой автоматически сохранится backup для восстановления."
        requiredText="CLEAR"
        confirmLabel="Очистить"
        onCancel={() => setClearOpen(false)}
        onConfirm={() => {
          saveBackup("before-clear");
          actions.setState(createEmptyStudyState());
          setClearOpen(false);
          showAppSuccess("Приложение очищено", "Предыдущее состояние сохранено в backup.");
        }}
      />

      <SimpleConfirmModal
        open={Boolean(pendingImportState)}
        title="Импорт JSON"
        message="Импортировать выбранный JSON? Текущие данные приложения будут заменены. Перед импортом автоматически сохранится backup текущего состояния."
        confirmLabel="Импортировать"
        onCancel={() => setPendingImportState(null)}
        onConfirm={() => {
          if (!pendingImportState) return;

          saveBackup("before-import");
          actions.setState(pendingImportState);
          setPendingImportState(null);
          showAppSuccess("JSON импортирован", "Предыдущее состояние сохранено в backup.");
        }}
      />

      <SimpleConfirmModal
        open={restoreBackupOpen}
        title="Восстановить backup"
        message={`Восстановить последний backup? Текущие данные будут заменены. Последний backup: ${backupLabel}`}
        confirmLabel="Восстановить"
        onCancel={() => setRestoreBackupOpen(false)}
        onConfirm={restoreLastBackup}
      />
    </>
  );

  function renderShell(content: ReactNode) {
    return (
      <>
        <AppShell sidebar={sidebar} topbar={topbar} sidebarHidden={sidebarHidden}>
          {content}
        </AppShell>

        {commandPalette}
        {modals}
        <AppNoticeViewport />
      </>
    );
  }

  if (status === "loading") {
    return renderShell(
      <div className="border border-black bg-white p-6">
        Загрузка данных из JSON...
      </div>
    );
  }

  if (status === "error") {
    return renderShell(
      <div className="mx-auto max-w-3xl border border-black bg-white p-6 shadow-[6px_6px_0_#000]">
        <div className="border-b border-black pb-4">
          <p className="mb-2 inline-block border border-black bg-black px-2 py-1 text-xs font-bold text-white">
            RECOVERY MODE
          </p>

          <h2 className="text-2xl font-black">
            Не удалось загрузить JSON-состояние
          </h2>

          <p className="mt-3 text-sm leading-6 text-neutral-700">
            Приложение столкнулось с ошибкой при чтении сохранённых данных.
            Чтобы не потерять работу, сначала попробуй восстановить backup.
            Если backup не нужен, можно сбросить приложение в пустое состояние.
          </p>
        </div>

        <div className="mt-5 grid gap-3">
          <button
            type="button"
            onClick={restoreBackupAfterLoadError}
            disabled={!backupAvailable}
            className={
              backupAvailable
                ? "border border-black bg-black px-4 py-3 text-left text-white hover:bg-white hover:text-black"
                : "border border-neutral-400 bg-neutral-100 px-4 py-3 text-left text-neutral-400"
            }
          >
            <span className="block font-bold">Restore last backup</span>
            <span className="mt-1 block text-sm opacity-80">{backupLabel}</span>
          </button>

          <button
            type="button"
            onClick={exportEmergencyJson}
            className="border border-black bg-white px-4 py-3 text-left hover:bg-black hover:text-white"
          >
            <span className="block font-bold">Export emergency JSON</span>
            <span className="mt-1 block text-sm opacity-70">
              Скачать текущее аварийное состояние перед дальнейшими действиями.
            </span>
          </button>

          <button
            type="button"
            onClick={resetAfterLoadError}
            className="border border-black bg-white px-4 py-3 text-left hover:bg-black hover:text-white"
          >
            <span className="block font-bold">Reset app to empty state</span>
            <span className="mt-1 block text-sm opacity-70">
              Создать чистое состояние приложения. Перед сбросом будет сохранён manual backup.
            </span>
          </button>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="border border-black bg-white px-4 py-3 text-left hover:bg-black hover:text-white"
          >
            <span className="block font-bold">Reload page</span>
            <span className="mt-1 block text-sm opacity-70">
              Перезагрузить приложение и попробовать прочитать данные снова.
            </span>
          </button>
        </div>
      </div>
    );
  }

  if (!selectedNode) {
    return renderShell(
      <div className="border border-black bg-white p-6">
        <h2 className="text-xl font-bold">Ничего не выбрано</h2>
        <p className="mt-2 text-sm text-neutral-600">
          Создай папку или материал слева.
        </p>
      </div>
    );
  }

  if (selectedNode.type === "folder") {
    return renderShell(
      <FolderView
        node={selectedNode}
        nodes={state.nodes}
        materials={state.materials}
        onOpenNode={actions.selectNode}
        onCreateFolder={() => createFolder(selectedNode.id)}
        onCreateMaterial={() => createMaterial(selectedNode.id)}
      />
    );
  }

  if (selectedNode.type === "material" && selectedMaterial) {
    return renderShell(
      <MaterialEditor
        material={selectedMaterial}
        currentNode={selectedNode}
        nodes={state.nodes}
        materials={state.materials}
        templates={state.customBlockTemplates}
        onTemplatesChange={updateTemplates}
        onRenameTitle={(title) => actions.updateMaterialTitle(selectedNode.id, title)}
        onUpdateMaterial={actions.updateMaterial}
        onAddBlock={(block) => actions.addBlock(selectedMaterial.id, block)}
        onUpdateBlock={(blockId, block) => actions.updateBlock(selectedMaterial.id, blockId, block)}
        onDeleteBlock={(blockId) => actions.deleteBlock(selectedMaterial.id, blockId)}
        onDuplicateBlock={(blockId) => actions.duplicateBlock(selectedMaterial.id, blockId)}
        onMoveBlock={(blockId, direction) => actions.moveBlock(selectedMaterial.id, blockId, direction)}
        onOpenNode={actions.selectNode}
        focusBlockId={focusBlockId}
        onFocusBlockConsumed={() => setFocusBlockId(null)}
      />
    );
  }

  return renderShell(
    <div className="border border-black bg-white p-6">
      Материал не найден.
    </div>
  );
}

export default App;
