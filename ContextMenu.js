/**
 * ContextMenu Class
 * Manages the display and interactions of the context menu.
 */
export class ContextMenu {
  constructor(menuElement) {
    this.menuElement = menuElement;
    this.initialize();
  }

  initialize() {
    // Prevent clicks inside the context menu from propagating
    this.menuElement.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    this.menuElement.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
    });
  }

  /**
   * Initializes context menu action listeners.
   * @param {TableInteractionManager} manager - The interaction manager instance.
   */
  initializeActions(manager) {
    const deleteButton = this.menuElement.querySelector('#delete-item');
    const editButton = this.menuElement.querySelector('#edit-item');

    deleteButton.addEventListener('click', () => {
      if (manager.currentContextItem) {
        manager.removeItem(manager.currentContextItem.id);
        this.hide();
      }
    });

    editButton.addEventListener('click', () => {
      if (manager.currentContextItem) {
        const newContent = prompt("Edit item content:", manager.currentContextItem.content);
        if (newContent !== null && newContent.trim() !== "") {
          manager.editItem(manager.currentContextItem.id, newContent.trim());
        }
        this.hide();
      }
    });

    // Hide context menu when clicking outside
    document.addEventListener('click', () => {
      this.hide();
    });
  }

  show(x, y) {
    if (!this.menuElement.parentElement) {
      console.error("ContextMenu.parentElement is null");
      return;
    }
    const containerRect = this.menuElement.parentElement.getBoundingClientRect();
    
    // Convert global coordinates to container-relative coordinates
    const adjustedX = x - containerRect.left;
    const adjustedY = y - containerRect.top;
    
    // Clamp the position to ensure the context menu stays within the container
    const clampedX = Math.min(Math.max(adjustedX, 0), containerRect.width - this.menuElement.offsetWidth);
    const clampedY = Math.min(Math.max(adjustedY, 0), containerRect.height - this.menuElement.offsetHeight);
    
    this.menuElement.style.left = `${clampedX}px`;
    this.menuElement.style.top = `${clampedY}px`;
    this.menuElement.classList.add('visible');
  }

  hide() {
    this.menuElement.classList.remove('visible');
  }
}
