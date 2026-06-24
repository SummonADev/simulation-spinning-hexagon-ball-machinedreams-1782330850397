import type { SimConfig } from '@/pages/SimulationPage';

export type Vec2 = { x: number; y: number };

export type TrailPoint = { x: number; y: number; age: number };

export type PhysicsState = {
  ball: {
    pos: Vec2;
    vel: Vec2;
    radius: number;
  };
  hexAngle: number;
  trail: TrailPoint[];
  cx: number;
  cy: number;
};

const HEX_RADIUS = 200;
const HEX_SIDES = 6;
const TRAIL_MAX = 60;
const TRAIL_FADE = 0.05; // age increment per frame

function vec2(x: number, y: number): Vec2 {
  return { x, y };
}

function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

function scale(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, y: v.y * s };
}

function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

function length(v: Vec2): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

function normalize(v: Vec2): Vec2 {
  const l = length(v);
  if (l < 1e-10) return { x: 0, y: 0 };
  return { x: v.x / l, y: v.y / l };
}

function perpendicular(v: Vec2): Vec2 {
  return { x: -v.y, y: v.x };
}

function getHexVertices(cx: number, cy: number, radius: number, angle: number): Vec2[] {
  const verts: Vec2[] = [];
  for (let i = 0; i < HEX_SIDES; i++) {
    const a = angle + (i * Math.PI * 2) / HEX_SIDES;
    verts.push(vec2(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius));
  }
  return verts;
}

// Wall velocity at a point on the rotating hexagon
function wallVelocityAtPoint(p: Vec2, cx: number, cy: number, angularVel: number): Vec2 {
  // v = omega x r (in 2D: v = omega * (-ry, rx))
  const rx = p.x - cx;
  const ry = p.y - cy;
  return vec2(-angularVel * ry, angularVel * rx);
}

export function createPhysicsState(cx: number, cy: number): PhysicsState {
  return {
    ball: {
      pos: vec2(cx, cy - 80),
      vel: vec2(60, 0),
      radius: 14,
    },
    hexAngle: 0,
    trail: [],
    cx,
    cy,
  };
}

export function stepPhysics(state: PhysicsState, config: SimConfig, dt: number): void {
  const { ball, cx, cy } = state;

  // Update ball radius from config
  ball.radius = config.ballRadius;

  // Rotate hexagon
  state.hexAngle += config.hexRotationSpeed * dt;

  // Apply gravity
  ball.vel.y += config.gravity * dt;

  // Apply air friction
  ball.vel.x *= config.friction;
  ball.vel.y *= config.friction;

  // Integrate position
  ball.pos.x += ball.vel.x * dt;
  ball.pos.y += ball.vel.y * dt;

  // Resolve collisions with hexagon walls
  const verts = getHexVertices(cx, cy, HEX_RADIUS, state.hexAngle);
  resolveHexCollisions(state, verts, config);

  // Update trail
  if (config.trailEnabled) {
    state.trail.push({ x: ball.pos.x, y: ball.pos.y, age: 0 });
    if (state.trail.length > TRAIL_MAX) state.trail.shift();
  } else {
    state.trail = [];
  }

  // Age trail points
  for (const pt of state.trail) {
    pt.age += TRAIL_FADE;
  }
}

function resolveHexCollisions(
  state: PhysicsState,
  verts: Vec2[],
  config: SimConfig
): void {
  const { ball, cx, cy } = state;
  const r = ball.radius;
  const angularVel = config.hexRotationSpeed;

  for (let i = 0; i < HEX_SIDES; i++) {
    const a = verts[i];
    const b = verts[(i + 1) % HEX_SIDES];

    // Edge vector and normal
    const edge = sub(b, a);
    const edgeLen = length(edge);
    if (edgeLen < 1e-10) continue;

    const edgeDir = scale(edge, 1 / edgeLen);
    // Inward normal (pointing toward center)
    let normal = perpendicular(edgeDir);
    // Check orientation: normal should point toward center
    const midpoint = vec2((a.x + b.x) / 2, (a.y + b.y) / 2);
    const toCenterFromMid = sub(vec2(cx, cy), midpoint);
    if (dot(normal, toCenterFromMid) < 0) {
      normal = scale(normal, -1);
    }

    // Signed distance from ball center to the edge line
    const toA = sub(ball.pos, a);
    const signedDist = dot(toA, normal);

    // Project ball onto edge
    const projT = dot(toA, edgeDir);

    // Only resolve if ball is within edge extents (with some tolerance)
    if (projT < -r || projT > edgeLen + r) continue;

    // The wall is inside: ball should stay on the interior side
    // signedDist < r means ball is too close or past the wall
    if (signedDist < r) {
      const penetration = r - signedDist;

      // Push ball back
      ball.pos.x += normal.x * penetration;
      ball.pos.y += normal.y * penetration;

      // Compute relative velocity (ball vel - wall vel at contact)
      const contactPoint = add(ball.pos, scale(normal, -r));
      const wallVel = wallVelocityAtPoint(contactPoint, cx, cy, angularVel);
      const relVel = sub(ball.vel, wallVel);

      const normalSpeed = dot(relVel, normal);

      if (normalSpeed < 0) {
        // Reflect normal component
        const impulse = -(1 + config.restitution) * normalSpeed;
        ball.vel.x += normal.x * impulse;
        ball.vel.y += normal.y * impulse;

        // Friction on tangential component
        const tangent = edgeDir;
        const tangentSpeed = dot(relVel, tangent);
        const frictionImpulse = -tangentSpeed * (1 - config.friction) * 2;
        ball.vel.x += tangent.x * frictionImpulse;
        ball.vel.y += tangent.y * frictionImpulse;
      }
    }
  }
}

// ---- Rendering ----

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  state: PhysicsState,
  config: SimConfig,
  width: number,
  height: number
): void {
  const { ball, hexAngle, trail, cx, cy } = state;

  // Clear
  ctx.clearRect(0, 0, width, height);

  // Background
  ctx.fillStyle = '#0f0f1a';
  ctx.fillRect(0, 0, width, height);

  // Subtle radial glow in center
  const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, HEX_RADIUS);
  grd.addColorStop(0, 'rgba(99,102,241,0.07)');
  grd.addColorStop(1, 'rgba(99,102,241,0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, width, height);

  // Draw hexagon
  const verts = getHexVertices(cx, cy, HEX_RADIUS, hexAngle);
  drawHexagon(ctx, verts, hexAngle);

  // Draw trail
  if (config.trailEnabled) {
    drawTrail(ctx, trail);
  }

  // Draw ball
  drawBall(ctx, ball.pos, ball.radius, ball.vel);
}

function drawHexagon(ctx: CanvasRenderingContext2D, verts: Vec2[], angle: number): void {
  // Outer glow
  ctx.save();
  ctx.shadowColor = '#818cf8';
  ctx.shadowBlur = 24;

  ctx.beginPath();
  ctx.moveTo(verts[0].x, verts[0].y);
  for (let i = 1; i < verts.length; i++) {
    ctx.lineTo(verts[i].x, verts[i].y);
  }
  ctx.closePath();

  // Stroke with gradient
  const grad = ctx.createLinearGradient(
    verts[0].x, verts[0].y,
    verts[3].x, verts[3].y
  );
  grad.addColorStop(0, '#818cf8');
  grad.addColorStop(0.5, '#6366f1');
  grad.addColorStop(1, '#a78bfa');

  ctx.strokeStyle = grad;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();

  // Draw vertex dots
  for (let i = 0; i < verts.length; i++) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(verts[i].x, verts[i].y, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#a78bfa';
    ctx.shadowColor = '#a78bfa';
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.restore();
  }

  // Draw rotation indicator line
  ctx.save();
  ctx.strokeStyle = 'rgba(165,120,250,0.3)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 6]);
  ctx.beginPath();
  ctx.moveTo(verts[0].x, verts[0].y);
  ctx.lineTo(verts[3].x, verts[3].y);
  ctx.stroke();
  ctx.restore();
}

function drawTrail(ctx: CanvasRenderingContext2D, trail: TrailPoint[]): void {
  for (let i = 0; i < trail.length; i++) {
    const pt = trail[i];
    const alpha = Math.max(0, 1 - pt.age);
    const radius = Math.max(1, (1 - pt.age) * 8);
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(244,63,94,${(alpha * 0.6).toFixed(3)})`;
    ctx.fill();
  }
}

function drawBall(ctx: CanvasRenderingContext2D, pos: Vec2, radius: number, vel: Vec2): void {
  const speed = length(vel);
  const glowIntensity = Math.min(speed / 300, 1);

  ctx.save();
  // Outer glow
  ctx.shadowColor = '#f43f5e';
  ctx.shadowBlur = 16 + glowIntensity * 24;

  // Ball gradient
  const grd = ctx.createRadialGradient(
    pos.x - radius * 0.3,
    pos.y - radius * 0.3,
    radius * 0.05,
    pos.x,
    pos.y,
    radius
  );
  grd.addColorStop(0, '#ff8fa3');
  grd.addColorStop(0.5, '#f43f5e');
  grd.addColorStop(1, '#be123c');

  ctx.beginPath();
  ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = grd;
  ctx.fill();

  // Specular highlight
  const hlGrd = ctx.createRadialGradient(
    pos.x - radius * 0.35,
    pos.y - radius * 0.35,
    0,
    pos.x - radius * 0.35,
    pos.y - radius * 0.35,
    radius * 0.5
  );
  hlGrd.addColorStop(0, 'rgba(255,255,255,0.5)');
  hlGrd.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = hlGrd;
  ctx.fill();

  ctx.restore();

  // Velocity vector (debug arrow) - subtle
  if (speed > 20) {
    const dir = normalize(vel);
    const arrowLen = Math.min(speed * 0.06, 30);
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = '#fda4af';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineTo(pos.x + dir.x * arrowLen, pos.y + dir.y * arrowLen);
    ctx.stroke();
    ctx.restore();
  }
}
