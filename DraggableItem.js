import { DragPreview } from './DragPreview.js';

/**
 * DraggableItem Class
 * Represents each draggable and resizable item within the table.
 */
export class DraggableItem {
  constructor(container, manager, row, col, span = 1, content = "New Task", id = null) {
    this.container = container;
    this.manager = manager;
    this.row = row;
    this.col = col;
    this.span = span;
    this.content = content;
    this.id = id || this.generateId(); // Unique identifier

    this.element = document.createElement("div");
    this.element.classList.add("draggable-item");
    this.element.setAttribute('data-id', this.id); // Set data-id for identification
    this.element.innerHTML = `${this.content} <div class="resize-handle"></div>`;
    this.container.appendChild(this.element);

    this.setPosition(row, col, span);
    this.addEventListeners();
    this.manager.registerItem(this);
  }

  // Generates a unique ID for each draggable item
  generateId() {
    return 'item-' + Math.random().toString(36).substr(2, 9);
  }

  // Sets the position and size of the item based on row, column, and span
  setPosition(row, col, span) {
    this.row = row;
    this.col = col;
    this.span = span;

    // Calculate positions based on actual cell dimensions and CSS variables
    const styles = getComputedStyle(this.manager.container);
    const padding = parseInt(styles.getPropertyValue('--padding')) || 5;

    const left = this.manager.cellWidth * col + padding;
    const top = this.manager.headerHeight + this.manager.cellHeight * row + padding;
    const height = this.manager.cellHeight * span - padding * 2;
    const itemWidth = this.manager.itemWidth;

    this.element.style.insetInlineStart = `${left}px`;
    this.element.style.insetBlockStart = `${top}px`;
    this.element.style.blockSize = `${height}px`;
    this.element.style.inlineSize = `${itemWidth}px`;

    this.element.setAttribute("data-row", row);
    this.element.setAttribute("data-col", col);
    this.element.setAttribute("data-span", span);
  }

  // Adds necessary event listeners for dragging, resizing, and context menu
  addEventListeners() {
    // Dragging
    this.element.addEventListener("pointerdown", (e) => {
      if (e.target.classList.contains("resize-handle")) return; // Ignore resize handle
      if (this.manager.pointerHandler.getActivePointerCount() > 1) return; // Do not initiate drag if multiple pointers are active
      if (this.manager.isDragging || this.manager.isResizing) return; // Prevent if another operation is active
      if (!e.isPrimary) return; // Only handle primary pointer
      e.preventDefault();
      this.manager.dragManager.initiateDrag(this, e);
    });

    // Resizing
    const resizeHandle = this.element.querySelector(".resize-handle");
    resizeHandle.addEventListener("pointerdown", (e) => {
      if (this.manager.pointerHandler.getActivePointerCount() > 1) return; // Do not initiate resize if multiple pointers are active
      if (!e.isPrimary) return; // Only handle primary pointer
      if (this.manager.isDragging || this.manager.isResizing) return; // Prevent if another operation is active
      e.preventDefault();
      e.stopPropagation();
      this.manager.resizeManager.initiateResize(this, e);
    });

    // Enable pointer capture for smoother interactions
    this.element.addEventListener("pointerdown", (e) => {
      if (!e.isPrimary) return; // Only handle primary pointer
      this.element.setPointerCapture(e.pointerId);
    });
    resizeHandle.addEventListener("pointerdown", (e) => {
      if (!e.isPrimary) return; // Only handle primary pointer
      resizeHandle.setPointerCapture(e.pointerId);
    });

    // Context Menu Handling (Right-click and Long-press)
    // Right-click (Desktop)
    this.element.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      this.showContextMenu(e.clientX, e.clientY);
    });

    // Long-press (Touch Devices)
    this.element.addEventListener("pointerdown", (e) => {
      if (e.pointerType === 'touch') {
        this.manager.longPressTimer = setTimeout(() => {
          this.showContextMenu(e.clientX, e.clientY);
        }, this.manager.longPressDuration); // Changed from this.manager.config.LONG_PRESS_DURATION to this.manager.longPressDuration
      }
    });

    this.element.addEventListener("pointerup", (e) => {
      if (e.pointerType === 'touch') {
        clearTimeout(this.manager.longPressTimer);
      }
    });

    this.element.addEventListener("pointermove", (e) => {
      if (e.pointerType === 'touch') {
        clearTimeout(this.manager.longPressTimer);
      }
    });

    this.element.addEventListener("pointercancel", (e) => {
      if (e.pointerType === 'touch') {
        clearTimeout(this.manager.longPressTimer);
      }
    });
  }

  // Displays the context menu at the specified coordinates
  showContextMenu(x, y) {
    this.manager.cancelAll(); // Cancel ongoing operations
    this.manager.contextMenu.show(x, y);
    this.manager.currentContextItem = this; // Ensure this is correctly set
  }

  // Updates the content of the item
  updateContent(newContent) {
    this.content = newContent;
    this.element.firstChild.textContent = `${newContent} `;
  }

  // Updates the position and span of the item
  updatePosition(newRow, newCol, newSpan) {
    this.setPosition(newRow, newCol, newSpan);
  }
}
