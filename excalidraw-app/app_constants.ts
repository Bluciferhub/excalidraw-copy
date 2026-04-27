// time constants (ms)
export const SAVE_TO_LOCAL_STORAGE_TIMEOUT = 300;
export const INITIAL_SCENE_UPDATE_TIMEOUT = 5000;
export const FILE_UPLOAD_TIMEOUT = 300;
export const LOAD_IMAGES_TIMEOUT = 500;
export const SYNC_FULL_SCENE_INTERVAL_MS = 20000;
export const SYNC_BROWSER_TABS_TIMEOUT = 50;
export const CURSOR_SYNC_TIMEOUT = 33; // ~30fps
export const DELETED_ELEMENT_TIMEOUT = 24 * 60 * 60 * 1000; // 1 day

// should be aligned with MAX_ALLOWED_FILE_BYTES
export const FILE_UPLOAD_MAX_BYTES = 4 * 1024 * 1024; // 4 MiB
// 1 year (https://stackoverflow.com/a/25201898/927631)
export const FILE_CACHE_MAX_AGE_SEC = 31536000;

export const WS_EVENTS = {
  SERVER_VOLATILE: "server-volatile-broadcast",
  SERVER: "server-broadcast",
  USER_FOLLOW_CHANGE: "user-follow",
  USER_FOLLOW_ROOM_CHANGE: "user-follow-room-change",
} as const;

export enum WS_SUBTYPES {
  INVALID_RESPONSE = "INVALID_RESPONSE",
  INIT = "SCENE_INIT",
  UPDATE = "SCENE_UPDATE",
  MOUSE_LOCATION = "MOUSE_LOCATION",
  IDLE_STATUS = "IDLE_STATUS",
  USER_VISIBLE_SCENE_BOUNDS = "USER_VISIBLE_SCENE_BOUNDS",
}

export const FIREBASE_STORAGE_PREFIXES = {
  shareLinkFiles: `/files/shareLinks`,
  collabFiles: `/files/rooms`,
};

export const ROOM_ID_BYTES = 10;

export const STORAGE_KEYS = {
  LOCAL_STORAGE_ELEMENTS: "excalidraw",
  LOCAL_STORAGE_APP_STATE: "excalidraw-state",
  LOCAL_STORAGE_COLLAB: "excalidraw-collab",
  LOCAL_STORAGE_THEME: "excalidraw-theme",
  LOCAL_STORAGE_DEBUG: "excalidraw-debug",
  VERSION_DATA_STATE: "version-dataState",
  VERSION_FILES: "version-files",

  IDB_LIBRARY: "excalidraw-library",
  IDB_TTD_CHATS: "excalidraw-ttd-chats",

  // Notebook system
  IDB_NOTEBOOKS: "excalidraw-notebooks",
  IDB_NOTEBOOK_CONTENT: "excalidraw-notebook-content",
  GITHUB_PAT: "excalidraw-github-pat",
  GITHUB_REPO: "excalidraw-github-repo",
  GITHUB_OWNER: "excalidraw-github-owner",

  // do not use apart from migrations
  __LEGACY_LOCAL_STORAGE_LIBRARY: "excalidraw-library",
} as const;

export const GITHUB_DEFAULTS = {
  OWNER: "Bluciferhub",
  REPO: "vijay_exaldraw_blob",
  BRANCH: "main",
} as const;

export const NOTEBOOK_COLORS = [
  { name: "Emerald", value: "#10b981", gradient: "linear-gradient(135deg, #10b981, #059669)" },
  { name: "Blue", value: "#3b82f6", gradient: "linear-gradient(135deg, #3b82f6, #2563eb)" },
  { name: "Purple", value: "#8b5cf6", gradient: "linear-gradient(135deg, #8b5cf6, #7c3aed)" },
  { name: "Rose", value: "#f43f5e", gradient: "linear-gradient(135deg, #f43f5e, #e11d48)" },
  { name: "Amber", value: "#f59e0b", gradient: "linear-gradient(135deg, #f59e0b, #d97706)" },
  { name: "Cyan", value: "#06b6d4", gradient: "linear-gradient(135deg, #06b6d4, #0891b2)" },
  { name: "Pink", value: "#ec4899", gradient: "linear-gradient(135deg, #ec4899, #db2777)" },
  { name: "Teal", value: "#14b8a6", gradient: "linear-gradient(135deg, #14b8a6, #0d9488)" },
] as const;

export const COOKIES = {
  AUTH_STATE_COOKIE: "excplus-auth",
} as const;

export const isExcalidrawPlusSignedUser = document.cookie.includes(
  COOKIES.AUTH_STATE_COOKIE,
);
