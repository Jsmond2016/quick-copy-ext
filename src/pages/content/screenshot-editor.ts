import editorStyles from './screenshot-editor.css?inline';

type Tool = 'crop' | 'rectangle' | 'arrow' | 'pen' | 'number' | 'text';
type Point = { x: number; y: number };
type Rect = Point & { width: number; height: number };
type ResizeHandle = 'north-west' | 'north-east' | 'south-west' | 'south-east' | 'from' | 'to';
type Shape =
  | { type: 'rectangle'; color: string; width: number; rect: Rect }
  | { type: 'arrow'; color: string; width: number; from: Point; to: Point }
  | { type: 'pen'; color: string; width: number; points: Point[] }
  | { type: 'number'; color: string; width: number; point: Point; value: number }
  | { type: 'text'; color: string; width: number; point: Point; text: string };

const EDITOR_ID = 'quick-copy-ext-screenshot-editor';
const COLORS = ['#e5484d', '#f76808', '#f5d90a', '#30a46c', '#0091ff', '#11181c', '#ffffff'];
const MIN_LINE_WIDTH = 1;
const MAX_LINE_WIDTH = 12;

function normalizeRect(from: Point, to: Point): Rect {
  return { x: Math.min(from.x, to.x), y: Math.min(from.y, to.y), width: Math.abs(to.x - from.x), height: Math.abs(to.y - from.y) };
}

function cloneShapes(shapes: Shape[]): Shape[] {
  return structuredClone(shapes);
}

function pointDistance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function segmentDistance(point: Point, from: Point, to: Point): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return pointDistance(point, from);
  const ratio = Math.max(0, Math.min(1, ((point.x - from.x) * dx + (point.y - from.y) * dy) / lengthSquared));
  return pointDistance(point, { x: from.x + ratio * dx, y: from.y + ratio * dy });
}

function shapeBounds(shape: Shape): Rect {
  if (shape.type === 'rectangle') return shape.rect;
  if (shape.type === 'arrow') return normalizeRect(shape.from, shape.to);
  if (shape.type === 'number') {
    const radius = 11 + shape.width * 2;
    return { x: shape.point.x - radius, y: shape.point.y - radius, width: radius * 2, height: radius * 2 };
  }
  if (shape.type === 'text') return { x: shape.point.x, y: shape.point.y, width: Math.max(50, shape.text.length * (12 + shape.width * 2)), height: 18 + shape.width * 2 };
  const points = shape.points;
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  return { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(1, Math.max(...xs) - Math.min(...xs)), height: Math.max(1, Math.max(...ys) - Math.min(...ys)) };
}

function isShapeHit(shape: Shape, point: Point): boolean {
  const tolerance = Math.max(7, shape.width * 2 + 3);
  if (shape.type === 'rectangle') {
    const { x, y, width, height } = shape.rect;
    return point.x >= x - tolerance && point.x <= x + width + tolerance
      && point.y >= y - tolerance && point.y <= y + height + tolerance
      && (Math.min(Math.abs(point.x - x), Math.abs(point.x - x - width), Math.abs(point.y - y), Math.abs(point.y - y - height)) <= tolerance);
  }
  if (shape.type === 'arrow') return segmentDistance(point, shape.from, shape.to) <= tolerance || pointDistance(point, shape.to) <= tolerance * 1.8;
  if (shape.type === 'pen') return shape.points.slice(1).some((current, index) => segmentDistance(point, shape.points[index], current) <= tolerance);
  const bounds = shapeBounds(shape);
  return point.x >= bounds.x - tolerance && point.x <= bounds.x + bounds.width + tolerance
    && point.y >= bounds.y - tolerance && point.y <= bounds.y + bounds.height + tolerance;
}

function moveShape(shape: Shape, deltaX: number, deltaY: number): void {
  if (shape.type === 'rectangle') { shape.rect.x += deltaX; shape.rect.y += deltaY; return; }
  if (shape.type === 'arrow') { shape.from.x += deltaX; shape.from.y += deltaY; shape.to.x += deltaX; shape.to.y += deltaY; return; }
  if (shape.type === 'pen') { shape.points.forEach((point) => { point.x += deltaX; point.y += deltaY; }); return; }
  shape.point.x += deltaX; shape.point.y += deltaY;
}

function getResizeHandle(shape: Shape, point: Point, tolerance: number): ResizeHandle | undefined {
  if (shape.type === 'rectangle') {
    const { x, y, width, height } = shape.rect;
    const handles: [ResizeHandle, Point][] = [
      ['north-west', { x, y }], ['north-east', { x: x + width, y }],
      ['south-west', { x, y: y + height }], ['south-east', { x: x + width, y: y + height }],
    ];
    return handles.find(([, handlePoint]) => pointDistance(point, handlePoint) <= tolerance)?.[0];
  }
  if (shape.type === 'arrow') {
    if (pointDistance(point, shape.from) <= tolerance) return 'from';
    if (pointDistance(point, shape.to) <= tolerance) return 'to';
  }
  return undefined;
}

function getOppositeCorner(rect: Rect, handle: ResizeHandle): Point | undefined {
  if (handle === 'north-west') return { x: rect.x + rect.width, y: rect.y + rect.height };
  if (handle === 'north-east') return { x: rect.x, y: rect.y + rect.height };
  if (handle === 'south-west') return { x: rect.x + rect.width, y: rect.y };
  if (handle === 'south-east') return { x: rect.x, y: rect.y };
  return undefined;
}

function drawResizeHandle(ctx: CanvasRenderingContext2D, point: Point, scale: number): void {
  const size = 7 / scale;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 1 / scale;
  ctx.fillRect(point.x - size / 2, point.y - size / 2, size, size);
  ctx.strokeRect(point.x - size / 2, point.y - size / 2, size, size);
}

function drawArrow(ctx: CanvasRenderingContext2D, from: Point, to: Point, width: number): void {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const size = Math.max(8, width * 4);
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(to.x - size * Math.cos(angle - Math.PI / 6), to.y - size * Math.sin(angle - Math.PI / 6));
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(to.x - size * Math.cos(angle + Math.PI / 6), to.y - size * Math.sin(angle + Math.PI / 6));
  ctx.stroke();
}

function drawShape(ctx: CanvasRenderingContext2D, shape: Shape): void {
  ctx.save();
  ctx.strokeStyle = shape.color;
  ctx.fillStyle = shape.color;
  ctx.lineWidth = shape.width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (shape.type === 'rectangle') {
    ctx.strokeRect(shape.rect.x, shape.rect.y, shape.rect.width, shape.rect.height);
  } else if (shape.type === 'arrow') {
    drawArrow(ctx, shape.from, shape.to, shape.width);
  } else if (shape.type === 'pen') {
    if (shape.points.length > 1) {
      ctx.beginPath();
      ctx.moveTo(shape.points[0].x, shape.points[0].y);
      shape.points.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
      ctx.stroke();
    }
  } else if (shape.type === 'number') {
    const radius = 11 + shape.width * 2;
    ctx.beginPath();
    ctx.arc(shape.point.x, shape.point.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 ${Math.round(radius)}px "Segoe UI", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(shape.value), shape.point.x, shape.point.y + 1);
  } else {
    ctx.font = `${12 + shape.width * 2}px "Segoe UI", "PingFang SC", sans-serif`;
    ctx.textBaseline = 'top';
    ctx.fillText(shape.text, shape.point.x, shape.point.y);
  }
  ctx.restore();
}

function drawWatermark(ctx: CanvasRenderingContext2D, width: number, height: number, icon: HTMLImageElement): void {
  const padding = Math.max(8, Math.round(Math.min(width, height) * 0.014));
  const iconSize = Math.min(18, Math.max(12, Math.round(Math.min(width, height) * 0.028)));
  const fontSize = Math.min(13, Math.max(9, Math.round(iconSize * 0.7)));
  ctx.save();
  ctx.globalAlpha = 0.38;
  ctx.font = `600 ${fontSize}px "Segoe UI", "PingFang SC", sans-serif`;
  const text = 'Quick Copy Ext';
  const textWidth = ctx.measureText(text).width;
  const left = Math.max(padding, width - padding - iconSize - 5 - textWidth);
  const top = height - padding - iconSize;
  if (icon.complete && icon.naturalWidth > 0) {
    ctx.drawImage(icon, left, top, iconSize, iconSize);
  }
  ctx.fillStyle = '#11181c';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, left + iconSize + 5, top + iconSize / 2);
  ctx.restore();
}

function dataUrlToPngBlob(imageDataUrl: string): Blob {
  const encoded = imageDataUrl.slice(imageDataUrl.indexOf(',') + 1);
  const bytes = atob(encoded);
  const data = new Uint8Array(bytes.length);
  for (let index = 0; index < bytes.length; index += 1) data[index] = bytes.charCodeAt(index);
  return new Blob([data], { type: 'image/png' });
}

export function openScreenshotEditor(sessionId: string, imageDataUrl: string): void {
  document.getElementById(EDITOR_ID)?.remove();
  const host = document.createElement('div');
  host.id = EDITOR_ID;
  const shadow = host.attachShadow({ mode: 'closed' });
  const style = document.createElement('style');
  style.textContent = editorStyles;
  const root = document.createElement('section');
  root.className = 'root';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-label', '截图标注编辑器');
  const toolbar = document.createElement('div');
  toolbar.className = 'toolbar';
  const stage = document.createElement('div');
  stage.className = 'stage';
  const canvas = document.createElement('canvas');
  stage.append(canvas);
  root.append(toolbar, stage);
  shadow.append(style, root);
  document.documentElement.append(host);

  const image = new Image();
  const watermarkIcon = new Image();
  watermarkIcon.src = chrome.runtime.getURL('icon-32.png');
  let tool: Tool = 'rectangle';
  let color = COLORS[0];
  let lineWidth = 2;
  let crop: Rect;
  let shapes: Shape[] = [];
  let history: { crop: Rect; shapes: Shape[] }[] = [];
  let redo: { crop: Rect; shapes: Shape[] }[] = [];
  let drawing: Point | undefined;
  let draft: Shape | undefined;
  let selectedIndex: number | undefined;
  let moving: { lastPoint: Point; moved: boolean; snapshot: { crop: Rect; shapes: Shape[] } } | undefined;
  let resizing: { anchor?: Point; handle: ResizeHandle; moved: boolean; snapshot: { crop: Rect; shapes: Shape[] } } | undefined;
  let renderScale = 1;
  let copying = false;
  let nextNumber = 1;

  const status = document.createElement('span');
  status.className = 'status';
  const tools = document.createElement('div');
  tools.className = 'group';
  const colors = document.createElement('div');
  colors.className = 'group';
  const widths = document.createElement('div');
  widths.className = 'group';
  const numberGroup = document.createElement('div');
  numberGroup.className = 'group';
  numberGroup.hidden = true;
  const widthLabel = document.createElement('span');
  widthLabel.className = 'control-label';
  widthLabel.textContent = '线宽';
  widths.append(widthLabel);
  const numberLabel = document.createElement('span');
  numberLabel.className = 'control-label';
  numberLabel.textContent = '数字';
  numberGroup.append(numberLabel);
  const spacer = document.createElement('div');
  spacer.className = 'spacer';
  const actions = document.createElement('div');
  actions.className = 'group';
  toolbar.append(tools, colors, widths, numberGroup, status, spacer, actions);

  function button(text: string, title: string, onClick: () => void): HTMLButtonElement {
    const item = document.createElement('button');
    item.type = 'button'; item.textContent = text; item.title = title; item.setAttribute('aria-label', title);
    item.addEventListener('click', onClick); return item;
  }
  const toolButtons = new Map<Tool, HTMLButtonElement>();
  ([['crop', '裁剪'], ['rectangle', '框选'], ['arrow', '箭头'], ['pen', '画笔'], ['number', '数字'], ['text', '文本']] as [Tool, string][]).forEach(([value, label]) => {
    const item = button(label, label, () => { tool = value; updateControls(); }); toolButtons.set(value, item); tools.append(item);
  });
  const colorButtons = new Map<string, HTMLButtonElement>();
  COLORS.forEach((value) => { const item = button('', `颜色 ${value}`, () => setColor(value)); item.className = 'color'; item.style.setProperty('--color', value); colorButtons.set(value, item); colors.append(item); });
  const widthInput = document.createElement('input');
  widthInput.type = 'number';
  widthInput.min = String(MIN_LINE_WIDTH);
  widthInput.max = String(MAX_LINE_WIDTH);
  widthInput.step = '1';
  widthInput.className = 'line-width-input';
  widthInput.title = `线宽（${MIN_LINE_WIDTH}-${MAX_LINE_WIDTH} 像素）`;
  widthInput.setAttribute('aria-label', '线宽');
  widths.append(widthInput);
  const numberInput = document.createElement('input');
  numberInput.type = 'number';
  numberInput.min = '1';
  numberInput.step = '1';
  numberInput.value = String(nextNumber);
  numberInput.className = 'number-input';
  numberInput.title = '下一个数字标注值';
  numberInput.setAttribute('aria-label', '下一个数字标注值');
  numberGroup.append(numberInput);
  const undoButton = button('撤销', '撤销', () => undo());
  const redoButton = button('反撤销', '反撤销', () => redoAction());
  const clearButton = button('清空', '清空全部标注并恢复初始裁剪范围', () => clearEdits());
  const cancelButton = button('取消', '取消截图', () => close()); cancelButton.className = 'cancel';
  const finishButton = button('完成并复制', '完成并复制', () => { void finish(); }); finishButton.className = 'finish';
  actions.append(undoButton, redoButton, clearButton, cancelButton, finishButton);

  function saveHistory(): void { history.push({ crop: { ...crop }, shapes: cloneShapes(shapes) }); if (history.length > 50) history.shift(); redo = []; updateControls(); }
  function undo(): void { const previous = history.pop(); if (!previous) return; redo.push({ crop: { ...crop }, shapes: cloneShapes(shapes) }); crop = previous.crop; shapes = previous.shapes; selectedIndex = undefined; status.textContent = '已撤销，可重做'; render(); updateControls(); }
  function redoAction(): void { const next = redo.pop(); if (!next) return; history.push({ crop: { ...crop }, shapes: cloneShapes(shapes) }); crop = next.crop; shapes = next.shapes; selectedIndex = undefined; status.textContent = '已反撤销'; render(); updateControls(); }
  function clearEdits(): void { if (shapes.length === 0 && crop.x === 0 && crop.y === 0 && crop.width === image.width && crop.height === image.height) return; crop = { x: 0, y: 0, width: image.width, height: image.height }; shapes = []; history = []; redo = []; selectedIndex = undefined; status.textContent = '已清空全部编辑'; render(); updateControls(); }
  function selectedShape(): Shape | undefined { return selectedIndex === undefined ? undefined : shapes[selectedIndex]; }
  function setColor(value: string): void { const selected = selectedShape(); color = value; if (selected && selected.color !== value) { saveHistory(); selected.color = value; render(); } updateControls(); }
  function setLineWidth(value: number): void { const selected = selectedShape(); const nextWidth = Math.max(MIN_LINE_WIDTH, Math.min(MAX_LINE_WIDTH, Math.round(value))); lineWidth = nextWidth; if (selected && selected.width !== nextWidth) { saveHistory(); selected.width = nextWidth; render(); } updateControls(); }
  function setNextNumber(value: number): void { if (!Number.isFinite(value)) return; nextNumber = Math.max(1, Math.round(value)); numberInput.value = String(nextNumber); }
  function deleteSelected(): void { if (selectedIndex === undefined) return; saveHistory(); shapes.splice(selectedIndex, 1); selectedIndex = undefined; status.textContent = '已删除标注'; render(); updateControls(); }
  function updateControls(): void { const selected = selectedShape(); const activeColor = selected?.color ?? color; const activeWidth = selected?.width ?? lineWidth; const isInitial = shapes.length === 0 && crop.x === 0 && crop.y === 0 && crop.width === image.width && crop.height === image.height; toolButtons.forEach((item, value) => item.classList.toggle('active', value === tool)); colorButtons.forEach((item, value) => item.classList.toggle('active', value === activeColor)); widthInput.value = String(activeWidth); numberInput.value = String(nextNumber); numberGroup.hidden = tool !== 'number'; undoButton.disabled = history.length === 0; undoButton.title = history.length === 0 ? '暂无可撤销操作' : '撤销'; redoButton.disabled = redo.length === 0; redoButton.title = redo.length === 0 ? '暂无可反撤销操作' : '反撤销'; clearButton.disabled = isInitial; }
  function point(event: MouseEvent): Point { const rect = canvas.getBoundingClientRect(); return { x: Math.max(0, Math.min(image.width, (event.clientX - rect.left) / renderScale)), y: Math.max(0, Math.min(image.height, (event.clientY - rect.top) / renderScale)) }; }
  function render(): void {
    const maxWidth = Math.max(240, stage.clientWidth - 36); const maxHeight = Math.max(180, stage.clientHeight - 36);
    renderScale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
    canvas.width = Math.max(1, Math.round(image.width * renderScale)); canvas.height = Math.max(1, Math.round(image.height * renderScale));
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height); ctx.save(); ctx.scale(renderScale, renderScale);
    ctx.fillStyle = 'rgba(0,0,0,.48)';
    ctx.fillRect(0, 0, image.width, crop.y);
    ctx.fillRect(0, crop.y, crop.x, crop.height);
    ctx.fillRect(crop.x + crop.width, crop.y, image.width - crop.x - crop.width, crop.height);
    ctx.fillRect(0, crop.y + crop.height, image.width, image.height - crop.y - crop.height);
    [...shapes, ...(draft ? [draft] : [])].forEach((shape) => drawShape(ctx, shape));
    const selected = selectedShape();
    if (selected) {
      const bounds = shapeBounds(selected);
      ctx.save(); ctx.strokeStyle = '#7dd3fc'; ctx.lineWidth = 1 / renderScale; ctx.setLineDash([5 / renderScale, 3 / renderScale]);
      ctx.strokeRect(bounds.x - 4, bounds.y - 4, bounds.width + 8, bounds.height + 8); ctx.restore();
      if (selected.type === 'rectangle') {
        const { x, y, width, height } = selected.rect;
        [{ x, y }, { x: x + width, y }, { x, y: y + height }, { x: x + width, y: y + height }]
          .forEach((handlePoint) => drawResizeHandle(ctx, handlePoint, renderScale));
      } else if (selected.type === 'arrow') {
        drawResizeHandle(ctx, selected.from, renderScale);
        drawResizeHandle(ctx, selected.to, renderScale);
      }
    }
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1 / renderScale; ctx.setLineDash([6 / renderScale, 4 / renderScale]); ctx.strokeRect(crop.x, crop.y, crop.width, crop.height); ctx.restore();
  }
  function close(): void { host.remove(); void chrome.runtime.sendMessage({ type: 'quick-copy/close-screenshot-editor', sessionId }); }
  async function finish(): Promise<void> {
    if (copying || crop.width < 2 || crop.height < 2) return; copying = true; finishButton.disabled = true; status.textContent = '正在复制...';
    const output = document.createElement('canvas'); output.width = Math.round(crop.width); output.height = Math.round(crop.height); const ctx = output.getContext('2d');
    if (!ctx) { status.textContent = '无法生成截图。'; copying = false; finishButton.disabled = false; return; }
    ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height); ctx.save(); ctx.translate(-crop.x, -crop.y); shapes.forEach((shape) => drawShape(ctx, shape)); ctx.restore();
    drawWatermark(ctx, output.width, output.height, watermarkIcon);
    const clipboardWrite = navigator.clipboard.write([
      new ClipboardItem({ 'image/png': dataUrlToPngBlob(output.toDataURL('image/png')) }),
    ]);
    try { await clipboardWrite; status.textContent = '截图已复制'; window.setTimeout(close, 300); } catch (error) { status.textContent = error instanceof Error ? `复制截图失败：${error.message}` : '复制截图失败，请重试。'; copying = false; finishButton.disabled = false; }
  }
  numberInput.addEventListener('change', () => { setNextNumber(Number(numberInput.value)); });
  widthInput.addEventListener('change', () => { setLineWidth(Number(widthInput.value)); });
  canvas.addEventListener('pointerdown', (event) => { const start = point(event); const hitIndex = [...shapes].map((shape, index) => ({ shape, index })).reverse().find(({ shape }) => isShapeHit(shape, start))?.index; if (hitIndex !== undefined) { selectedIndex = hitIndex; const selected = shapes[hitIndex]; const handle = getResizeHandle(selected, start, 9 / renderScale); const snapshot = { crop: { ...crop }, shapes: cloneShapes(shapes) }; if (handle) resizing = { anchor: selected.type === 'rectangle' ? getOppositeCorner(selected.rect, handle) : undefined, handle, moved: false, snapshot }; else moving = { lastPoint: start, moved: false, snapshot }; drawing = undefined; canvas.setPointerCapture(event.pointerId); status.textContent = handle ? '拖动控制点可调整标注' : '已选中标注，可拖动或调颜色和线宽'; render(); updateControls(); return; } selectedIndex = undefined; drawing = start; canvas.setPointerCapture(event.pointerId); if (tool === 'number') { setNextNumber(Number(numberInput.value)); saveHistory(); const value = nextNumber; shapes.push({ type: 'number', color, width: lineWidth, point: start, value }); nextNumber += 1; selectedIndex = shapes.length - 1; drawing = undefined; render(); updateControls(); return; } if (tool === 'text') { const text = window.prompt('输入标注文本'); if (text?.trim()) { saveHistory(); shapes.push({ type: 'text', color, width: lineWidth, point: start, text: text.trim() }); selectedIndex = shapes.length - 1; render(); updateControls(); } drawing = undefined; return; } if (tool === 'pen') draft = { type: 'pen', color, width: lineWidth, points: [start] }; });
  canvas.addEventListener('pointermove', (event) => { const end = point(event); if (resizing && selectedIndex !== undefined) { const selected = shapes[selectedIndex]; if (selected.type === 'rectangle' && resizing.anchor) selected.rect = normalizeRect(resizing.anchor, end); if (selected.type === 'arrow') { if (resizing.handle === 'from') selected.from = end; if (resizing.handle === 'to') selected.to = end; } resizing.moved = true; render(); return; } if (moving && selectedIndex !== undefined) { const deltaX = end.x - moving.lastPoint.x; const deltaY = end.y - moving.lastPoint.y; if (deltaX !== 0 || deltaY !== 0) { moveShape(shapes[selectedIndex], deltaX, deltaY); moving.lastPoint = end; moving.moved = true; render(); } return; } if (!drawing) return; if (tool === 'crop') { draft = undefined; const next = normalizeRect(drawing, end); render(); const ctx = canvas.getContext('2d'); if (ctx) { ctx.save(); ctx.scale(renderScale, renderScale); ctx.strokeStyle = '#7dd3fc'; ctx.lineWidth = 1 / renderScale; ctx.strokeRect(next.x, next.y, next.width, next.height); ctx.restore(); } return; } if (tool === 'rectangle') draft = { type: 'rectangle', color, width: lineWidth, rect: normalizeRect(drawing, end) }; if (tool === 'arrow') draft = { type: 'arrow', color, width: lineWidth, from: drawing, to: end }; if (tool === 'pen' && draft?.type === 'pen') draft.points.push(end); render(); });
  canvas.addEventListener('pointerup', (event) => { if (resizing) { if (resizing.moved) { history.push(resizing.snapshot); redo = []; status.textContent = '已调整标注'; } resizing = undefined; if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId); updateControls(); return; } if (moving) { if (moving.moved) { history.push(moving.snapshot); redo = []; status.textContent = '已移动标注'; } moving = undefined; if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId); updateControls(); return; } if (!drawing) return; const end = point(event); if (tool === 'crop') { const next = normalizeRect(drawing, end); if (next.width > 2 && next.height > 2) { saveHistory(); crop = next; } } else if (draft) { saveHistory(); shapes.push(draft); selectedIndex = shapes.length - 1; } draft = undefined; drawing = undefined; if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId); render(); updateControls(); });
  canvas.addEventListener('dblclick', (event) => { const clickPoint = point(event); const hitIndex = [...shapes].map((shape, index) => ({ shape, index })).reverse().find(({ shape }) => isShapeHit(shape, clickPoint))?.index; if (hitIndex === undefined || shapes[hitIndex].type !== 'text') return; const selected = shapes[hitIndex] as Extract<Shape, { type: 'text' }>; const nextText = window.prompt('编辑标注文本', selected.text); if (!nextText?.trim() || nextText.trim() === selected.text) return; saveHistory(); selected.text = nextText.trim(); selectedIndex = hitIndex; status.textContent = '已更新文本'; render(); updateControls(); });
  canvas.addEventListener('wheel', (event) => { const selected = selectedShape(); if (!selected) return; event.preventDefault(); const nextWidth = selected.width + (event.deltaY < 0 ? 1 : -1); if (nextWidth === selected.width) return; setLineWidth(nextWidth); }, { passive: false });
  window.addEventListener('resize', render); root.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); if (event.key === 'Enter') void finish(); if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); deleteSelected(); } if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); event.shiftKey ? redoAction() : undo(); } if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'y') { event.preventDefault(); redoAction(); } });
  image.onload = () => { crop = { x: 0, y: 0, width: image.width, height: image.height }; updateControls(); render(); root.tabIndex = -1; root.focus(); };
  image.onerror = () => { status.textContent = '截图数据加载失败。'; };
  image.src = imageDataUrl;
}

export function closeScreenshotEditor(sessionId: string): void {
  const host = document.getElementById(EDITOR_ID); if (!host) return;
  host.remove(); void sessionId;
}
