import { useState, useEffect } from "react";
import {
  getGitHubToken,
  setGitHubToken,
  testConnection,
  ensureRepoExists,
  getGitHubOwner,
  getGitHubRepo,
} from "../data/githubSync";
import { GITHUB_DEFAULTS } from "../app_constants";

interface GitHubSettingsProps {
  onClose: () => void;
}

export const GitHubSettings = ({ onClose }: GitHubSettingsProps) => {
  const [token, setToken] = useState(getGitHubToken() || "");
  const [status, setStatus] = useState<{
    type: "idle" | "testing" | "success" | "error";
    message: string;
  }>({ type: "idle", message: "" });
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    // Auto-test if token exists
    if (getGitHubToken()) {
      handleTest();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTest = async () => {
    if (!token.trim()) {
      setStatus({ type: "error", message: "Please enter a token" });
      return;
    }

    setStatus({ type: "testing", message: "Testing connection..." });

    // Temporarily save the token for testing
    setGitHubToken(token.trim());

    const result = await testConnection();
    if (result.success) {
      setStatus({
        type: "success",
        message: `✅ ${result.message}`,
      });
    } else {
      setStatus({
        type: "error",
        message: `❌ ${result.message}`,
      });
    }
  };

  const handleSave = async () => {
    if (!token.trim()) {
      setStatus({ type: "error", message: "Please enter a token" });
      return;
    }

    setGitHubToken(token.trim());
    setStatus({ type: "testing", message: "Saving and verifying..." });

    const result = await testConnection();
    if (!result.success) {
      setStatus({ type: "error", message: `❌ ${result.message}` });
      return;
    }

    // Ensure repo exists
    setStatus({
      type: "testing",
      message: `Ensuring repo "${GITHUB_DEFAULTS.REPO}" exists...`,
    });

    try {
      await ensureRepoExists();
      setStatus({
        type: "success",
        message: `✅ Connected as ${result.username}. Repo ready!`,
      });
      // Brief delay so user sees the success message
      setTimeout(onClose, 1500);
    } catch (error: any) {
      setStatus({
        type: "error",
        message: `❌ Repo setup failed: ${error.message}`,
      });
    }
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <h2 className="dialog__title">GitHub Settings</h2>

        {/* Status */}
        {status.type !== "idle" && (
          <div
            className={`github-settings__status github-settings__status--${status.type}`}
          >
            {status.type === "testing" && "⏳ "}
            {status.message}
          </div>
        )}

        {/* Token */}
        <div className="dialog__field">
          <label className="dialog__label" htmlFor="github-token">
            Personal Access Token
          </label>
          <div style={{ position: "relative" }}>
            <input
              id="github-token"
              className="dialog__input"
              type={showToken ? "text" : "password"}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              style={{ paddingRight: "3rem" }}
            />
            <button
              style={{
                position: "absolute",
                right: "8px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                color: "#8b949e",
                cursor: "pointer",
                fontSize: "0.85rem",
              }}
              onClick={() => setShowToken(!showToken)}
            >
              {showToken ? "🙈" : "👁️"}
            </button>
          </div>
          <p
            style={{
              fontSize: "0.75rem",
              color: "#8b949e",
              marginTop: "0.5rem",
            }}
          >
            Needs <strong>repo</strong> scope.{" "}
            <a
              href="https://github.com/settings/tokens/new?scopes=repo&description=Excalidraw+Notebooks"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#58a6ff" }}
            >
              Create one →
            </a>
          </p>
        </div>

        {/* Repo info */}
        <div className="dialog__field">
          <label className="dialog__label">Repository</label>
          <div
            style={{
              padding: "0.6rem 0.85rem",
              background: "#0d1117",
              borderRadius: "8px",
              border: "1px solid #30363d",
              color: "#8b949e",
              fontSize: "0.9rem",
            }}
          >
            {getGitHubOwner()}/{getGitHubRepo()}
          </div>
          <p
            style={{
              fontSize: "0.75rem",
              color: "#8b949e",
              marginTop: "0.5rem",
            }}
          >
            This repo will be auto-created as a private repository if it doesn't
            exist.
          </p>
        </div>

        {/* Actions */}
        <div className="dialog__actions">
          <button className="btn btn--secondary" onClick={handleTest}>
            Test Connection
          </button>
          <button className="btn btn--secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn--primary"
            onClick={handleSave}
            disabled={!token.trim() || status.type === "testing"}
          >
            Save & Connect
          </button>
        </div>
      </div>
    </div>
  );
};
