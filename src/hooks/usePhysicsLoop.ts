import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import type { SimConfig } from '@/pages/SimulationPage';
import { createPhysicsState, stepPhysics, renderFrame } from '@/lib/physics';
import type { PhysicsState } from '@/lib/physics';

export function usePhysicsLoop(
  canvasRef: RefObject<HTMLCanvasElement>,
  config: SimConfig,
  running: boolean
) {
  const stateRef = useRef<PhysicsState | null>(null);
  const animRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const configRef = useRef<SimConfig>(config);
  const runningRef = useRef<boolean>(running);

  // Keep refs in sync with latest props
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    runningRef.current = running;
  }, [running]);

  // Init physics state once on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    stateRef.current = createPhysicsState(cx, cy);
  }, [canvasRef]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    function loop(timestamp: number) {
      if (!stateRef.current) {
        animRef.current = requestAnimationFrame(loop);
        return;
      }

      const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.033);
      lastTimeRef.current = timestamp;

      if (runningRef.current && dt > 0) {
        stepPhysics(stateRef.current, configRef.current, dt);
      }

      renderFrame(ctx, stateRef.current, configRef.current, canvas.width, canvas.height);
      animRef.current = requestAnimationFrame(loop);
    }

    lastTimeRef.current = performance.now();
    animRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animRef.current);
    };
  }, [canvasRef]);
}
