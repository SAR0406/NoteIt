export type BrushPreset = 'pen' | 'marker' | 'highlighter' | 'watercolor' | 'brush';
export type ShapeTool = 'freehand' | 'line' | 'rectangle' | 'circle';

export interface DrawingStyle {
  color: string;
  size: number;
  preset: BrushPreset;
}

export const hexToRgba = (hex: string, alpha: number) => {
  const normalized = hex.replace('#', '');
  const isValidHex = /^[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(normalized);
  if (!isValidHex) {
    return `rgba(31, 41, 55, ${alpha})`;
  }
  const value = normalized.length === 3
    ? normalized.split('').map((ch) => `${ch}${ch}`).join('')
    : normalized.padEnd(6, '0').slice(0, 6);
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const applyBrushStyle = (ctx: CanvasRenderingContext2D, style: DrawingStyle) => {
  const { color, size, preset } = style;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = color;
  ctx.lineWidth = size;

  if (preset === 'marker') {
    ctx.lineWidth = size * 1.8;
    ctx.strokeStyle = hexToRgba(color, 0.85);
    return;
  }
  if (preset === 'highlighter') {
    ctx.lineWidth = size * 3.2;
    ctx.strokeStyle = hexToRgba(color, 0.35);
    ctx.globalCompositeOperation = 'multiply';
    return;
  }
  if (preset === 'watercolor') {
    ctx.lineWidth = size * 4;
    ctx.strokeStyle = hexToRgba(color, 0.2);
    ctx.shadowBlur = 10 + size;
    ctx.shadowColor = hexToRgba(color, 0.35);
    return;
  }
  if (preset === 'brush') {
    ctx.lineWidth = size * 2.3;
    ctx.strokeStyle = hexToRgba(color, 0.7);
  }
};

export const drawShape = (
  ctx: CanvasRenderingContext2D,
  start: { x: number; y: number },
  current: { x: number; y: number },
  shapeTool: Exclude<ShapeTool, 'freehand'>,
  style: DrawingStyle
) => {
  applyBrushStyle(ctx, style);
  if (shapeTool === 'line') {
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(current.x, current.y);
    ctx.stroke();
    return;
  }
  if (shapeTool === 'rectangle') {
    const x = Math.min(start.x, current.x);
    const y = Math.min(start.y, current.y);
    const width = Math.abs(current.x - start.x);
    const height = Math.abs(current.y - start.y);
    ctx.strokeRect(x, y, width, height);
    return;
  }
  const radius = Math.hypot(current.x - start.x, current.y - start.y);
  ctx.beginPath();
  ctx.arc(start.x, start.y, radius, 0, Math.PI * 2);
  ctx.stroke();
};
