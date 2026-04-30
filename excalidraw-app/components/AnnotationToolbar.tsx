/**
 * Annotation Toolbar — appears when a text element is selected.
 * Provides:
 *   1. Highlight: changes the text element's background color
 *   2. Add Note: creates a sticky-note rectangle with an arrow
 *      bound to the highlighted text element (tail stays linked)
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  convertToExcalidrawElements,
  CaptureUpdateAction,
} from "@excalidraw/excalidraw";
import { newElementWith } from "@excalidraw/element";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/element/types";

import "./AnnotationToolbar.scss";

const HIGHLIGHT_COLORS = [
  { name: "Yellow", value: "#fff3bf", stroke: "#e8a900" },
  { name: "Green", value: "#b2f2bb", stroke: "#2b8a3e" },
  { name: "Blue", value: "#a5d8ff", stroke: "#1971c2" },
  { name: "Pink", value: "#fcc2d7", stroke: "#c2255c" },
  { name: "Orange", value: "#ffd8a8", stroke: "#e8590c" },
  { name: "Purple", value: "#d0bfff", stroke: "#7048e8" },
];

const TEXT_COLORS = [
  { name: "Black", value: "#1e1e1e" },
  { name: "Red", value: "#e03131" },
  { name: "Blue", value: "#1971c2" },
  { name: "Green", value: "#2b8a3e" },
  { name: "Orange", value: "#e8590c" },
  { name: "Purple", value: "#7048e8" },
];

const CANVAS_BG_COLORS = [
  "#ffffff",
  "#f8f9fa",
  "#f1f3f5",
  "#e9ecef",
  "#fff9db",
  "#fff3bf",
  "#d3f9d8",
  "#b2f2bb",
  "#d0ebff",
  "#a5d8ff",
  "#ffe3e3",
  "#fcc2d7",
  "#e5dbff",
  "#d0bfff",
  "#1e1e1e",
  "#121212",
];

interface AnnotationToolbarProps {
  excalidrawAPI: ExcalidrawImperativeAPI | null;
}

export const AnnotationToolbar = ({ excalidrawAPI }: AnnotationToolbarProps) => {
  const [selectedTextElement, setSelectedTextElement] =
    useState<ExcalidrawElement | null>(null);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showTextColorPicker, setShowTextColorPicker] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 });

  // Watch for selection changes
  useEffect(() => {
    if (!excalidrawAPI) return;

    const interval = setInterval(() => {
      const appState = excalidrawAPI.getAppState();
      const selectedIds = appState.selectedElementIds;
      const selectedKeys = Object.keys(selectedIds).filter(
        (id) => selectedIds[id],
      );

      if (selectedKeys.length === 1) {
        const elements = excalidrawAPI.getSceneElementsIncludingDeleted();
        const el = elements.find((e) => e.id === selectedKeys[0]);
        if (el && el.type === "text" && !el.isDeleted) {
          setSelectedTextElement(el);
          // Position toolbar above the element
          const { scrollX, scrollY, zoom } = appState;
          const x = (el.x + scrollX) * zoom.value + el.width * zoom.value / 2;
          const y = (el.y + scrollY) * zoom.value - 50;
          setToolbarPosition({ x, y });
          return;
        }
      }
      setSelectedTextElement(null);
      setShowHighlightPicker(false);
      setShowTextColorPicker(false);
    }, 300);

    return () => clearInterval(interval);
  }, [excalidrawAPI]);

    const handleHighlight = useCallback(
      (color: (typeof HIGHLIGHT_COLORS)[0]) => {
        if (!excalidrawAPI || !selectedTextElement) return;

        const elements = excalidrawAPI.getSceneElementsIncludingDeleted();
        
        const rectId = `highlight_${selectedTextElement.id}`;
        const groupId = `group_highlight_${selectedTextElement.id}`;
        const padding = 8;
        
        const existingRectIndex = elements.findIndex(e => e.id === rectId);
        
        if (existingRectIndex !== -1) {
          // Highlight already exists, update or delete it
          const updatedElements = elements.map(el => {
             if (el.id === rectId) {
                return newElementWith(el, {
                   backgroundColor: color.value,
                   isDeleted: color.value === "transparent" ? true : el.isDeleted
                });
             }
             return el;
          });
          
          excalidrawAPI.updateScene({
            elements: updatedElements,
            captureUpdate: CaptureUpdateAction.IMMEDIATELY,
          });
        } else if (color.value !== "transparent") {
          // Highlight doesn't exist, create it
          const skeleton = {
            type: "rectangle" as const,
            id: rectId,
            x: selectedTextElement.x - padding,
            y: selectedTextElement.y - padding,
            width: selectedTextElement.width + padding * 2,
            height: selectedTextElement.height + padding * 2,
            backgroundColor: color.value,
            fillStyle: "solid" as const,
            strokeWidth: 0,
            strokeColor: "transparent",
            roughness: 0,
            opacity: 100,
            groupIds: [...(selectedTextElement.groupIds || []), groupId],
          };

          try {
            const newElements = convertToExcalidrawElements([skeleton], { regenerateIds: false });
            
            const updatedExisting = elements.map(el => {
               if (el.id === selectedTextElement.id) {
                  // Only add the group ID if it's not already there
                  const currentGroups = el.groupIds || [];
                  if (!currentGroups.includes(groupId)) {
                    return newElementWith(el, {
                       groupIds: [...currentGroups, groupId]
                    });
                  }
               }
               return el;
            });

            // Insert highlight rectangle BEFORE the text element so it renders behind it
            const textIndex = updatedExisting.findIndex(e => e.id === selectedTextElement.id);
            
            const finalElements = [...updatedExisting];
            if (textIndex !== -1) {
               finalElements.splice(textIndex, 0, newElements[0]);
            } else {
               finalElements.push(newElements[0]);
            }

            excalidrawAPI.updateScene({
              elements: finalElements,
              captureUpdate: CaptureUpdateAction.IMMEDIATELY,
            });
          } catch (error) {
            console.error("Highlight failed", error);
          }
        }
        setShowHighlightPicker(false);
      },
      [excalidrawAPI, selectedTextElement]
    );

    const handleTextColor = useCallback((colorValue: string) => {
        if (!excalidrawAPI || !selectedTextElement) return;

        const elements = excalidrawAPI.getSceneElementsIncludingDeleted();
        const updatedElements = elements.map((el) => {
          if (el.id === selectedTextElement.id) {
            return newElementWith(el, {
              strokeColor: colorValue,
            });
          }
          return el;
        });

        excalidrawAPI.updateScene({
          elements: updatedElements,
          captureUpdate: CaptureUpdateAction.IMMEDIATELY,
        });
        setShowTextColorPicker(false);
    }, [excalidrawAPI, selectedTextElement]);

  const handleAddNote = useCallback(() => {
    if (!excalidrawAPI || !selectedTextElement) return;

    const el = selectedTextElement;
    const existingElements = excalidrawAPI.getSceneElementsIncludingDeleted();

    // Create the annotation elements using Excalidraw's converter
    // This handles arrow bindings correctly
    const noteSkeletons = [
      // Note container (sticky note rectangle)
      {
        type: "rectangle" as const,
        id: `note_${Date.now()}`,
        x: el.x + el.width + 80,
        y: el.y - 30,
        width: 220,
        height: 80,
        backgroundColor: "#fff9db",
        fillStyle: "solid" as const,
        strokeColor: "#e8a900",
        strokeWidth: 1,
        roughness: 0,
        roundness: { type: 3 },
        opacity: 90,
        label: {
          text: "Add explanation…",
          fontSize: 14,
          fontFamily: 2, // Helvetica
          textAlign: "left" as const,
          verticalAlign: "top" as const,
          strokeColor: "#5c4a00",
        },
      },
      // Arrow from note to highlighted text
      {
        type: "arrow" as const,
        id: `arrow_${Date.now()}`,
        x: el.x + el.width + 80,
        y: el.y + 10,
        width: 70,
        height: 0,
        strokeColor: "#e8a900",
        strokeWidth: 2,
        roughness: 0,
        startArrowhead: null,
        endArrowhead: "arrow" as const,
        // Bind start to the note rectangle, end to the selected text
        start: {
          id: `note_${Date.now()}`,
          type: "rectangle" as const,
        },
        end: {
          id: el.id,
        },
      },
    ];

    // Use convertToExcalidrawElements for proper element creation
    // But since it regenerates IDs, we need a different approach
    // We'll create the elements and add them directly

    // Simpler approach: create note + arrow manually using element IDs
    const noteId = `note_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const arrowId = `arrow_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const noteTextId = `notetext_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    const noteX = el.x + el.width + 80;
    const noteY = el.y - 30;

    // Create elements using the skeleton API
    const skeletons: any[] = [
      {
        type: "rectangle",
        id: noteId,
        x: noteX,
        y: noteY,
        width: 220,
        height: 80,
        backgroundColor: "#fff9db",
        fillStyle: "solid",
        strokeColor: "#e8a900",
        strokeWidth: 1,
        roughness: 0,
        roundness: { type: 3 },
        opacity: 90,
        label: {
          text: "Add explanation…",
          fontSize: 14,
          fontFamily: 2,
          textAlign: "left",
          verticalAlign: "top",
          strokeColor: "#5c4a00",
        },
      },
      {
        type: "arrow",
        id: arrowId,
        x: noteX,
        y: noteY + 40,
        strokeColor: "#e8a900",
        strokeWidth: 2,
        roughness: 0,
        startArrowhead: null,
        endArrowhead: "arrow",
        start: { id: noteId },
        end: { id: el.id },
      },
    ];

    try {
      const newElements = convertToExcalidrawElements(skeletons, {
        regenerateIds: false,
      });

      // We need to also update the target text element's boundElements to include the arrow
      const updatedExisting = existingElements.map((existEl) => {
        if (existEl.id === el.id) {
          const existing = existEl.boundElements || [];
          // Find the arrow element we just created
          const arrowEl = newElements.find((e) => e.type === "arrow");
          if (arrowEl) {
            return newElementWith(existEl, {
              boundElements: [
                ...existing,
                { id: arrowEl.id, type: "arrow" as const },
              ],
            });
          }
        }
        return existEl;
      });

      excalidrawAPI.updateScene({
        elements: [...updatedExisting, ...newElements],
        captureUpdate: CaptureUpdateAction.IMMEDIATELY,
      });
    } catch (error) {
      console.error("Failed to create annotation:", error);
    }
  }, [excalidrawAPI, selectedTextElement]);

  if (!selectedTextElement) return null;

  return (
    <div
      className="annotation-toolbar"
      style={{
        left: `${Math.max(10, toolbarPosition.x - 100)}px`,
        top: `${Math.max(10, toolbarPosition.y)}px`,
      }}
    >
      <button
        className="annotation-toolbar__btn annotation-toolbar__btn--highlight"
        onClick={() => {
           setShowHighlightPicker(!showHighlightPicker);
           setShowTextColorPicker(false);
        }}
        title="Highlight text (choose color)"
      >
        <span className="annotation-toolbar__btn-icon">🖍️</span>
        Highlight
      </button>
      <button
        className="annotation-toolbar__btn annotation-toolbar__btn--textcolor"
        onClick={() => {
           setShowTextColorPicker(!showTextColorPicker);
           setShowHighlightPicker(false);
        }}
        title="Change text color (simulates bold/emphasis)"
      >
        <span className="annotation-toolbar__btn-icon">A</span>
        Color
      </button>
      <button
        className="annotation-toolbar__btn annotation-toolbar__btn--note"
        onClick={handleAddNote}
        title="Add explanation note with arrow"
      >
        <span className="annotation-toolbar__btn-icon">💬</span>
        Add Note
      </button>

      {showHighlightPicker && (
        <div className="annotation-toolbar__picker">
          {HIGHLIGHT_COLORS.map((color) => (
            <button
              key={color.name}
              className="annotation-toolbar__color"
              style={{
                background: color.value,
                border: `2px solid ${color.stroke}`,
              }}
              onClick={() => handleHighlight(color)}
              title={color.name}
            />
          ))}
        </div>
      )}

      {showTextColorPicker && (
        <div className="annotation-toolbar__picker">
          {TEXT_COLORS.map((color) => (
            <button
              key={color.name}
              className="annotation-toolbar__color"
              style={{
                background: color.value,
                border: `2px solid rgba(255,255,255,0.2)`,
              }}
              onClick={() => handleTextColor(color.value)}
              title={color.name}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Canvas Background Picker (always visible) ───────────────────────────

interface CanvasBackgroundPickerProps {
  excalidrawAPI: ExcalidrawImperativeAPI | null;
}

export const CanvasBackgroundPicker = ({
  excalidrawAPI,
}: CanvasBackgroundPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentBg, setCurrentBg] = useState("#ffffff");

  useEffect(() => {
    if (!excalidrawAPI) return;
    const interval = setInterval(() => {
      const bg = excalidrawAPI.getAppState().viewBackgroundColor;
      if (bg !== currentBg) {
        setCurrentBg(bg);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [excalidrawAPI, currentBg]);

  const handleColorSelect = useCallback(
    (color: string) => {
      if (!excalidrawAPI) return;
      excalidrawAPI.updateScene({
        appState: { viewBackgroundColor: color },
      });
      setCurrentBg(color);
      setIsOpen(false);
    },
    [excalidrawAPI],
  );

  if (!excalidrawAPI) return null;

  return (
    <div className="canvas-bg-picker">
      <button
        className="canvas-bg-picker__trigger"
        onClick={() => setIsOpen(!isOpen)}
        title="Canvas background color"
      >
        <span
          className="canvas-bg-picker__swatch"
          style={{ backgroundColor: currentBg }}
        />
        <span className="canvas-bg-picker__label">BG</span>
      </button>

      {isOpen && (
        <>
          <div
            className="canvas-bg-picker__backdrop"
            onClick={() => setIsOpen(false)}
          />
          <div className="canvas-bg-picker__dropdown">
            <div className="canvas-bg-picker__title">Canvas Background</div>
            <div className="canvas-bg-picker__grid">
              {CANVAS_BG_COLORS.map((color) => (
                <button
                  key={color}
                  className={`canvas-bg-picker__color ${
                    currentBg === color ? "canvas-bg-picker__color--active" : ""
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => handleColorSelect(color)}
                  title={color}
                />
              ))}
            </div>
            <div className="canvas-bg-picker__custom">
              <label className="canvas-bg-picker__custom-label">Custom:</label>
              <input
                type="color"
                value={currentBg}
                onChange={(e) => handleColorSelect(e.target.value)}
                className="canvas-bg-picker__custom-input"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};
