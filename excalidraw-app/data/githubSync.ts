/**
 * GitHub REST API integration for saving/loading notebooks
 * to the `vijay_exaldraw_blob` repository.
 *
 * Uses the Contents API to store .excalidraw JSON files.
 */

import { GITHUB_DEFAULTS, STORAGE_KEYS } from "../app_constants";
import { notebookStoreAPI } from "./notebookStore";

interface GitHubFileResponse {
  content: string;
  sha: string;
  name: string;
  path: string;
}

interface GitHubCreateRepoResponse {
  full_name: string;
  default_branch: string;
}

// ─── Token Management ────────────────────────────────────────────────────────

export const getGitHubToken = (): string | null => {
  return localStorage.getItem(STORAGE_KEYS.GITHUB_PAT);
};

export const setGitHubToken = (token: string): void => {
  localStorage.setItem(STORAGE_KEYS.GITHUB_PAT, token);
};

export const getGitHubOwner = (): string => {
  return (
    localStorage.getItem(STORAGE_KEYS.GITHUB_OWNER) || GITHUB_DEFAULTS.OWNER
  );
};

export const getGitHubRepo = (): string => {
  return (
    localStorage.getItem(STORAGE_KEYS.GITHUB_REPO) || GITHUB_DEFAULTS.REPO
  );
};

export const isGitHubConfigured = (): boolean => {
  return !!getGitHubToken();
};

// ─── API Helpers ─────────────────────────────────────────────────────────────

const githubFetch = async (
  endpoint: string,
  options: RequestInit = {},
): Promise<Response> => {
  const token = getGitHubToken();
  if (!token) {
    throw new Error("GitHub token not configured");
  }

  const url = endpoint.startsWith("https://")
    ? endpoint
    : `https://api.github.com${endpoint}`;

  return fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...((options.headers as Record<string, string>) || {}),
    },
  });
};

// ─── Repository Management ──────────────────────────────────────────────────

export const checkRepoExists = async (): Promise<boolean> => {
  try {
    const response = await githubFetch(
      `/repos/${getGitHubOwner()}/${getGitHubRepo()}`,
    );
    return response.ok;
  } catch {
    return false;
  }
};

export const createRepo = async (): Promise<GitHubCreateRepoResponse> => {
  const response = await githubFetch(`/user/repos`, {
    method: "POST",
    body: JSON.stringify({
      name: getGitHubRepo(),
      description:
        "Personal Excalidraw notebook storage — auto-managed by Excalidraw app",
      private: true,
      auto_init: true,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to create repository: ${error.message}`);
  }

  return response.json();
};

export const ensureRepoExists = async (): Promise<void> => {
  const exists = await checkRepoExists();
  if (!exists) {
    await createRepo();
    // Give GitHub a moment to initialize the repo
    await new Promise((r) => setTimeout(r, 2000));
  }
};

// ─── Connection Test ────────────────────────────────────────────────────────

export const testConnection = async (): Promise<{
  success: boolean;
  message: string;
  username?: string;
}> => {
  try {
    const token = getGitHubToken();
    if (!token) {
      return { success: false, message: "No GitHub token configured" };
    }

    const response = await githubFetch("/user");
    if (!response.ok) {
      return { success: false, message: "Invalid token or API error" };
    }

    const user = await response.json();
    return {
      success: true,
      message: `Connected as ${user.login}`,
      username: user.login,
    };
  } catch (error: any) {
    return { success: false, message: error.message || "Connection failed" };
  }
};

// ─── File Operations ────────────────────────────────────────────────────────

export const saveNotebookToGitHub = async (
  notebookId: string,
  content: object,
): Promise<{ sha: string } | null> => {
  if (!isGitHubConfigured()) {
    return null;
  }

  try {
    await ensureRepoExists();

    const notebook = await notebookStoreAPI.getNotebook(notebookId);
    if (!notebook) {
      console.warn(`Notebook ${notebookId} not found in store`);
      return null;
    }

    const filePath = notebook.githubPath;
    const fileContent = btoa(
      unescape(encodeURIComponent(JSON.stringify(content, null, 2))),
    );

    // Try to get existing file SHA for updates
    let sha = notebook.githubSha;
    if (!sha) {
      try {
        const existing = await githubFetch(
          `/repos/${getGitHubOwner()}/${getGitHubRepo()}/contents/${filePath}`,
        );
        if (existing.ok) {
          const data: GitHubFileResponse = await existing.json();
          sha = data.sha;
        }
      } catch {
        // File doesn't exist yet, that's fine
      }
    }

    const body: Record<string, string> = {
      message: `Update notebook: ${notebook.name}`,
      content: fileContent,
      branch: GITHUB_DEFAULTS.BRANCH,
    };

    if (sha) {
      body.sha = sha;
    }

    const response = await githubFetch(
      `/repos/${getGitHubOwner()}/${getGitHubRepo()}/contents/${filePath}`,
      {
        method: "PUT",
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      // If conflict (SHA mismatch), refetch SHA and retry once
      if (response.status === 409 || response.status === 422) {
        const refetch = await githubFetch(
          `/repos/${getGitHubOwner()}/${getGitHubRepo()}/contents/${filePath}`,
        );
        if (refetch.ok) {
          const data: GitHubFileResponse = await refetch.json();
          body.sha = data.sha;
          const retry = await githubFetch(
            `/repos/${getGitHubOwner()}/${getGitHubRepo()}/contents/${filePath}`,
            {
              method: "PUT",
              body: JSON.stringify(body),
            },
          );
          if (retry.ok) {
            const retryData = await retry.json();
            const newSha = retryData.content?.sha;
            if (newSha) {
              await notebookStoreAPI.updateGithubSha(notebookId, newSha);
            }
            return { sha: newSha };
          }
        }
      }
      throw new Error(`GitHub save failed: ${error.message}`);
    }

    const result = await response.json();
    const newSha = result.content?.sha;
    if (newSha) {
      await notebookStoreAPI.updateGithubSha(notebookId, newSha);
    }

    return { sha: newSha };
  } catch (error) {
    console.error("Failed to save notebook to GitHub:", error);
    return null;
  }
};

export const loadNotebookFromGitHub = async (
  notebookId: string,
): Promise<object | null> => {
  if (!isGitHubConfigured()) {
    return null;
  }

  try {
    const notebook = await notebookStoreAPI.getNotebook(notebookId);
    if (!notebook) {
      return null;
    }

    const response = await githubFetch(
      `/repos/${getGitHubOwner()}/${getGitHubRepo()}/contents/${notebook.githubPath}`,
    );

    if (!response.ok) {
      if (response.status === 404) {
        return null; // File doesn't exist yet
      }
      throw new Error(`Failed to load from GitHub: ${response.statusText}`);
    }

    const data: GitHubFileResponse = await response.json();

    // Update stored SHA
    await notebookStoreAPI.updateGithubSha(notebookId, data.sha);

    // Decode base64 content
    const decoded = decodeURIComponent(escape(atob(data.content)));
    return JSON.parse(decoded);
  } catch (error) {
    console.error("Failed to load notebook from GitHub:", error);
    return null;
  }
};

export const deleteNotebookFromGitHub = async (
  notebookId: string,
): Promise<boolean> => {
  if (!isGitHubConfigured()) {
    return false;
  }

  try {
    const notebook = await notebookStoreAPI.getNotebook(notebookId);
    if (!notebook) {
      return false;
    }

    // Get current SHA
    let sha = notebook.githubSha;
    if (!sha) {
      const existing = await githubFetch(
        `/repos/${getGitHubOwner()}/${getGitHubRepo()}/contents/${notebook.githubPath}`,
      );
      if (existing.ok) {
        const data: GitHubFileResponse = await existing.json();
        sha = data.sha;
      } else {
        return false; // File doesn't exist
      }
    }

    const response = await githubFetch(
      `/repos/${getGitHubOwner()}/${getGitHubRepo()}/contents/${notebook.githubPath}`,
      {
        method: "DELETE",
        body: JSON.stringify({
          message: `Delete notebook: ${notebook.name}`,
          sha,
          branch: GITHUB_DEFAULTS.BRANCH,
        }),
      },
    );

    return response.ok;
  } catch (error) {
    console.error("Failed to delete notebook from GitHub:", error);
    return false;
  }
};

// ─── Debounced Save ─────────────────────────────────────────────────────────

const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();

export const debouncedSaveToGitHub = (
  notebookId: string,
  content: object,
  delayMs: number = 5000,
): void => {
  const existing = saveTimers.get(notebookId);
  if (existing) {
    clearTimeout(existing);
  }

  const timer = setTimeout(() => {
    saveNotebookToGitHub(notebookId, content);
    saveTimers.delete(notebookId);
  }, delayMs);

  saveTimers.set(notebookId, timer);
};

export const flushGitHubSave = (notebookId: string): void => {
  const existing = saveTimers.get(notebookId);
  if (existing) {
    clearTimeout(existing);
    saveTimers.delete(notebookId);
  }
};
