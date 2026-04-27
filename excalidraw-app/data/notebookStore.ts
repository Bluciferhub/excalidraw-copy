/**
 * IndexedDB-backed store for notebook metadata.
 * Handles CRUD operations for notebook entries (not their content).
 */

import { createStore, get, set, del, entries } from "idb-keyval";
import { STORAGE_KEYS, NOTEBOOK_COLORS } from "../app_constants";

const notebookStore = createStore(
  `${STORAGE_KEYS.IDB_NOTEBOOKS}-db`,
  `${STORAGE_KEYS.IDB_NOTEBOOKS}-store`,
);

export interface NotebookMeta {
  id: string;
  name: string;
  icon: string;
  color: string;
  gradient: string;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
  githubPath: string;
  githubSha?: string;
}

const generateId = (): string => {
  return `nb_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

export const notebookStoreAPI = {
  async getAllNotebooks(): Promise<NotebookMeta[]> {
    const all = await entries<string, NotebookMeta>(notebookStore);
    return all
      .map(([, meta]) => meta)
      .filter((m) => !m.deletedAt)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },

  async getDeletedNotebooks(): Promise<NotebookMeta[]> {
    const all = await entries<string, NotebookMeta>(notebookStore);
    return all
      .map(([, meta]) => meta)
      .filter((m) => !!m.deletedAt)
      .sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));
  },

  async getNotebook(id: string): Promise<NotebookMeta | undefined> {
    return get<NotebookMeta>(id, notebookStore);
  },

  async createNotebook(
    name: string,
    colorIndex: number = 0,
    icon: string = "📓",
  ): Promise<NotebookMeta> {
    const id = generateId();
    const colorObj =
      NOTEBOOK_COLORS[colorIndex % NOTEBOOK_COLORS.length];
    const now = Date.now();

    const meta: NotebookMeta = {
      id,
      name,
      icon,
      color: colorObj.value,
      gradient: colorObj.gradient,
      createdAt: now,
      updatedAt: now,
      githubPath: `notebooks/${id}.excalidraw`,
    };

    await set(id, meta, notebookStore);
    return meta;
  },

  async updateNotebook(
    id: string,
    changes: Partial<
      Pick<NotebookMeta, "name" | "icon" | "color" | "gradient" | "githubSha">
    >,
  ): Promise<NotebookMeta | null> {
    const existing = await get<NotebookMeta>(id, notebookStore);
    if (!existing) {
      return null;
    }

    const updated: NotebookMeta = {
      ...existing,
      ...changes,
      updatedAt: Date.now(),
    };

    await set(id, updated, notebookStore);
    return updated;
  },

  async touchNotebook(id: string): Promise<void> {
    const existing = await get<NotebookMeta>(id, notebookStore);
    if (existing) {
      existing.updatedAt = Date.now();
      await set(id, existing, notebookStore);
    }
  },

  async softDeleteNotebook(id: string): Promise<void> {
    const existing = await get<NotebookMeta>(id, notebookStore);
    if (existing) {
      existing.deletedAt = Date.now();
      await set(id, existing, notebookStore);
    }
  },

  async restoreNotebook(id: string): Promise<void> {
    const existing = await get<NotebookMeta>(id, notebookStore);
    if (existing) {
      delete existing.deletedAt;
      existing.updatedAt = Date.now();
      await set(id, existing, notebookStore);
    }
  },

  async permanentlyDeleteNotebook(id: string): Promise<void> {
    await del(id, notebookStore);
  },

  async updateGithubSha(id: string, sha: string): Promise<void> {
    const existing = await get<NotebookMeta>(id, notebookStore);
    if (existing) {
      existing.githubSha = sha;
      await set(id, existing, notebookStore);
    }
  },
};
