/**
 * Manages saving/loading Excalidraw scene data per notebook.
 * Uses IndexedDB for local cache and GitHub for persistent storage.
 */

import { createStore, get, set, del } from "idb-keyval";
import { STORAGE_KEYS } from "../app_constants";
import {
  debouncedSaveToGitHub,
  loadNotebookFromGitHub,
  isGitHubConfigured,
} from "./githubSync";
import { notebookStoreAPI } from "./notebookStore";

import type { ExcalidrawElement } from "@excalidraw/element/types";
import type { AppState } from "@excalidraw/excalidraw/types";

const contentStore = createStore(
  `${STORAGE_KEYS.IDB_NOTEBOOK_CONTENT}-db`,
  `${STORAGE_KEYS.IDB_NOTEBOOK_CONTENT}-store`,
);

export interface NotebookContent {
  elements: readonly ExcalidrawElement[];
  appState: Partial<AppState>;
  savedAt: number;
}

/**
 * Save notebook content to local IDB cache and trigger async GitHub sync.
 */
export const saveNotebookContent = async (
  notebookId: string,
  elements: readonly ExcalidrawElement[],
  appState: Partial<AppState>,
): Promise<void> => {
  const content: NotebookContent = {
    elements,
    appState: {
      viewBackgroundColor: appState.viewBackgroundColor,
      currentItemFontFamily: appState.currentItemFontFamily,
      currentItemFontSize: appState.currentItemFontSize,
      currentItemStrokeColor: appState.currentItemStrokeColor,
      currentItemBackgroundColor: appState.currentItemBackgroundColor,
      currentItemFillStyle: appState.currentItemFillStyle,
      currentItemStrokeWidth: appState.currentItemStrokeWidth,
      currentItemRoughness: appState.currentItemRoughness,
      currentItemOpacity: appState.currentItemOpacity,
      gridSize: appState.gridSize,
      gridStep: appState.gridStep,
      scrollX: appState.scrollX,
      scrollY: appState.scrollY,
      zoom: appState.zoom,
    },
    savedAt: Date.now(),
  };

  // Save to local IDB
  await set(notebookId, content, contentStore);

  // Update notebook timestamp
  await notebookStoreAPI.touchNotebook(notebookId);

  // Async GitHub sync (debounced)
  if (isGitHubConfigured()) {
    debouncedSaveToGitHub(notebookId, {
      type: "excalidraw",
      version: 2,
      source: "excalidraw-notebooks",
      elements,
      appState: content.appState,
    });
  }
};

/**
 * Load notebook content from local IDB cache, falling back to GitHub.
 */
export const loadNotebookContent = async (
  notebookId: string,
): Promise<NotebookContent | null> => {
  // Try local cache first
  const local = await get<NotebookContent>(notebookId, contentStore);
  if (local) {
    return local;
  }

  // Fallback to GitHub
  if (isGitHubConfigured()) {
    const remote = await loadNotebookFromGitHub(notebookId);
    if (remote && typeof remote === "object") {
      const content: NotebookContent = {
        elements: (remote as any).elements || [],
        appState: (remote as any).appState || {},
        savedAt: Date.now(),
      };
      // Cache locally
      await set(notebookId, content, contentStore);
      return content;
    }
  }

  return null;
};

/**
 * Delete notebook content from local cache.
 */
export const deleteNotebookContent = async (
  notebookId: string,
): Promise<void> => {
  await del(notebookId, contentStore);
};
