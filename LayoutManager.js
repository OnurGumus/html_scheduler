
/**
 * LayoutManager Class
 * Manages layout recalculations to prevent overlapping items and ensure proper positioning.
 */
export class LayoutManager {
  constructor(manager) {
    this.manager = manager;
  }

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

  resetLayout() {
    this.manager.items.forEach(item => {
      item.element.style.inlineSize = `${this.manager.itemWidth}px`;
      const left = this.manager.cellWidth * item.col + this.manager.config.PADDING;
      item.element.style.insetInlineStart = `${left}px`;
    });
  }

  assignLayout(items, col) {
    const numItems = items.length;
    if (numItems === 0) return;

    const cellWidth = this.manager.cellWidth;
    const padding = this.manager.config.PADDING;
    const margin = this.manager.config.MARGIN;
    const availableWidth = cellWidth - 2 * padding - margin * (numItems - 1);
    const itemWidth = availableWidth / numItems;

    items.forEach((item, index) => {
      const left = cellWidth * col + padding + (itemWidth + margin) * index;
      item.element.style.inlineSize = `${itemWidth}px`;
      item.element.style.insetInlineStart = `${left}px`;
    });
  }
}
