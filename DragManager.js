import { DragPreview } from './DragPreview.js';

/**
 * DragManager Class
 * Manages dragging operations of draggable items.
 */
export class DragManager {
  constructor(manager) {
    this.manager = manager;
    this.isDragging = false;
    this.currentItem = null;
    this.dragPreview = null;
    this.dragOffset = { inline: 0, block: 0 };
    this.init();
  }

  init() {
    // Event listeners are added in DraggableItem.js
  }

  /**
   * Initiates the drag operation.
   * @param {DraggableItem} item - The item being dragged.
   * @param {PointerEvent} e - The pointer event.
   */
  initiateDrag = (item, e) => {
    if (this.isDragging || this.manager.isResizing) return;
    this.isDragging = true;
    this.manager.isDragging = true;
    this.currentItem = item;

    const rect = item.element.getBoundingClientRect();
    const containerRect = this.manager.container.getBoundingClientRect();
    this.dragOffset.inline = e.clientX - rect.left;
    this.dragOffset.block = e.clientY - rect.top;

    // Retrieve padding and colors from CSS variables instead of CONFIG
    const styles = getComputedStyle(this.manager.container);
    const padding = parseInt(styles.getPropertyValue('--padding')) || 5;
    const draggableColor = styles.getPropertyValue('--draggable-color').trim();

    // Example usage of draggableColor
    this.currentItem.element.style.backgroundColor = draggableColor;

    // Create a drag preview
    this.dragPreview = new DragPreview(this.manager.container);
    this.dragPreview.updatePosition(
      rect.left - containerRect.left,
      rect.top - containerRect.top
    );

    const previewHeight = this.manager.cellHeight * item.span - padding * 2;
    this.dragPreview.updateSize(
      this.manager.itemWidth,
      previewHeight
    );
    this.dragPreview.setColor(styles.getPropertyValue('--drag-preview-background').trim());

    // Add global pointermove and pointerup listeners
    this.globalPointerMove = this.handleDragMove;
    this.globalPointerUp = this.endDrag;

    this.manager.container.ownerDocument.addEventListener('pointermove', this.globalPointerMove);
    this.manager.container.ownerDocument.addEventListener('pointerup', this.globalPointerUp);
    this.manager.container.ownerDocument.addEventListener('pointercancel', this.endDrag);
  }

  /**
   * Handles the pointer move event during dragging.
   * @param {PointerEvent} e - The pointer event.
   */
  handleDragMove = (e) => {
    if (!this.isDragging) return;
    if (this.manager.pointerHandler.getActivePointerCount() > 1) {
      this.endDrag();
      return;
    }

    const containerRect = this.manager.container.getBoundingClientRect();
    let insetInlineStart = e.clientX - containerRect.left - this.dragOffset.inline;
    let insetBlockStart = e.clientY - containerRect.top - this.dragOffset.block;

    insetInlineStart = Math.max(
      0,
      Math.min(insetInlineStart, this.manager.container.offsetWidth - this.currentItem.element.offsetWidth)
    );
    insetBlockStart = Math.max(
      this.manager.headerHeight,
      Math.min(insetBlockStart, this.manager.container.offsetHeight - this.currentItem.element.offsetHeight)
    );

    this.dragPreview.updatePosition(insetInlineStart, insetBlockStart);
  }

  /**
   * Ends the drag operation.
   * @param {PointerEvent} e - The pointer event.
   */
  endDrag = (e) => {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.manager.isDragging = false;

    const left = parseInt(this.dragPreview.preview.style.insetInlineStart);
    const top = parseInt(this.dragPreview.preview.style.insetBlockStart);
    const snappedCol = Math.round(left / this.manager.cellWidth);
    const snappedRow = Math.round((top - this.manager.headerHeight) / this.manager.cellHeight);

    const finalCol = Math.min(
      Math.max(snappedCol, 0),
      this.manager.totalCols - 1
    );
    const finalRow = Math.min(
      Math.max(snappedRow, 0),
      this.manager.totalRows - this.currentItem.span
    );

    this.currentItem.setPosition(finalRow, finalCol, this.currentItem.span);

    this.dragPreview.remove();
    this.dragPreview = null;

    this.currentItem = null;

    // Remove global event listeners
    this.manager.container.ownerDocument.removeEventListener('pointermove', this.globalPointerMove);
    this.manager.container.ownerDocument.removeEventListener('pointerup', this.globalPointerUp);
    this.manager.container.ownerDocument.removeEventListener('pointercancel', this.endDrag);

    // Correctly call recalculateLayout
    this.manager.recalculateLayout();
  }

  /**
   * Apply drag style to the dragged item.
   */
  applyDragStyle() {
    const styles = getComputedStyle(this.manager.container);
    const draggableColor = styles.getPropertyValue('--draggable-color').trim();
    
    // Apply draggable color to the dragged item
    if (this.currentItem) {
      this.currentItem.element.style.backgroundColor = draggableColor;
    }
  }
}
