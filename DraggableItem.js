import { DragPreview } from './DragPreview.js';
// Removed import of activePointers, isDragging, etc.
// import { 
//   activePointers, 
//   isDragging, 
//   isResizing, 
//   currentContextItem, 
//   longPressTimer 
// } from './TableInteractionManager.js'; // Removed import statement

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

    // Calculate positions based on actual cell dimensions
    const left = this.manager.cellWidth * col + this.manager.config.PADDING;
    const top = this.manager.headerHeight + this.manager.cellHeight * row + this.manager.config.PADDING;
    const height = this.manager.cellHeight * span - this.manager.config.PADDING * 2;

    this.element.style.insetInlineStart = `${left}px`;
    this.element.style.insetBlockStart = `${top}px`;
    this.element.style.blockSize = `${height}px`;
    this.element.style.inlineSize = `${this.manager.itemWidth}px`;

    this.element.setAttribute("data-row", row);
    this.element.setAttribute("data-col", col);
    this.element.setAttribute("data-span", span);
  }

  // Adds necessary event listeners for dragging, resizing, and context menu
  addEventListeners() {
    // Dragging
    this.element.addEventListener("pointerdown", (e) => {
      if (e.target.classList.contains("resize-handle")) return; // Ignore resize handle
      if (this.manager.activePointers.size > 1) return; // Do not initiate drag if multiple pointers are active
      if (this.manager.isDragging || this.manager.isResizing) return; // Prevent if another operation is active
      if (!e.isPrimary) return; // Only handle primary pointer
      e.preventDefault();
      this.initiateDrag(e);
    });

    // Resizing
    const resizeHandle = this.element.querySelector(".resize-handle");
    resizeHandle.addEventListener("pointerdown", (e) => {
      if (this.manager.activePointers.size > 1) return; // Do not initiate resize if multiple pointers are active
      if (!e.isPrimary) return; // Only handle primary pointer
      if (this.manager.isDragging || this.manager.isResizing) return; // Prevent if another operation is active
      e.preventDefault();
      e.stopPropagation();
      this.initiateResize(e);
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
        }, this.manager.config.LONG_PRESS_DURATION);
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

  // Initiates the drag process
  initiateDrag(e) {
    if (this.manager.isDragging || this.manager.isResizing) return; // Prevent if another operation is active
    this.manager.isDragging = true;
    this.isDragging = true;
    const rect = this.element.getBoundingClientRect();
    const containerRect = this.container.getBoundingClientRect();
    this.dragOffsetInline = e.clientX - rect.left;
    this.dragOffsetBlock = e.clientY - rect.top;

    // Create drag preview
    this.dragPreview = new DragPreview(this.container);
    this.dragPreview.updatePosition(
      rect.left - containerRect.left,
      rect.top - containerRect.top
    );
    
    // Calculate preview height based on the item's span
    const previewHeight = this.manager.cellHeight * this.span - this.manager.config.PADDING * 2;
    
    this.dragPreview.updateSize(
      this.manager.itemWidth,   // Ensures consistent width
      previewHeight            // Sets height based on span
    );
    this.dragPreview.setColor(this.manager.config.COLORS.dragPreviewBackground);

    // Add event listeners for pointermove and pointerup
    this.element.addEventListener("pointermove", this.handleDragMove);
    this.element.addEventListener("pointerup", this.handleDragEnd);
    this.element.addEventListener("pointercancel", this.handleDragEnd);
  }

  // Handles the movement during dragging
  handleDragMove = (e) => {
    if (!this.isDragging) return;
    if (this.manager.activePointers.size > 1) {
      // Cancel drag if multiple pointers are detected
      this.handleDragEnd();
      return;
    }
    const containerRect = this.container.getBoundingClientRect();
    let insetInlineStart = e.clientX - containerRect.left - this.dragOffsetInline;
    let insetBlockStart = e.clientY - containerRect.top - this.dragOffsetBlock;

    // Constrain within container
    insetInlineStart = Math.max(
      0,
      Math.min(insetInlineStart, this.container.offsetWidth - this.element.offsetWidth)
    );
    insetBlockStart = Math.max(
      this.manager.headerHeight,
      Math.min(insetBlockStart, this.container.offsetHeight - this.element.offsetHeight)
    );

    // Move the drag preview
    this.dragPreview.updatePosition(insetInlineStart, insetBlockStart);
  };

  // Ends the drag process and updates the item's position
  handleDragEnd = (e) => {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.manager.isDragging = false; // Reset the flag

    // Snap to nearest cell
    const left = parseInt(this.dragPreview.preview.style.insetInlineStart);
    const top = parseInt(this.dragPreview.preview.style.insetBlockStart);
    const snappedCol = Math.round(left / this.manager.cellWidth);
    const snappedRow = Math.round((top - this.manager.headerHeight) / this.manager.cellHeight);

    // Ensure within bounds
    const finalCol = Math.min(
      Math.max(snappedCol, 0),
      this.manager.totalCols - 1
    );
    const finalRow = Math.min(
      Math.max(snappedRow, 0),
      this.manager.totalRows - this.span
    );

    // Update position
    this.setPosition(finalRow, finalCol, this.span);

    // Remove drag preview
    this.dragPreview.remove();
    this.dragPreview = null;

    // Remove event listeners
    this.element.removeEventListener("pointermove", this.handleDragMove);
    this.element.removeEventListener("pointerup", this.handleDragEnd);
    this.element.removeEventListener("pointercancel", this.handleDragEnd);

    // Recalculate layout to handle overlaps
    this.manager.recalculateLayout();
  };

  // Initiates the resize process
  initiateResize(e) {
    if (this.manager.isDragging || this.manager.isResizing) return; // Prevent if another operation is active
    this.manager.isResizing = true;
    this.isResizing = true;
    this.resizeStartBlock = e.clientY;
    this.initialSpan = this.span;

    // Create resize preview
    const rect = this.element.getBoundingClientRect();
    const containerRect = this.container.getBoundingClientRect();
    this.resizePreview = new DragPreview(this.container);
    this.resizePreview.updatePosition(
      rect.left - containerRect.left,
      rect.top - containerRect.top
    );
    this.resizePreview.updateSize(
      this.element.offsetWidth,
      this.element.offsetHeight
    );
    this.resizePreview.setColor(this.manager.config.COLORS.dragPreviewBackground);

    // Add event listeners for pointermove and pointerup
    this.element.addEventListener("pointermove", this.handleResizeMove);
    this.element.addEventListener("pointerup", this.handleResizeEnd);
    this.element.addEventListener("pointercancel", this.handleResizeEnd);
  }

  // Handles the movement during resizing
  handleResizeMove = (e) => {
    if (!this.isResizing) return;
    if (this.manager.activePointers.size > 1) {
      // Cancel resize if multiple pointers are detected
      this.handleResizeEnd();
      return;
    }
    let deltaBlock = e.clientY - this.resizeStartBlock;
    let newSpan = this.initialSpan + Math.round(deltaBlock / this.manager.cellHeight);

    newSpan = Math.max(1, newSpan);
    newSpan = Math.min(newSpan, this.manager.totalRows - this.row);

    // Update resize preview size
    const newHeight = this.manager.cellHeight * newSpan - this.manager.config.PADDING * 2;
    this.resizePreview.updateSize(this.element.offsetWidth, newHeight);
  };

  // Ends the resize process and updates the item's span
  handleResizeEnd = (e) => {
    if (!this.isResizing) return;
    this.isResizing = false;
    this.manager.isResizing = false; // Reset the flag

    // Calculate final span
    const previewHeight = parseInt(this.resizePreview.preview.style.blockSize);
    let finalSpan = Math.round((previewHeight + this.manager.config.PADDING * 2) / this.manager.cellHeight);

    finalSpan = Math.max(1, finalSpan);
    finalSpan = Math.min(finalSpan, this.manager.totalRows - this.row);

    // Update span and position
    this.setPosition(this.row, this.col, finalSpan);

    // Remove resize preview
    this.resizePreview.remove();
    this.resizePreview = null;

    // Remove event listeners
    this.element.removeEventListener("pointermove", this.handleResizeMove);
    this.element.removeEventListener("pointerup", this.handleResizeEnd);
    this.element.removeEventListener("pointercancel", this.handleResizeEnd);

    // Recalculate layout to handle overlaps
    this.manager.recalculateLayout();
  };

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
