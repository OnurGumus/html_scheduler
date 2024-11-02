/**
 * PointerHandler Class
 * Manages all pointer-related events and states.
 */
export class PointerHandler {
  constructor(manager) {
    this.manager = manager;
    this.activePointers = new Set();
    this.init();
  }

  init() {
    const shadowDocument = this.manager.container.ownerDocument;

    shadowDocument.addEventListener("pointerdown", this.handlePointerDown);
    shadowDocument.addEventListener("pointerup", this.handlePointerUp);
    shadowDocument.addEventListener("pointercancel", this.handlePointerCancel);
    shadowDocument.addEventListener("pointermove", this.handlePointerMove);
  }

  handlePointerDown = (e) => {
    this.activePointers.add(e.pointerId);
    // Hide context menu if clicking outside
    if (!e.target.closest('.draggable-item')) {
      this.manager.contextMenu.hide();
      this.manager.currentContextItem = null;
    }
  };

  handlePointerUp = (e) => {
    this.activePointers.delete(e.pointerId);
    if (this.activePointers.size > 1) {
      if (this.manager.isDragging || this.manager.isResizing || this.manager.creating) {
        this.manager.cancelAll();
      }
    }
  };

  handlePointerCancel = (e) => {
    this.activePointers.delete(e.pointerId);
    if (this.manager.isDragging || this.manager.isResizing || this.manager.creating) {
      this.manager.cancelAll();
    }
  };

  handlePointerMove = (e) => {
    if (this.manager.creating && this.manager.createPreview) {
      if (this.activePointers.size > 1 || this.manager.isDragging || this.manager.isResizing) {
        this.manager.cancelCreation();
        return;
      }
      this.manager.updateCreationPreview(e);
    }
  };

  getActivePointerCount() {
    return this.activePointers.size;
  }
}
