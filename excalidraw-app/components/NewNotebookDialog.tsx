import { useState } from "react";
import { NOTEBOOK_COLORS } from "../app_constants";

interface NewNotebookDialogProps {
  onClose: () => void;
  onCreate: (name: string, colorIndex: number, icon: string) => void;
  icons: string[];
}

export const NewNotebookDialog = ({
  onClose,
  onCreate,
  icons,
}: NewNotebookDialogProps) => {
  const [name, setName] = useState("");
  const [colorIndex, setColorIndex] = useState(0);
  const [selectedIcon, setSelectedIcon] = useState(icons[0]);

  const handleCreate = () => {
    const trimmed = name.trim();
    if (trimmed) {
      onCreate(trimmed, colorIndex, selectedIcon);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && name.trim()) {
      handleCreate();
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <h2 className="dialog__title">Create New Notebook</h2>

        {/* Name */}
        <div className="dialog__field">
          <label className="dialog__label" htmlFor="notebook-name">
            Name
          </label>
          <input
            id="notebook-name"
            className="dialog__input"
            type="text"
            placeholder="My Notebook"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </div>

        {/* Icon */}
        <div className="dialog__field">
          <label className="dialog__label">Icon</label>
          <div className="icon-picker">
            {icons.map((icon) => (
              <button
                key={icon}
                className={`icon-picker__item ${
                  selectedIcon === icon ? "icon-picker__item--selected" : ""
                }`}
                onClick={() => setSelectedIcon(icon)}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>

        {/* Color */}
        <div className="dialog__field">
          <label className="dialog__label">Accent Color</label>
          <div className="color-picker">
            {NOTEBOOK_COLORS.map((c, i) => (
              <button
                key={c.name}
                className={`color-picker__swatch ${
                  colorIndex === i ? "color-picker__swatch--selected" : ""
                }`}
                style={{ background: c.gradient }}
                onClick={() => setColorIndex(i)}
                title={c.name}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="dialog__actions">
          <button className="btn btn--secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn--primary"
            onClick={handleCreate}
            disabled={!name.trim()}
            id="create-notebook-submit"
          >
            Create Notebook
          </button>
        </div>
      </div>
    </div>
  );
};
