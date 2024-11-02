/**
 * DragPreview Class
 * Handles the creation and manipulation of drag and resize previews.
 */
export class DragPreview {
  constructor(container) {
    this.container = container;
    this.preview = document.createElement("div");
    this.preview.classList.add("drag-preview");
    this.container.appendChild(this.preview);
  }

  updatePosition(insetInlineStart, insetBlockStart) {
    this.preview.style.insetInlineStart = `${insetInlineStart}px`;
    this.preview.style.insetBlockStart = `${insetBlockStart}px`;
  }

  updateSize(inlineSize, blockSize) {
    this.preview.style.inlineSize = `${inlineSize}px`;
    this.preview.style.blockSize = `${blockSize}px`;
    
    // Ensure box-sizing includes padding and border
    this.preview.style.boxSizing = 'border-box';
  }

  setColor(color) {
    this.preview.style.backgroundColor = color;
  }

  remove() {
    if (this.preview && this.container.contains(this.preview)) {
      this.container.removeChild(this.preview);
    }
  }
}
