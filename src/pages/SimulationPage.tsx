import HexagonSimulation from '@/components/HexagonSimulation';
import ControlPanel from '@/components/ControlPanel';
import { useState } from 'react';

export type SimConfig = {
  gravity: number;
  restitution: number;
  friction: number;
  hexRotationSpeed: number;
  ballRadius: number;
  trailEnabled: boolean;
};

const DEFAULT_CONFIG: SimConfig = {
  gravity: 800,
  restitution: 0.75,
  friction: 0.995,
  hexRotationSpeed: 1.0,
  ballRadius: 14,
  trailEnabled: true,
};

export default function SimulationPage() {
  const [config, setConfig] = useState<SimConfig>(DEFAULT_CONFIG);
  const [running, setRunning] = useState(true);
  const [resetKey, setResetKey] = useState(0);

  function handleReset() {
    setResetKey((k) => k + 1);
  }

  return (
    <div className="flex flex-col items-center justify-center w-screen h-screen bg-[#0f0f1a] select-none">
      <h1 className="text-white text-2xl font-bold mb-4 tracking-widest uppercase opacity-80">
        Hexagon Physics Sim
      </h1>
      <div className="flex flex-col lg:flex-row gap-6 items-center justify-center w-full px-4">
        <HexagonSimulation
          key={resetKey}
          config={config}
          running={running}
        />
        <ControlPanel
          config={config}
          setConfig={setConfig}
          running={running}
          setRunning={setRunning}
          onReset={handleReset}
        />
      </div>
    </div>
  );
}
