import { TableInteractionManager } from './TableInteractionManager.js';

/**
 * SchedulerTable Class
 * Custom element representing the scheduler table.
 */
export class SchedulerTable extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });

    // Encapsulated CSS with CSS variables
    const style = document.createElement('style');
    style.textContent = `
      /* CSS Variables for configuration */
      :host {
        --padding: 5px;
        --border-width: 1px;
        --border-radius: 4px;
        --resize-handle-size: 15px;
        --margin: 10px;
        --draggable-color: #4caf50;
        --draggable-text-color: #fff;
        --resize-handle-background: #fff;
        --resize-handle-border: #000;
        --drag-preview-background: rgba(76, 175, 80, 0.5);
        --drag-preview-border-color: #333;
        --creating-item-background: rgba(76, 175, 80, 0.3);
        --context-menu-background: #fff;
        --context-menu-border: #ccc;
        --context-menu-hover: #f0f0f0;
        --context-menu-focus: #e0e0e0;
      }

      .table-container {
        position: relative;
        overflow: hidden;
      }

      table {
        border-collapse: collapse;
        width: 100%;
      }

      th, td {
        border: 1px solid #ccc;
        padding: 0;
        height: 50px;
        width: 100px;
        text-align: center;
      }

      th {
        background-color: #f5f5f5;
      }

      /* Draggable Item Styles */
      .draggable-item {
        position: absolute;
        background-color: var(--draggable-color);
        color: var(--draggable-text-color);
        border-radius: var(--border-radius);
        padding: var(--padding);
        box-sizing: border-box;
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: grab;
        user-select: none;
        touch-action: none;
      }

      .draggable-item:active {
        cursor: grabbing;
      }

      /* Resize Handle Styles */
      .resize-handle {
        width: var(--resize-handle-size);
        height: var(--resize-handle-size);
        background-color: var(--resize-handle-background);
        border: 1px solid var(--resize-handle-border);
        border-radius: 3px; /* Changed from 50% to 3px for a square handle */
        cursor: ns-resize;
        flex-shrink: 0;
        margin-left: 5px;
        position: absolute; /* Ensure it stays at the bottom */
        bottom: 5px;
        right: 5px;
      }

      /* Drag Preview Styles */
      .drag-preview {
        position: absolute;
        background-color: var(--drag-preview-background);
        border: 1px dashed var(--drag-preview-border-color);
        border-radius: var(--border-radius);
        pointer-events: none;
        box-sizing: border-box; /* Ensure box-sizing includes padding and border */
        /* Remove any max-width or width constraints */
      }

      /* Context Menu Styles */
      .context-menu {
        position: absolute;
        background-color: var(--context-menu-background);
        border: 1px solid var(--context-menu-border);
        z-index: 1000;
        display: none;
        flex-direction: column;
        min-width: 100px;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
      }

      .context-menu.visible {
        display: flex;
      }

      .context-menu-item {
        padding: 8px 12px;
        cursor: pointer;
        background: none;
        border: none;
        text-align: left;
        width: 100%;
        box-sizing: border-box;
      }

      .context-menu-item:hover,
      .context-menu-item:focus {
        background-color: var(--context-menu-hover);
      }

      /* Additional Styles */
      /* Add any other necessary styles here */
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
    tableContainer.appendChild(contextMenu);

    // Initialize interaction manager within the shadow DOM
    this.interactionManager = new TableInteractionManager(
      tableContainer,
      table,
      contextMenu
    );

    // Example of programmatically adding an item
    this.interactionManager.addItem(2, 1, 2, "Team Meeting");
  }

  connectedCallback() {
    // Additional setup if necessary
  }

  static get observedAttributes() {
    return ['long-press-duration'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'long-press-duration') {
      this.interactionManager.setLongPressDuration(parseInt(newValue, 10) || 500);
    }
  }

  // ...existing methods...
}

// Define the custom element
customElements.define('scheduler-table', SchedulerTable);
