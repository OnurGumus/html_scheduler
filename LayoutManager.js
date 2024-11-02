/**
 * LayoutManager Class
 * Manages the layout of draggable items within the table.
 */
export class LayoutManager {
  constructor(manager) {
    this.manager = manager;
  }

  /**
   * Resets and recalculates the layout of all draggable items.
   */
  resetLayout() {
    // Retrieve padding from CSS variables
    const styles = getComputedStyle(this.manager.container);
    const padding = parseInt(styles.getPropertyValue('--padding')) || 5;

    this.manager.items.forEach(item => {
      // Calculate new positions based on CSS variables
      const left = this.manager.cellWidth * item.col + padding;
      const top = this.manager.headerHeight + this.manager.cellHeight * item.row + padding;
      const height = this.manager.cellHeight * item.span - padding * 2;
      const itemWidth = this.manager.itemWidth;

      item.element.style.insetInlineStart = `${left}px`;
      item.element.style.insetBlockStart = `${top}px`;
      item.element.style.blockSize = `${height}px`;
      item.element.style.inlineSize = `${itemWidth}px`;

      // Update any other properties that previously relied on CONFIG.PADDING
      // Example:
      // this.someProperty = this.manager.config.PADDING * 2;
      // Replace with:
      this.someProperty = padding * 2;

      // If there are other references to CONFIG.PADDING, replace them similarly
      // For example:
      // const margin = this.manager.config.PADDING;
      // Replace with:
      const margin = padding;
      // Use 'margin' as needed in your calculations
    });
  }

  /**
   * Recalculates the layout, typically called after adding or removing items.
   */
  recalculateLayout() {
    this.resetLayout();
    for (let col = 0; col < this.manager.totalCols; col++) {
      const itemsInCol = this.manager.items.filter(item => item.col === col);
      itemsInCol.sort((a, b) => a.row - b.row);

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

      groups.forEach(group => {
        this.assignLayout(group.items, col);
      });
    }
  }

  assignLayout(items, col) {
    const numItems = items.length;
    if (numItems === 0) return;

    const cellWidth = this.manager.cellWidth;
    const styles = getComputedStyle(this.manager.container);
    const padding = parseInt(styles.getPropertyValue('--padding')) || 5;
    const margin = parseInt(styles.getPropertyValue('--margin')) || 5;
    const availableWidth = cellWidth - 2 * padding - margin * (numItems - 1);
    const itemWidth = availableWidth / numItems;

    items.forEach((item, index) => {
      const left = cellWidth * col + padding + (itemWidth + margin) * index;
      item.element.style.inlineSize = `${itemWidth}px`;
      item.element.style.insetInlineStart = `${left}px`;
    });
  }
}
