export interface TableContext {
  table: HTMLTableElement;
  cell: HTMLTableCellElement;
  row: HTMLTableRowElement;
  rowIndex: number;
  colIndex: number;
}

export function getTableContext(node: Node | null): TableContext | null {
  if (!node) return null;
  const el = node instanceof Element ? node : node.parentElement;
  if (!el) return null;

  const cell = el.closest("td, th") as HTMLTableCellElement | null;
  if (!cell) return null;

  const table = cell.closest("table") as HTMLTableElement | null;
  if (!table) return null;

  const row = cell.parentElement as HTMLTableRowElement;
  if (!row) return null;

  return {
    table,
    cell,
    row,
    rowIndex: row.rowIndex,
    colIndex: cell.cellIndex,
  };
}

export function focusTableCell(cell: HTMLTableCellElement | null | undefined) {
  if (!cell) return;
  const range = document.createRange();
  range.selectNodeContents(cell);
  range.collapse(true);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}

function columnCount(table: HTMLTableElement): number {
  let max = 0;
  for (const row of table.rows) {
    max = Math.max(max, row.cells.length);
  }
  return max || 1;
}

function bodyRowCount(table: HTMLTableElement): number {
  if (table.tBodies.length > 0) {
    return table.tBodies[0].rows.length;
  }
  return table.tHead ? table.rows.length - 1 : table.rows.length;
}

export function addTableRowBelow(ctx: TableContext): void {
  const { table, row } = ctx;
  const cols = columnCount(table);
  const newRow = table.insertRow(row.rowIndex + 1);

  for (let i = 0; i < cols; i++) {
    const cell = newRow.insertCell(i);
    cell.innerHTML = "&nbsp;";
  }

  focusTableCell(newRow.cells[0]);
}

export function addTableRowAbove(ctx: TableContext): void {
  const { table, row } = ctx;
  const cols = columnCount(table);
  const insertAt = row.parentElement?.tagName === "THEAD" ? 1 : row.rowIndex;
  const newRow = table.insertRow(insertAt);

  for (let i = 0; i < cols; i++) {
    const cell = newRow.insertCell(i);
    cell.innerHTML = "&nbsp;";
  }

  focusTableCell(newRow.cells[0]);
}

function insertHeaderCell(row: HTMLTableRowElement, index: number, label: string) {
  const th = document.createElement("th");
  th.textContent = label;
  const ref = row.cells[index] ?? null;
  row.insertBefore(th, ref);
}

function insertBodyCell(row: HTMLTableRowElement, index: number) {
  const td = document.createElement("td");
  td.innerHTML = "&nbsp;";
  const ref = row.cells[index] ?? null;
  row.insertBefore(td, ref);
}

export function addTableColumnRight(ctx: TableContext): void {
  const { table, colIndex } = ctx;
  const insertAt = colIndex + 1;

  for (let i = 0; i < table.rows.length; i++) {
    const row = table.rows[i];
    const isHeader = row.parentElement?.tagName === "THEAD";
    if (isHeader) {
      insertHeaderCell(row, insertAt, `Column ${row.cells.length + 1}`);
    } else {
      insertBodyCell(row, insertAt);
    }
  }

  focusTableCell(table.rows[ctx.rowIndex]?.cells[insertAt]);
}

export function addTableColumnLeft(ctx: TableContext): void {
  const { table, colIndex } = ctx;
  const insertAt = colIndex;

  for (let i = 0; i < table.rows.length; i++) {
    const row = table.rows[i];
    const isHeader = row.parentElement?.tagName === "THEAD";
    if (isHeader) {
      insertHeaderCell(row, insertAt, `Column ${row.cells.length + 1}`);
    } else {
      insertBodyCell(row, insertAt);
    }
  }

  focusTableCell(table.rows[ctx.rowIndex]?.cells[insertAt]);
}

export function deleteTableRow(ctx: TableContext): boolean {
  const { table, row } = ctx;
  if (row.parentElement?.tagName === "THEAD") return false;
  if (bodyRowCount(table) <= 1) return false;

  const focusRow = table.rows[row.rowIndex + 1] ?? table.rows[row.rowIndex - 1];
  const focusCell = focusRow?.cells[ctx.colIndex] ?? focusRow?.cells[0];
  row.remove();
  focusTableCell(focusCell);
  return true;
}

export function deleteTableColumn(ctx: TableContext): boolean {
  const { table, colIndex } = ctx;
  if (columnCount(table) <= 1) return false;

  for (const row of table.rows) {
    row.cells[colIndex]?.remove();
  }

  const focusCol = Math.min(colIndex, columnCount(table) - 1);
  focusTableCell(table.rows[ctx.rowIndex]?.cells[focusCol]);
  return true;
}

export function canDeleteTableRow(ctx: TableContext): boolean {
  return ctx.row.parentElement?.tagName !== "THEAD" && bodyRowCount(ctx.table) > 1;
}

export function canDeleteTableColumn(ctx: TableContext): boolean {
  return columnCount(ctx.table) > 1;
}

export function buildTableMarkdown(columns: number, rows: number): string {
  const cols = Math.max(1, Math.min(columns, 10));
  const bodyRows = Math.max(1, Math.min(rows, 20));

  const headerRow = `| ${Array.from({ length: cols }, (_, i) => `Column ${i + 1}`).join(" | ")} |`;
  const sepRow = `| ${Array.from({ length: cols }, () => "---").join(" | ")} |`;
  const body = Array.from({ length: bodyRows }, () =>
    `| ${Array.from({ length: cols }, () => "").join(" | ")} |`,
  ).join("\n");

  return `\n\n${headerRow}\n${sepRow}\n${body}\n\n`;
}

export function buildTableHtml(columns: number, rows: number): string {
  const cols = Math.max(1, Math.min(columns, 10));
  const bodyRows = Math.max(1, Math.min(rows, 20));

  const headers = Array.from({ length: cols }, (_, i) => `<th>Column ${i + 1}</th>`).join("");
  const body = Array.from({ length: bodyRows }, () => {
    const cells = Array.from({ length: cols }, () => "<td>&nbsp;</td>").join("");
    return `<tr>${cells}</tr>`;
  }).join("");

  return (
    `<div class="notion-table-wrap">` +
    `<table class="notion-table"><thead><tr>${headers}</tr></thead><tbody>${body}</tbody></table>` +
    `</div>`
  );
}

export function insertTableAtSelection(
  editor: HTMLElement,
  columns: number,
  rows: number,
): HTMLTableElement | null {
  const container = document.createElement("div");
  container.innerHTML = buildTableHtml(columns, rows);
  const tableWrap = container.firstElementChild;
  if (!tableWrap) return null;

  const sel = window.getSelection();
  if (sel?.rangeCount) {
    const range = sel.getRangeAt(0);
    if (editor.contains(range.commonAncestorContainer)) {
      range.deleteContents();
      range.insertNode(tableWrap);
    } else {
      editor.appendChild(tableWrap);
    }
  } else {
    editor.appendChild(tableWrap);
  }

  const table = tableWrap.querySelector("table");
  const firstCell = table?.querySelector("tbody td") as HTMLTableCellElement | null;
  focusTableCell(firstCell);
  return table;
}