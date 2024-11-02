import { DragPreview } from './DragPreview.js';

/**
 * ResizeManager Class
 * Handles resizing of draggable items.
 */
export class ResizeManager {
  constructor(manager) {
    this.manager = manager;
    this.isResizing = false;
    this.currentItem = null;
    this.resizePreview = null;
    this.resizeStartY = 0;
    this.initialSpan = 1;
    this.init();
  }

  init() {
    // No additional initialization required here
  }

  /**
   * Initiates the resize operation.
   * @param {DraggableItem} item - The item being resized.
   * @param {PointerEvent} e - The pointer event.
   */
  initiateResize = (item, e) => {
    if (this.isResizing || this.manager.isDragging) return;
    this.isResizing = true;
    this.manager.isResizing = true;
    this.currentItem = item;
    this.resizeStartY = e.clientY;
    this.initialSpan = item.span;

    const rect = item.element.getBoundingClientRect();
    const containerRect = this.manager.container.getBoundingClientRect();
    this.resizePreview = new DragPreview(this.manager.container);
    this.resizePreview.updatePosition(
      rect.left - containerRect.left,
      rect.top - containerRect.top
    );
    this.resizePreview.updateSize(
      item.element.offsetWidth,
      item.element.offsetHeight
    );
    this.resizePreview.setColor(this.manager.config.COLORS.dragPreviewBackground);

    // Add global pointermove and pointerup listeners
    this.globalPointerMove = this.handleResizeMove;
    this.globalPointerUp = this.endResize;

    this.manager.container.ownerDocument.addEventListener('pointermove', this.globalPointerMove);
    this.manager.container.ownerDocument.addEventListener('pointerup', this.globalPointerUp);
    this.manager.container.ownerDocument.addEventListener('pointercancel', this.endResize);
  }

  /**
   * Handles the pointer move event during resizing.
   * @param {PointerEvent} e - The pointer event.
   */
  handleResizeMove = (e) => {
    if (!this.isResizing) return;
    if (this.manager.pointerHandler.getActivePointerCount() > 1) {
      this.endResize();
      return;
    }

    let deltaY = e.clientY - this.resizeStartY;
    let newSpan = this.initialSpan + Math.round(deltaY / this.manager.cellHeight);

    newSpan = Math.max(1, newSpan);
    newSpan = Math.min(newSpan, this.manager.totalRows - this.currentItem.row);

    const newHeight = this.manager.cellHeight * newSpan - this.manager.config.PADDING * 2;
    this.resizePreview.updateSize(
      this.currentItem.element.offsetWidth,
      newHeight
    );
  }

  /**
   * Ends the resize operation.
   * @param {PointerEvent} e - The pointer event.
   */
  endResize = (e) => {
    if (!this.isResizing) return;
    this.isResizing = false;
    this.manager.isResizing = false;

    const previewHeight = parseInt(this.resizePreview.preview.style.blockSize);
    let finalSpan = Math.round((previewHeight + this.manager.config.PADDING * 2) / this.manager.cellHeight);

    finalSpan = Math.max(1, finalSpan);
    finalSpan = Math.min(finalSpan, this.manager.totalRows - this.currentItem.row);

    this.currentItem.setPosition(this.currentItem.row, this.currentItem.col, finalSpan);

    this.resizePreview.remove();
    this.resizePreview = null;

    this.currentItem = null;

    // Remove global event listeners
    this.manager.container.ownerDocument.removeEventListener('pointermove', this.globalPointerMove);
    this.manager.container.ownerDocument.removeEventListener('pointerup', this.globalPointerUp);
    this.manager.container.ownerDocument.removeEventListener('pointercancel', this.endResize);

    this.manager.layoutManager.recalculateLayout();
  }
}
