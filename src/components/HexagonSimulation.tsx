import { useRef, useEffect } from 'react';
import type { SimConfig } from '@/pages/SimulationPage';
import { usePhysicsLoop } from '@/hooks/usePhysicsLoop';

type Props = {
  config: SimConfig;
  running: boolean;
};

export default function HexagonSimulation({ config, running }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  usePhysicsLoop(canvasRef, config, running);

  return (
    <canvas
      ref={canvasRef}
      width={520}
      height={520}
      className="rounded-2xl border border-indigo-500/30 shadow-[0_0_60px_rgba(99,102,241,0.3)] bg-[#0f0f1a]"
      style={{ display: 'block' }}
    />
  );
}
