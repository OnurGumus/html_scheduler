import { ContextMenu } from './ContextMenu.js';
import { CONFIG } from './config.js';
import { PointerHandler } from './PointerHandler.js';
import { CreationManager } from './CreationManager.js';
import { DragManager } from './DragManager.js';
import { ResizeManager } from './ResizeManager.js';
import { LayoutManager } from './LayoutManager.js';
import { DraggableItem } from './DraggableItem.js'; // Added import

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

    // Initialize longPressTimer
    this.longPressTimer = null;

    // Fetch actual cell dimensions
    this.cellWidth = this.getCellWidth();
    this.cellHeight = this.getCellHeight();
    this.headerHeight = this.getHeaderHeight();
    this.itemWidth = this.getItemWidth();
    this.itemHeight = this.getItemHeight();

    // Instance properties to track global state
    this.isDragging = false;
    this.isResizing = false;
    this.currentContextItem = null;

    // Initialize Managers
    this.pointerHandler = new PointerHandler(this);
    this.creationManager = new CreationManager(this);
    this.dragManager = new DragManager(this);
    this.resizeManager = new ResizeManager(this);
    this.layoutManager = new LayoutManager(this);

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
    // Initialize event listeners and interactions via managers
    // PointerHandler and CreationManager are already initialized in their constructors
    // Additional initialization if necessary

    // Initialize context menu actions
    this.contextMenu.initializeActions(this);
  }

  /**
   * Updates the creation preview based on pointer movement.
   * Moved from CreationManager.
   */
  updateCreationPreview(e) {
    this.creationManager.updateCreation(e);
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
    this.layoutManager.recalculateLayout();
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
    this.layoutManager.recalculateLayout();
  }

  /**
   * Removes all draggable items from the table.
   */
  removeAllItems() {
    this.items.forEach(item => item.element.remove());
    this.items = [];
    this.layoutManager.recalculateLayout();
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
    if (this.isDragging) {
      this.dragManager.endDrag();
    }
    if (this.isResizing) {
      this.resizeManager.endResize();
    }
    if (this.creationManager.creating) {
      this.creationManager.cancelCreation();
    }
    this.contextMenu.hide();
    this.currentContextItem = null;
  }

  /**
   * Recalculates the layout by delegating to the layout manager.
   */
  recalculateLayout() {
    this.layoutManager.recalculateLayout();
  }
}
