import { DraggableItem } from './DraggableItem.js';
import { ContextMenu } from './ContextMenu.js';
import { DragPreview } from './DragPreview.js';
import { CONFIG } from './config.js';

/**
 * TableInteractionManager Class
 * Manages all interactions, draggable items, and layout within the table.
 */
export class TableInteractionManager {
  constructor(container, table, contextMenuElement) {
    this.container = container;
    this.table = table;
    this.config = CONFIG;
    this.contextMenu = new ContextMenu(contextMenuElement);
    this.totalRows = this.table.tBodies[0].rows.length;
    this.totalCols = this.table.tHead.rows[0].cells.length;
    this.items = []; // List of all draggable items

    // Properties to track creation state
    this.creating = false;
    this.createPreview = null;
    this.createStart = { row: 0, col: 0 };

    // Fetch actual cell dimensions
    this.cellWidth = this.getCellWidth();
    this.cellHeight = this.getCellHeight();
    this.headerHeight = this.getHeaderHeight();
    this.itemWidth = this.getItemWidth();
    this.itemHeight = this.getItemHeight();

    // Instance properties to track global state
    this.activePointers = new Set();
    this.isDragging = false;
    this.isResizing = false;
    this.currentContextItem = null;
    this.longPressTimer = null;

    this.init();
  }

  /**
   * Fetches the width of the first cell to determine cell width.
   */
  getCellWidth() {
    const firstCell = this.table.tBodies[0].rows[0].cells[0];
    return Math.round(firstCell.getBoundingClientRect().width);
  }

  /**
   * Fetches the height of the first cell to determine cell height.
   */
  getCellHeight() {
    const firstCell = this.table.tBodies[0].rows[0].cells[0];
    return Math.round(firstCell.getBoundingClientRect().height);
  }

  /**
   * Fetches the height of the header row.
   */
  getHeaderHeight() {
    const headerRow = this.table.tHead.rows[0];
    return Math.round(headerRow.getBoundingClientRect().height);
  }

  /**
   * Fetches the default draggable item width.
   */
  getItemWidth() {
    // Calculate itemWidth based on cell width and padding
    return this.cellWidth - this.config.PADDING * 2;
  }

  /**
   * Fetches the default draggable item height.
   */
  getItemHeight() {
    // Calculate itemHeight based on cell height and padding
    return this.cellHeight - this.config.PADDING * 2;
  }

  /**
   * Initializes event listeners and interactions.
   */
  init() {
    const shadowDocument = this.container.ownerDocument;

    // Handle item creation via user interaction
    this.table.tBodies[0].addEventListener("pointerdown", (e) => {
      if (!e.isPrimary) return; // Only handle primary pointer
      if (this.activePointers.size > 1) return; // Do not initiate creation if multiple pointers are active
      if (this.isDragging || this.isResizing) return; // Prevent creation if dragging/resizing is active
      const cell = e.target.closest("td");
      if (!cell) return;

      // Start creating a new item
      this.creating = true;
      this.createStart = this.getCellIndices(cell);

      // Create a preview element
      this.createPreview = new DragPreview(this.container);
      const left = this.cellWidth * this.createStart.col + this.config.PADDING;
      const top = this.headerHeight + this.cellHeight * this.createStart.row + this.config.PADDING;
      this.createPreview.updatePosition(left, top);
      this.createPreview.updateSize(this.itemWidth, this.itemHeight);
      this.createPreview.setColor(this.config.COLORS.creatingItemBackground);

      // Capture the pointer to continue receiving events even if the pointer leaves the target
      cell.setPointerCapture(e.pointerId);
    });

    this.table.tBodies[0].addEventListener("pointermove", (e) => {
      if (!this.creating || !this.createPreview) return;
      if (this.activePointers.size > 1) {
        // Cancel creation if multiple pointers are detected
        this.cancelCreation();
        return;
      }
      if (this.isDragging || this.isResizing) {
        // Cancel creation if dragging/resizing is active
        this.cancelCreation();
        return;
      }
      const containerRect = this.container.getBoundingClientRect();
      const mouseX = e.clientX - containerRect.left;
      const mouseY = e.clientY - containerRect.top;

      let currentCol = Math.floor(mouseX / this.cellWidth);
      let currentRow = Math.floor((mouseY - this.headerHeight) / this.cellHeight);

      // Clamp to table bounds
      currentCol = Math.max(0, Math.min(currentCol, this.totalCols - 1));
      currentRow = Math.max(0, Math.min(currentRow, this.totalRows - 1));

      const span = currentRow - this.createStart.row + 1;
      const clampedSpan = Math.min(Math.max(span, 1), this.config.MAX_SPAN); // Prevent excessive spans

      // Update preview size based on span
      const newHeight = this.cellHeight * clampedSpan - this.config.PADDING * 2;
      this.createPreview.updateSize(this.itemWidth, newHeight);
    });

    this.table.tBodies[0].addEventListener("pointerup", (e) => {
      if (!this.creating || !this.createPreview) return;
      if (!e.isPrimary) return; // Only handle primary pointer
      this.creating = false;

      // Determine final span
      const previewHeight = parseInt(this.createPreview.preview.style.blockSize);
      let finalSpan = Math.round((previewHeight + this.config.PADDING * 2) / this.cellHeight);

      finalSpan = Math.max(1, finalSpan);
      finalSpan = Math.min(finalSpan, this.totalRows - this.createStart.row);

      // Create the draggable item
      this.addItem(
        this.createStart.row,
        this.createStart.col,
        finalSpan,
        "New Task"
      );

      // Remove the preview
      this.createPreview.remove();
      this.createPreview = null;
    });

    // Handle pointer events on the shadow root to track active pointers
    shadowDocument.addEventListener("pointerdown", (e) => {
      this.activePointers.add(e.pointerId);
      // Hide context menu if clicking outside
      if (!e.target.closest('.draggable-item')) {
        this.contextMenu.hide();
        this.currentContextItem = null;
      }
    });

    shadowDocument.addEventListener("pointerup", (e) => {
      this.activePointers.delete(e.pointerId);
      // If a drag, resize, or creation is in progress and multiple pointers are active, cancel the action
      if (this.activePointers.size > 1) {
        if (this.isDragging || this.isResizing || this.creating) {
          this.cancelAll();
        }
      }
    });

    shadowDocument.addEventListener("pointercancel", (e) => {
      this.activePointers.delete(e.pointerId);
      // Similar cancellation logic if needed
      if (this.isDragging || this.isResizing || this.creating) {
        this.cancelAll();
      }
    });

    // Ensure the table listens to pointermove and pointerup events outside the table during creation
    shadowDocument.addEventListener("pointermove", (e) => {
      if (!this.creating || !this.createPreview) return;
      if (this.activePointers.size > 1) {
        // Cancel creation if multiple pointers are detected
        this.cancelCreation();
        return;
      }
      if (this.isDragging || this.isResizing) {
        // Cancel creation if dragging/resizing is active
        this.cancelCreation();
        return;
      }
      const containerRect = this.container.getBoundingClientRect();
      const mouseX = e.clientX - containerRect.left;
      const mouseY = e.clientY - containerRect.top;

      let currentCol = Math.floor(mouseX / this.cellWidth);
      let currentRow = Math.floor((mouseY - this.headerHeight) / this.cellHeight);

      // Clamp to table bounds
      currentCol = Math.max(0, Math.min(currentCol, this.totalCols - 1));
      currentRow = Math.max(0, Math.min(currentRow, this.totalRows - 1));

      const span = currentRow - this.createStart.row + 1;
      const clampedSpan = Math.min(Math.max(span, 1), this.config.MAX_SPAN); // Prevent excessive spans

      // Update preview size based on span
      const newHeight = this.cellHeight * clampedSpan - this.config.PADDING * 2;
      this.createPreview.updateSize(this.itemWidth, newHeight);
    });

    shadowDocument.addEventListener("pointerup", (e) => {
      if (!this.creating || !this.createPreview) return;
      if (!e.isPrimary) return; // Only handle primary pointer
      this.creating = false;

      // Determine final span
      const previewHeight = parseInt(this.createPreview.preview.style.blockSize);
      let finalSpan = Math.round((previewHeight + this.config.PADDING * 2) / this.cellHeight);

      finalSpan = Math.max(1, finalSpan);
      finalSpan = Math.min(finalSpan, this.totalRows - this.createStart.row);

      // Create the draggable item
      this.addItem(
        this.createStart.row,
        this.createStart.col,
        finalSpan,
        "New Task"
      );

      // Remove the preview
      this.createPreview.remove();
      this.createPreview = null;
    });

    // Handle context menu actions
    this.initializeContextMenu();
  }

  /**
   * Initializes the context menu event listeners.
   */
  initializeContextMenu() {
    // Handle Delete action
    const deleteButton = this.contextMenu.menuElement.querySelector('#delete-item');
    deleteButton.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent event from bubbling up
      if (this.currentContextItem) {
        // Remove the item by its ID
        this.removeItem(this.currentContextItem.id);
        // Hide the context menu
        this.contextMenu.hide();
        this.currentContextItem = null;
      }
    });

    // Handle Edit action
    const editButton = this.contextMenu.menuElement.querySelector('#edit-item');
    editButton.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent event from bubbling up
      if (this.currentContextItem) {
        const newContent = prompt("Enter new content:", this.currentContextItem.content);
        if (newContent !== null && newContent.trim() !== "") {
          this.currentContextItem.updateContent(newContent.trim());
        }
        // Hide the context menu
        this.contextMenu.hide();
        this.currentContextItem = null;
      }
    });

    const shadowDocument = this.container.ownerDocument;

    // Hide context menu when pressing the Escape key
    shadowDocument.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.contextMenu.hide();
        this.currentContextItem = null;
      }
    });

    // Hide context menu when clicking outside
    shadowDocument.addEventListener('click', (e) => {
      if (!e.target.closest('.context-menu')) {
        this.contextMenu.hide();
        this.currentContextItem = null;
      }
    });
  }

  /**
   * Adds a new draggable item programmatically.
   * @param {number} row - Starting row index (0-based).
   * @param {number} col - Column index (0-based).
   * @param {number} span - Number of rows the item spans.
   * @param {string} content - Content of the draggable item.
   * @returns {DraggableItem|null} The created draggable item or null if invalid.
   */
  addItem(row, col, span = 1, content = "New Task") {
    // Validate inputs
    if (row < 0 || row >= this.totalRows) {
      console.error("Invalid row index");
      return null;
    }
    if (col < 0 || col >= this.totalCols) {
      console.error("Invalid column index");
      return null;
    }
    if (span < 1 || (row + span) > this.totalRows) {
      console.error("Invalid span");
      return null;
    }

    // Check for overlapping items in the desired position
    for (let existingItem of this.items) {
      if (existingItem.col !== col) continue; // Different column
      if (row < existingItem.row + existingItem.span && existingItem.row < row + span) {
        console.error("Overlapping item detected");
        return null;
      }
    }

    // Create a new DraggableItem instance
    const newItem = new DraggableItem(this.container, this, row, col, span, content);
    return newItem;
  }

  /**
   * Removes a draggable item by its unique ID.
   * @param {string} id - The unique identifier of the item to remove.
   */
  removeItem(id) {
    const itemIndex = this.items.findIndex(item => item.id === id);
    if (itemIndex === -1) {
      console.error("Item not found");
      return;
    }
    const item = this.items[itemIndex];
    // Remove from DOM
    item.element.remove();
    // Remove from items array
    this.items.splice(itemIndex, 1);
    // Recalculate layout
    this.recalculateLayout();
  }

  /**
   * Edits the content of a draggable item by its unique ID.
   * @param {string} id - The unique identifier of the item to edit.
   * @param {string} newContent - The new content for the item.
   */
  editItem(id, newContent) {
    const item = this.items.find(item => item.id === id);
    if (!item) {
      console.error("Item not found");
      return;
    }
    item.updateContent(newContent);
  }

  /**
   * Retrieves data of all draggable items.
   * @returns {Array} An array of objects representing each draggable item's data.
   */
  getData() {
    return this.items.map(item => ({
      id: item.id,
      row: item.row,
      col: item.col,
      span: item.span,
      content: item.content
    }));
  }

  /**
   * Registers a new draggable item.
   * @param {DraggableItem} item - The draggable item to register.
   */
  registerItem(item) {
    this.items.push(item);
    this.recalculateLayout();
  }

  /**
   * Removes all draggable items from the table.
   */
  removeAllItems() {
    this.items.forEach(item => item.element.remove());
    this.items = [];
    this.recalculateLayout();
  }

  /**
   * Gets the row and column indices from a table cell.
   * @param {HTMLElement} cell - The table cell element.
   * @returns {Object} An object containing row and column indices.
   */
  getCellIndices(cell) {
    const rowIndex = cell.parentElement.sectionRowIndex; // Adjusted for shadow DOM
    const colIndex = cell.cellIndex;
    return { row: rowIndex, col: colIndex };
  }

  /**
   * Recalculates the layout to handle overlapping items.
   */
  recalculateLayout() {
    // Reset all items' sizes and positions
    this.items.forEach(item => {
      item.element.style.inlineSize = `${this.itemWidth}px`;
      const left = this.cellWidth * item.col + this.config.PADDING;
      item.element.style.insetInlineStart = `${left}px`;
    });

    // Adjust positions for overlapping items
    for (let col = 0; col < this.totalCols; col++) {
      const itemsInCol = this.items.filter(item => item.col === col);

      // Sort items by starting row
      itemsInCol.sort((a, b) => a.row - b.row);

      // Groups of overlapping items
      let groups = [];

      itemsInCol.forEach(item => {
        let placed = false;

        for (let group of groups) {
          if (item.row < group.endRow) {
            group.items.push(item);
            group.endRow = Math.max(group.endRow, item.row + item.span);
            placed = true;
            break;
          }
        }

        if (!placed) {
          groups.push({
            items: [item],
            endRow: item.row + item.span
          });
        }
      });

      // Assign layout for each group
      groups.forEach(group => {
        this.assignLayout(group.items, col);
      });
    }
  }

  assignLayout(items, col) {
    const numItems = items.length;
    if (numItems === 0) return;

    const cellWidth = this.cellWidth;
    const padding = this.config.PADDING;
    const margin = this.config.MARGIN;
    const availableWidth = cellWidth - 2 * padding - margin * (numItems - 1);
    const itemWidth = availableWidth / numItems;

    items.forEach((item, index) => {
      const left = cellWidth * col + padding + (itemWidth + margin) * index;
      item.element.style.inlineSize = `${itemWidth}px`;
      item.element.style.insetInlineStart = `${left}px`;
    });
  }

  /**
   * Cancels the item creation process.
   */
  cancelCreation() {
    if (this.creating && this.createPreview) {
      this.createPreview.remove();
      this.createPreview = null;
      this.creating = false;
    }
  }

  /**
   * Cancels any ongoing operations like dragging or resizing.
   */
  cancelAll() {
    if (this.isDragging || this.isResizing) {
      // For simplicity, remove all previews and reset flags
      this.items.forEach(item => {
        if (item.dragPreview) {
          item.dragPreview.remove();
          item.dragPreview = null;
          item.isDragging = false;
        }
        if (item.resizePreview) {
          item.resizePreview.remove();
          item.resizePreview = null;
          item.isResizing = false;
        }
      });
      this.isDragging = false;
      this.isResizing = false;
    }
    if (this.createPreview) {
      this.createPreview.remove();
      this.createPreview = null;
      this.creating = false;
    }
    this.contextMenu.hide();
    this.currentContextItem = null;
  }
}
