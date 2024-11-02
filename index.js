// Move helper class definitions above SchedulerTable

/**
 * DragPreview Class
 * Handles the creation and manipulation of drag and resize previews.
 */
class DragPreview {
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

/**
 * ContextMenu Class
 * Manages the display and interactions of the context menu.
 */
class ContextMenu {
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

  show(x, y) {
    this.menuElement.style.left = `${x}px`;
    this.menuElement.style.top = `${y}px`;
    this.menuElement.classList.add('visible');
  }

  hide() {
    this.menuElement.classList.remove('visible');
  }
}

/**
 * DraggableItem Class
 * Represents each draggable and resizable item within the table.
 */
class DraggableItem {
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
      if (activePointers.size > 1) return; // Do not initiate drag if multiple pointers are active
      if (isDragging || isResizing) return; // Prevent if another operation is active
      if (!e.isPrimary) return; // Only handle primary pointer
      e.preventDefault();
      this.initiateDrag(e);
    });

    // Resizing
    const resizeHandle = this.element.querySelector(".resize-handle");
    resizeHandle.addEventListener("pointerdown", (e) => {
      if (activePointers.size > 1) return; // Do not initiate resize if multiple pointers are active
      if (!e.isPrimary) return; // Only handle primary pointer
      if (isDragging || isResizing) return; // Prevent if another operation is active
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
        longPressTimer = setTimeout(() => {
          this.showContextMenu(e.clientX, e.clientY);
        }, this.manager.config.LONG_PRESS_DURATION);
      }
    });

    this.element.addEventListener("pointerup", (e) => {
      if (e.pointerType === 'touch') {
        clearTimeout(longPressTimer);
      }
    });

    this.element.addEventListener("pointermove", (e) => {
      if (e.pointerType === 'touch') {
        clearTimeout(longPressTimer);
      }
    });

    this.element.addEventListener("pointercancel", (e) => {
      if (e.pointerType === 'touch') {
        clearTimeout(longPressTimer);
      }
    });
  }

  // Initiates the drag process
  initiateDrag(e) {
    if (isDragging || isResizing) return; // Prevent if another operation is active
    isDragging = true;
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
    this.dragPreview.updateSize(
      this.element.offsetWidth,
      this.element.offsetHeight
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
    if (activePointers.size > 1) {
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
    isDragging = false; // Reset the global flag

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
    if (isDragging || isResizing) return; // Prevent if another operation is active
    isResizing = true;
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
    if (activePointers.size > 1) {
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
    isResizing = false; // Reset the global flag

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
    currentContextItem = this; // Ensure this is correctly set
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

/**
 * TableInteractionManager Class
 * Manages all interactions, draggable items, and layout within the table.
 */
class TableInteractionManager {
  constructor(container, table, contextMenuElement, config) {
    this.container = container;
    this.table = table;
    this.config = config;
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
    // Assume the initial draggable item has been styled in CSS
    const tempItem = document.createElement('div');
    tempItem.classList.add('draggable-item');
    tempItem.style.visibility = 'hidden';
    tempItem.innerHTML = 'Temp <div class="resize-handle"></div>';
    this.container.appendChild(tempItem);
    const width = Math.round(tempItem.getBoundingClientRect().width);
    this.container.removeChild(tempItem);
    return width;
  }

  /**
   * Fetches the default draggable item height.
   */
  getItemHeight() {
    // Similar to getItemWidth
    const tempItem = document.createElement('div');
    tempItem.classList.add('draggable-item');
    tempItem.style.visibility = 'hidden';
    tempItem.innerHTML = 'Temp <div class="resize-handle"></div>';
    this.container.appendChild(tempItem);
    const height = Math.round(tempItem.getBoundingClientRect().height);
    this.container.removeChild(tempItem);
    return height;
  }

  /**
   * Initializes event listeners and interactions.
   */
  init() {
    const shadowDocument = this.container.ownerDocument;

    // Handle item creation via user interaction
    this.table.tBodies[0].addEventListener("pointerdown", (e) => {
      if (!e.isPrimary) return; // Only handle primary pointer
      if (activePointers.size > 1) return; // Do not initiate creation if multiple pointers are active
      if (isDragging || isResizing) return; // Prevent creation if dragging/resizing is active
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
      if (activePointers.size > 1) {
        // Cancel creation if multiple pointers are detected
        this.cancelCreation();
        return;
      }
      if (isDragging || isResizing) {
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
      activePointers.add(e.pointerId);
      // Hide context menu if clicking outside
      if (!e.target.closest('.draggable-item')) {
        this.contextMenu.hide();
        currentContextItem = null;
      }
    });

    shadowDocument.addEventListener("pointerup", (e) => {
      activePointers.delete(e.pointerId);
      // If a drag, resize, or creation is in progress and multiple pointers are active, cancel the action
      if (activePointers.size > 1) {
        if (isDragging || isResizing || this.creating) {
          this.cancelAll();
        }
      }
    });

    shadowDocument.addEventListener("pointercancel", (e) => {
      activePointers.delete(e.pointerId);
      // Similar cancellation logic if needed
      if (isDragging || isResizing || this.creating) {
        this.cancelAll();
      }
    });

    // Ensure the table listens to pointermove and pointerup events outside the table during creation
    shadowDocument.addEventListener("pointermove", (e) => {
      if (!this.creating || !this.createPreview) return;
      if (activePointers.size > 1) {
        // Cancel creation if multiple pointers are detected
        this.cancelCreation();
        return;
      }
      if (isDragging || isResizing) {
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
      if (currentContextItem) {
        // Remove the item by its ID
        this.removeItem(currentContextItem.id);
        // Hide the context menu
        this.contextMenu.hide();
        currentContextItem = null;
      }
    });

    // Handle Edit action
    const editButton = this.contextMenu.menuElement.querySelector('#edit-item');
    editButton.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent event from bubbling up
      if (currentContextItem) {
        const newContent = prompt("Enter new content:", currentContextItem.content);
        if (newContent !== null && newContent.trim() !== "") {
          this.editItem(currentContextItem.id, newContent.trim());
        }
        // Hide the context menu
        this.contextMenu.hide();
        currentContextItem = null;
      }
    });

    const shadowDocument = this.container.ownerDocument;

    // Hide context menu when pressing the Escape key
    shadowDocument.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.contextMenu.hide();
        currentContextItem = null;
      }
    });

    // Hide context menu when clicking outside
    shadowDocument.addEventListener('click', (e) => {
      if (!e.target.closest('.context-menu')) {
        this.contextMenu.hide();
        currentContextItem = null;
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
          // Check if item overlaps with this group
          let overlaps = group.some(groupItem =>
            !(item.row >= groupItem.row + groupItem.span || item.row + item.span <= groupItem.row)
          );

          if (overlaps) {
            group.push(item);
            placed = true;
            break;
          }
        }

        if (!placed) {
          // Create a new group
          groups.push([item]);
        }
      });

      // Assign layout for each group
      groups.forEach(group => {
        this.assignLayout(group, col);
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
    if (isDragging || isResizing) {
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
      isDragging = false;
      isResizing = false;
    }
    if (this.createPreview) {
      this.createPreview.remove();
      this.createPreview = null;
      this.creating = false;
    }
    this.contextMenu.hide();
    currentContextItem = null;
  }
}

/**
 * Global Variables to Track Active Pointers and Ongoing Operations
 */
let activePointers = new Set();
let isDragging = false;
let isResizing = false;

// Reference to the context menu and the item it's acting upon
let currentContextItem = null;

// Variables for long-press detection
let longPressTimer = null;

// Now define the SchedulerTable custom element
class SchedulerTable extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });

    // Encapsulated Configuration Object
    const CONFIG = {
      // Durations (in milliseconds)
      LONG_PRESS_DURATION: 500,

      // Layout Spacing (in pixels)
      PADDING: 5,
      BORDER_WIDTH: 1,
      BORDER_RADIUS: 4,
      RESIZE_HANDLE_SIZE: 15,
      MARGIN: 10,

      // Colors
      COLORS: {
        draggableColor: '#4caf50',
        draggableTextColor: '#fff',
        resizeHandleBackground: '#fff',
        resizeHandleBorder: '#000',
        dragPreviewBackground: 'rgba(76, 175, 80, 0.5)',
        dragPreviewBorderColor: '#333',
        creatingItemBackground: 'rgba(76, 175, 80, 0.3)',
        contextMenuBackground: '#fff',
        contextMenuBorder: '#ccc',
        contextMenuHover: '#f0f0f0',
        contextMenuFocus: '#e0e0e0',
      },

      // Other Configurations
      MAX_SPAN: 100,
    };

    // Encapsulated CSS
    const style = document.createElement('style');
    style.textContent = `
      /* Styles moved from index.css */

      *, *::before, *::after {
        box-sizing: border-box;
      }

      :host {
        display: block;
        --padding-block: 0.5rem;
        --padding-inline: 0.75rem;
        --padding-inline-start: 0.5rem;
        --border-width: 1px;
        --border-style: solid;
        --border-color: #aaa;
        --border-radius: 0.25rem;
        --cell-width: 10rem;
        --cell-height: 5rem;
        --draggable-width: 9.375rem;
        --draggable-height: 4.375rem;
        --resize-handle-size: 0.9375rem;
        --context-menu-min-width: 6.25rem;
        --background-color: #f0f0f0;
        --draggable-color: ${CONFIG.COLORS.draggableColor};
        --draggable-text-color: ${CONFIG.COLORS.draggableTextColor};
        --resize-handle-bg: ${CONFIG.COLORS.resizeHandleBackground};
        --resize-handle-border-color: ${CONFIG.COLORS.resizeHandleBorder};
        --drag-preview-bg: ${CONFIG.COLORS.dragPreviewBackground};
        --drag-preview-border-color: ${CONFIG.COLORS.dragPreviewBorderColor};
        --creating-item-bg: ${CONFIG.COLORS.creatingItemBackground};
        --context-menu-bg: ${CONFIG.COLORS.contextMenuBackground};
        --context-menu-border: ${CONFIG.COLORS.contextMenuBorder};
        --context-menu-hover: ${CONFIG.COLORS.contextMenuHover};
        --context-menu-focus: ${CONFIG.COLORS.contextMenuFocus};
        --box-shadow: rgba(0, 0, 0, 0.3);
        --context-menu-shadow: rgba(0, 0, 0, 0.2);
        --font-family: Arial, sans-serif;
        --font-size: 1rem;
      }

      .table-container {
        position: relative;
        width: 50rem;
        /* Remove overflow: hidden; */
        /* overflow: hidden; */
        touch-action: pan-x pan-y pinch-zoom;
      }

      table {
        border-collapse: collapse;
        width: 100%;
        table-layout: fixed;
      }

      th, td {
        width: var(--cell-width);
        height: var(--cell-height);
        position: relative;
        vertical-align: top;
        padding: var(--padding-block) var(--padding-inline);
        border: var(--border-width) var(--border-style) var(--border-color);
        touch-action: pan-x pan-y pinch-zoom;
        box-sizing: border-box;
      }

      th {
        background-color: var(--background-color);
        cursor: default;
        text-align: center;
      }

      .draggable-item {
        position: absolute;
        width: var(--draggable-width);
        height: var(--draggable-height);
        display: flex;
        justify-content: space-between;
        align-items: center;
        overflow: hidden;
        touch-action: none;
        z-index: 500;
        padding-inline-start: var(--padding-inline-start);
        background-color: var(--draggable-color);
        color: var(--draggable-text-color);
        border-radius: var(--border-radius);
        box-shadow: 0 0.125rem 0.3125rem var(--box-shadow);
        cursor: grab;
      }

      .draggable-item:active {
        cursor: grabbing;
      }

      .resize-handle {
        width: var(--resize-handle-size);
        height: var(--resize-handle-size);
        position: absolute;
        right: 0;
        bottom: 0;
        background-color: var(--resize-handle-bg);
        border: var(--border-width) var(--border-style) var(--resize-handle-border-color);
        cursor: se-resize;
      }

      .drag-preview {
        position: absolute;
        width: var(--draggable-width);
        height: var(--draggable-height);
        pointer-events: none;
        z-index: 1000;
        background-color: var(--drag-preview-bg);
        border: var(--border-width) dashed var(--drag-preview-border-color);
        border-radius: var(--border-radius);
      }

      .context-menu {
        position: absolute;
        padding: var(--padding-block) var(--padding-inline);
        min-width: var(--context-menu-min-width);
        display: none;
        z-index: 2000;
        pointer-events: auto;
        background-color: var(--context-menu-bg);
        border: var(--border-width) var(--border-style) var(--context-menu-border);
        box-shadow: 0 0.125rem 0.625rem var(--context-menu-shadow);
        border-radius: var(--border-radius);
      }

      .context-menu.visible {
        display: block;
      }

      .context-menu-item {
        padding: var(--padding-block) var(--padding-inline);
        width: 100%;
        background: none;
        border: none;
        text-align: left;
        cursor: pointer;
        font-family: var(--font-family);
        font-size: var(--font-size);
      }

      .context-menu-item:hover {
        background-color: var(--context-menu-hover);
      }

      .context-menu-item:focus {
        outline: none;
        background-color: var(--context-menu-focus);
      }
    `;
    shadow.appendChild(style);

    // Build the table structure
    const tableContainer = document.createElement('div');
    tableContainer.classList.add('table-container');

    const table = document.createElement('table');
    table.id = 'schedule-table';

    // Create table header based on attributes
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const columns = JSON.parse(this.getAttribute('columns') || '[]');
    columns.forEach(col => {
      const th = document.createElement('th');
      th.textContent = col;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Create table body based on attributes
    const tbody = document.createElement('tbody');
    const rows = parseInt(this.getAttribute('rows') || '6', 10);
    for (let i = 0; i < rows; i++) {
      const tr = document.createElement('tr');
      columns.forEach(() => {
        const td = document.createElement('td');
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    tableContainer.appendChild(table);

    // Append elements to shadow DOM
    shadow.appendChild(tableContainer);

    // Add Context Menu inside the web component
    const contextMenu = document.createElement('div');
    contextMenu.classList.add('context-menu');
    contextMenu.innerHTML = `
      <button class="context-menu-item" id="delete-item">Delete</button>
      <button class="context-menu-item" id="edit-item">Edit</button>
    `;
    shadow.appendChild(contextMenu);

    // Initialize interaction manager within the shadow DOM
    this.interactionManager = new TableInteractionManager(
      tableContainer,
      table,
      contextMenu,
      CONFIG
    );

    // Example of programmatically adding an item
    this.interactionManager.addItem(2, 1, 2, "Team Meeting");
  }

  connectedCallback() {
    // Additional setup if necessary
  }

  // ...existing methods...
}

// Define the custom element
customElements.define('scheduler-table', SchedulerTable);