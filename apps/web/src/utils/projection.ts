export type Point = { x: number; y: number };
type Mat3 = [number, number, number, number, number, number, number, number, number];

export const WORLD_WIDTH = 1000;
export const WORLD_HEIGHT = 1600;

export const VIEW_WIDTH = 820;
export const VIEW_HEIGHT = 720;

export const TOP_Y = 72;
export const BOTTOM_Y = 598;
export const TABLE_FRONT_Y = 646;

export const TOP_WIDTH = 260;
export const BOTTOM_WIDTH = 640;
export const CENTER_X = VIEW_WIDTH / 2;

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

function getProjectiveFromUnitSquareToQuad(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point
): Mat3 {
  const sx = p0.x - p1.x + p2.x - p3.x;
  const sy = p0.y - p1.y + p2.y - p3.y;

  if (Math.abs(sx) < 1e-8 && Math.abs(sy) < 1e-8) {
    return [
      p1.x - p0.x,
      p3.x - p0.x,
      p0.x,
      p1.y - p0.y,
      p3.y - p0.y,
      p0.y,
      0,
      0,
      1,
    ];
  }

  const dx1 = p1.x - p2.x;
  const dx2 = p3.x - p2.x;
  const dy1 = p1.y - p2.y;
  const dy2 = p3.y - p2.y;

  const denominator = dx1 * dy2 - dx2 * dy1;
  const g = (sx * dy2 - sy * dx2) / denominator;
  const h = (dx1 * sy - dy1 * sx) / denominator;

  const a = p1.x - p0.x + g * p1.x;
  const b = p3.x - p0.x + h * p3.x;
  const c = p0.x;

  const d = p1.y - p0.y + g * p1.y;
  const e = p3.y - p0.y + h * p3.y;
  const f = p0.y;

  return [a, b, c, d, e, f, g, h, 1];
}

function invertMat3(m: Mat3): Mat3 {
  const [a, b, c, d, e, f, g, h, i] = m;

  const A = e * i - f * h;
  const B = -(d * i - f * g);
  const C = d * h - e * g;
  const D = -(b * i - c * h);
  const E = a * i - c * g;
  const F = -(a * h - b * g);
  const G = b * f - c * e;
  const H = -(a * f - c * d);
  const I = a * e - b * d;

  const det = a * A + b * B + c * C;

  return [
    A / det,
    D / det,
    G / det,
    B / det,
    E / det,
    H / det,
    C / det,
    F / det,
    I / det,
  ];
}

function applyMat3(m: Mat3, x: number, y: number): Point {
  const [a, b, c, d, e, f, g, h, i] = m;
  const w = g * x + h * y + i;
  return {
    x: (a * x + b * y + c) / w,
    y: (d * x + e * y + f) / w,
  };
}

const quadTopLeft = { x: CENTER_X - TOP_WIDTH / 2, y: TOP_Y };
const quadTopRight = { x: CENTER_X + TOP_WIDTH / 2, y: TOP_Y };
const quadBottomRight = { x: CENTER_X + BOTTOM_WIDTH / 2, y: BOTTOM_Y };
const quadBottomLeft = { x: CENTER_X - BOTTOM_WIDTH / 2, y: BOTTOM_Y };

const worldToScreenMat = getProjectiveFromUnitSquareToQuad(
  quadTopLeft,
  quadTopRight,
  quadBottomRight,
  quadBottomLeft
);

const screenToWorldMat = invertMat3(worldToScreenMat);

export function worldToScreen(worldX: number, worldY: number) {
  const u = worldX / WORLD_WIDTH;
  const v = worldY / WORLD_HEIGHT;
  const p = applyMat3(worldToScreenMat, u, v);
  const scale = 0.42 + (1.12 - 0.42) * v;

  return { x: p.x, y: p.y, scale };
}

export function screenToWorld(clientX: number, clientY: number, rect: DOMRect) {
  const localX = clientX - rect.left;
  const localY = clientY - rect.top;

  const p = applyMat3(screenToWorldMat, localX, localY);

  return {
    worldX: clamp(p.x * WORLD_WIDTH, 0, WORLD_WIDTH),
    worldY: clamp(p.y * WORLD_HEIGHT, 0, WORLD_HEIGHT),
  };
}