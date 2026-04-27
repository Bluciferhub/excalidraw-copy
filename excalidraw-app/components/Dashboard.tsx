import { useState, useEffect, useCallback, useRef } from "react";
import {
  notebookStoreAPI,
  type NotebookMeta,
} from "../data/notebookStore";
import { deleteNotebookContent } from "../data/notebookContent";
import { deleteNotebookFromGitHub, isGitHubConfigured } from "../data/githubSync";
import { NewNotebookDialog } from "./NewNotebookDialog";
import { GitHubSettings } from "./GitHubSettings";

import "./Dashboard.scss";

const NOTEBOOK_ICONS = [
  "📓", "📋", "📝", "📐", "💡", "🧠", "🎨", "📊",
  "🔬", "🗺️", "📚", "✏️", "🖊️", "📌", "🏗️", "⚡",
];

const formatDate = (ts: number): string => {
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  });
};

// ─── Context Menu ─────────────────────────────────────────────────────────

interface ContextMenuProps {
  x: number;
  y: number;
  notebook: NotebookMeta;
  onClose: () => void;
  onRename: (id: string) => void;
  onDelete: (id: string) => void;
  onChangeColor: (id: string) => void;
}

const ContextMenu = ({
  x,
  y,
  notebook,
  onClose,
  onRename,
  onDelete,
  onChangeColor,
}: ContextMenuProps) => {
  useEffect(() => {
    const handler = () => onClose();
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [onClose]);

  return (
    <div className="context-menu" style={{ top: y, left: x }}>
      <button
        className="context-menu__item"
        onClick={(e) => {
          e.stopPropagation();
          onRename(notebook.id);
          onClose();
        }}
      >
        ✏️ Rename
      </button>
      <button
        className="context-menu__item"
        onClick={(e) => {
          e.stopPropagation();
          onChangeColor(notebook.id);
          onClose();
        }}
      >
        🎨 Change Color
      </button>
      <div className="context-menu__divider" />
      <button
        className="context-menu__item context-menu__item--danger"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(notebook.id);
          onClose();
        }}
      >
        🗑️ Delete
      </button>
    </div>
  );
};

// ─── Notebook Card ────────────────────────────────────────────────────────

interface NotebookCardProps {
  notebook: NotebookMeta;
  onOpen: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, notebook: NotebookMeta) => void;
  isRenaming: boolean;
  onRenameSubmit: (id: string, newName: string) => void;
  onRenameCancel: () => void;
}

const NotebookCard = ({
  notebook,
  onOpen,
  onContextMenu,
  isRenaming,
  onRenameSubmit,
  onRenameCancel,
}: NotebookCardProps) => {
  const [renameValue, setRenameValue] = useState(notebook.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onRenameSubmit(notebook.id, renameValue.trim() || notebook.name);
    } else if (e.key === "Escape") {
      onRenameCancel();
    }
  };

  return (
    <div
      className="notebook-card"
      onClick={() => !isRenaming && onOpen(notebook.id)}
      onContextMenu={(e) => onContextMenu(e, notebook)}
    >
      <div
        className="notebook-card__accent"
        style={{ background: notebook.gradient }}
      />
      <div className="notebook-card__body">
        <span className="notebook-card__icon">{notebook.icon}</span>
        {isRenaming ? (
          <input
            ref={inputRef}
            className="notebook-card__rename-input"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={handleRenameKeyDown}
            onBlur={() =>
              onRenameSubmit(notebook.id, renameValue.trim() || notebook.name)
            }
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <h3 className="notebook-card__name">{notebook.name}</h3>
        )}
        <p className="notebook-card__date">{formatDate(notebook.updatedAt)}</p>
      </div>
      <div className="notebook-card__actions">
        <button
          className="notebook-card__menu-btn"
          onClick={(e) => {
            e.stopPropagation();
            onContextMenu(e, notebook);
          }}
        >
          ⋮
        </button>
      </div>
    </div>
  );
};

// ─── Dashboard ────────────────────────────────────────────────────────────

interface DashboardProps {
  onOpenNotebook: (id: string) => void;
}

export const Dashboard = ({ onOpenNotebook }: DashboardProps) => {
  const [notebooks, setNotebooks] = useState<NotebookMeta[]>([]);
  const [deletedNotebooks, setDeletedNotebooks] = useState<NotebookMeta[]>([]);
  const [activeTab, setActiveTab] = useState<"notebooks" | "recycle">(
    "notebooks",
  );
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    notebook: NotebookMeta;
  } | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null);
  const [githubConnected, setGithubConnected] = useState(false);

  const loadNotebooks = useCallback(async () => {
    const all = await notebookStoreAPI.getAllNotebooks();
    setNotebooks(all);
    const deleted = await notebookStoreAPI.getDeletedNotebooks();
    setDeletedNotebooks(deleted);
  }, []);

  useEffect(() => {
    loadNotebooks();
    setGithubConnected(isGitHubConfigured());
  }, [loadNotebooks]);

  const handleCreateNotebook = useCallback(
    async (name: string, colorIndex: number, icon: string) => {
      const nb = await notebookStoreAPI.createNotebook(name, colorIndex, icon);
      setShowNewDialog(false);
      await loadNotebooks();
      onOpenNotebook(nb.id);
    },
    [loadNotebooks, onOpenNotebook],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await notebookStoreAPI.softDeleteNotebook(id);
      await loadNotebooks();
    },
    [loadNotebooks],
  );

  const handleRestore = useCallback(
    async (id: string) => {
      await notebookStoreAPI.restoreNotebook(id);
      await loadNotebooks();
    },
    [loadNotebooks],
  );

  const handlePermanentDelete = useCallback(
    async (id: string) => {
      await deleteNotebookFromGitHub(id);
      await deleteNotebookContent(id);
      await notebookStoreAPI.permanentlyDeleteNotebook(id);
      await loadNotebooks();
    },
    [loadNotebooks],
  );

  const handleRename = useCallback(
    async (id: string, newName: string) => {
      await notebookStoreAPI.updateNotebook(id, { name: newName });
      setRenamingId(null);
      await loadNotebooks();
    },
    [loadNotebooks],
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, notebook: NotebookMeta) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({ x: e.clientX, y: e.clientY, notebook });
    },
    [],
  );

  const handleChangeColor = useCallback((id: string) => {
    setShowColorPicker(id);
  }, []);

  return (
    <div className="dashboard" id="dashboard">
      {/* Header */}
      <div className="dashboard__header">
        <h1 className="dashboard__title">All Notebooks</h1>
        <p className="dashboard__subtitle">Your personal knowledge base</p>
      </div>

      {/* Settings Bar */}
      <div className="dashboard__settings-bar">
        <button
          className="settings-btn"
          onClick={() => setShowSettings(true)}
          id="github-settings-btn"
        >
          <span className="settings-btn__icon">⚙️</span>
          GitHub
          <span
            className={`settings-btn__status ${
              githubConnected
                ? "settings-btn__status--connected"
                : "settings-btn__status--disconnected"
            }`}
          />
        </button>
      </div>

      {/* Tabs */}
      <div className="dashboard__tabs">
        <button
          className={`dashboard__tab ${
            activeTab === "notebooks" ? "dashboard__tab--active" : ""
          }`}
          onClick={() => setActiveTab("notebooks")}
          id="tab-notebooks"
        >
          <span className="dashboard__tab-icon">📒</span>
          Notebooks
        </button>
        <button
          className={`dashboard__tab ${
            activeTab === "recycle" ? "dashboard__tab--active" : ""
          }`}
          onClick={() => setActiveTab("recycle")}
          id="tab-recycle"
        >
          <span className="dashboard__tab-icon">🗑️</span>
          Recycle Bin
        </button>
      </div>

      {/* Notebooks Grid */}
      <div className="dashboard__grid">
        {activeTab === "notebooks" && (
          <>
            {notebooks.map((nb) => (
              <NotebookCard
                key={nb.id}
                notebook={nb}
                onOpen={onOpenNotebook}
                onContextMenu={handleContextMenu}
                isRenaming={renamingId === nb.id}
                onRenameSubmit={handleRename}
                onRenameCancel={() => setRenamingId(null)}
              />
            ))}
            <button
              className="new-notebook-card"
              onClick={() => setShowNewDialog(true)}
              id="new-notebook-btn"
            >
              <span className="new-notebook-card__icon">+</span>
              <span className="new-notebook-card__label">New Notebook</span>
            </button>
          </>
        )}

        {activeTab === "recycle" && (
          <>
            {deletedNotebooks.length === 0 && (
              <div className="dashboard__empty">
                <div className="dashboard__empty-icon">🗑️</div>
                <p className="dashboard__empty-text">
                  Recycle bin is empty
                </p>
              </div>
            )}
            {deletedNotebooks.map((nb) => (
              <div key={nb.id} className="notebook-card">
                <div
                  className="notebook-card__accent"
                  style={{ background: nb.gradient, opacity: 0.5 }}
                />
                <div className="notebook-card__body">
                  <span className="notebook-card__icon" style={{ opacity: 0.5 }}>
                    {nb.icon}
                  </span>
                  <h3 className="notebook-card__name" style={{ opacity: 0.7 }}>
                    {nb.name}
                  </h3>
                  <p className="notebook-card__date">
                    Deleted {formatDate(nb.deletedAt || 0)}
                  </p>
                  <div
                    style={{
                      display: "flex",
                      gap: "0.5rem",
                      marginTop: "0.75rem",
                    }}
                  >
                    <button
                      className="btn btn--secondary"
                      style={{ fontSize: "0.75rem", padding: "0.35rem 0.75rem" }}
                      onClick={() => handleRestore(nb.id)}
                    >
                      Restore
                    </button>
                    <button
                      className="btn btn--danger"
                      style={{ fontSize: "0.75rem", padding: "0.35rem 0.75rem" }}
                      onClick={() => handlePermanentDelete(nb.id)}
                    >
                      Delete Forever
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          notebook={contextMenu.notebook}
          onClose={() => setContextMenu(null)}
          onRename={setRenamingId}
          onDelete={handleDelete}
          onChangeColor={handleChangeColor}
        />
      )}

      {/* New Notebook Dialog */}
      {showNewDialog && (
        <NewNotebookDialog
          onClose={() => setShowNewDialog(false)}
          onCreate={handleCreateNotebook}
          icons={NOTEBOOK_ICONS}
        />
      )}

      {/* GitHub Settings Dialog */}
      {showSettings && (
        <GitHubSettings
          onClose={() => {
            setShowSettings(false);
            setGithubConnected(isGitHubConfigured());
          }}
        />
      )}

      {/* Color Picker Dialog */}
      {showColorPicker && (
        <ColorPickerDialog
          notebookId={showColorPicker}
          onClose={() => {
            setShowColorPicker(null);
            loadNotebooks();
          }}
        />
      )}
    </div>
  );
};

// ─── Color Picker Dialog ──────────────────────────────────────────────────

import { NOTEBOOK_COLORS } from "../app_constants";

const ColorPickerDialog = ({
  notebookId,
  onClose,
}: {
  notebookId: string;
  onClose: () => void;
}) => {
  const [selected, setSelected] = useState(0);

  const handleSave = async () => {
    const color = NOTEBOOK_COLORS[selected];
    await notebookStoreAPI.updateNotebook(notebookId, {
      color: color.value,
      gradient: color.gradient,
    });
    onClose();
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <h2 className="dialog__title">Change Color</h2>
        <div className="dialog__field">
          <label className="dialog__label">Select Color</label>
          <div className="color-picker">
            {NOTEBOOK_COLORS.map((c, i) => (
              <button
                key={c.name}
                className={`color-picker__swatch ${
                  selected === i ? "color-picker__swatch--selected" : ""
                }`}
                style={{ background: c.gradient }}
                onClick={() => setSelected(i)}
                title={c.name}
              />
            ))}
          </div>
        </div>
        <div className="dialog__actions">
          <button className="btn btn--secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn--primary" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
