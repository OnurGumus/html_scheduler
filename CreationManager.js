import { DragPreview } from './DragPreview.js';

/**
 * CreationManager Class
 * Handles the creation of new draggable items.
 */
export class CreationManager {
  constructor(manager) {
    this.manager = manager;
    this.creating = false;
    this.createPreview = null;
    this.createStart = { row: 0, col: 0 };
    this.init();
  }

  init() {
    this.manager.table.tBodies[0].addEventListener("pointerdown", this.handlePointerDown);
    this.manager.table.tBodies[0].addEventListener("pointermove", this.handlePointerMove);
    this.manager.table.tBodies[0].addEventListener("pointerup", this.handlePointerUp);
  }

  handlePointerDown = (e) => {
    if (!e.isPrimary) return;
    if (this.manager.pointerHandler.getActivePointerCount() > 1) return;
    if (this.manager.isDragging || this.manager.isResizing) return;
    const cell = e.target.closest("td");
    if (!cell) return;

    this.startCreation(cell);
    cell.setPointerCapture(e.pointerId);
  };

  handlePointerMove = (e) => {
    if (!this.creating || !this.createPreview) return;
    if (this.manager.pointerHandler.getActivePointerCount() > 1 || this.manager.isDragging || this.manager.isResizing) {
      this.cancelCreation();
      return;
    }
    this.updateCreation(e);
  };

  handlePointerUp = (e) => {
    if (!this.creating || !this.createPreview) return;
    if (!e.isPrimary) return;
    this.finalizeCreation();
  };

  startCreation(cell) {
    this.creating = true;
    this.createStart = this.manager.getCellIndices(cell);

    this.createPreview = new DragPreview(this.manager.container);
    const styles = getComputedStyle(this.manager.container);
    const padding = parseInt(styles.getPropertyValue('--padding')) || 5;
    const left = this.manager.cellWidth * this.createStart.col + padding;
    const top = this.manager.headerHeight + this.manager.cellHeight * this.createStart.row + padding;
    this.createPreview.updatePosition(left, top);
    this.createPreview.updateSize(this.manager.itemWidth, this.manager.itemHeight);
    this.createPreview.setColor(getComputedStyle(this.manager.container).getPropertyValue('--creating-item-background') || 'rgba(76, 175, 80, 0.3)');
  }

  updateCreation(e) {
    const containerRect = this.manager.container.getBoundingClientRect();
    const mouseX = e.clientX - containerRect.left;
    const mouseY = e.clientY - containerRect.top;

    let currentCol = Math.floor(mouseX / this.manager.cellWidth);
    let currentRow = Math.floor((mouseY - this.manager.headerHeight) / this.manager.cellHeight);

    currentCol = Math.max(0, Math.min(currentCol, this.manager.totalCols - 1));
    currentRow = Math.max(0, Math.min(currentRow, this.manager.totalRows - 1));

    const span = currentRow - this.createStart.row + 1;
    // Removed MAX_SPAN
    const clampedSpan = Math.min(Math.max(span, 1), this.manager.totalRows - this.createStart.row);

    const styles = getComputedStyle(this.manager.container);
    const padding = parseInt(styles.getPropertyValue('--padding')) || 5;
    const newHeight = this.manager.cellHeight * clampedSpan - padding * 2;
    this.createPreview.updateSize(this.manager.itemWidth, newHeight);
  }

  finalizeCreation() {
    const previewHeight = parseInt(this.createPreview.preview.style.blockSize);
    let finalSpan = Math.round((previewHeight + parseInt(getComputedStyle(this.manager.container).getPropertyValue('--padding')) * 2) / this.manager.cellHeight);

    finalSpan = Math.max(1, finalSpan);
    finalSpan = Math.min(finalSpan, this.manager.totalRows - this.createStart.row);

    // Check for overlapping before adding
    const { row, col } = this.createStart;
    const span = finalSpan;

    // Check for overlapping items in the desired position
    for (let existingItem of this.manager.items) {
      if (existingItem.col !== col) continue; // Different column
      if (row < existingItem.row + existingItem.span && existingItem.row < row + span) {
        console.error("Overlapping item detected");
        this.cancelCreation();
        return;
      }
    }

    this.manager.addItem(
      row,
      col,
      span,
      "New Task"
    );

    this.createPreview.remove();
    this.createPreview = null;
    this.creating = false;
  }

  cancelCreation() {
    if (this.creating && this.createPreview) {
      this.createPreview.remove();
      this.createPreview = null;
      this.creating = false;
    }
  }
}
