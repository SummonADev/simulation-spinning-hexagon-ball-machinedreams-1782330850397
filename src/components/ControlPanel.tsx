import { type Dispatch, type SetStateAction } from 'react';
import type { SimConfig } from '@/pages/SimulationPage';
import clsx from 'clsx';

type Props = {
  config: SimConfig;
  setConfig: Dispatch<SetStateAction<SimConfig>>;
  running: boolean;
  setRunning: Dispatch<SetStateAction<boolean>>;
  onReset: () => void;
};

type SliderDef = {
  label: string;
  key: keyof SimConfig;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
};

const SLIDERS: SliderDef[] = [
  { label: 'Gravity', key: 'gravity', min: 100, max: 2000, step: 50, format: (v) => `${v} px/s²` },
  { label: 'Restitution (Bounce)', key: 'restitution', min: 0, max: 1, step: 0.01, format: (v) => v.toFixed(2) },
  { label: 'Friction (Air)', key: 'friction', min: 0.9, max: 1, step: 0.001, format: (v) => v.toFixed(3) },
  { label: 'Hex Spin Speed', key: 'hexRotationSpeed', min: -5, max: 5, step: 0.1, format: (v) => `${v.toFixed(1)} rad/s` },
  { label: 'Ball Radius', key: 'ballRadius', min: 5, max: 40, step: 1, format: (v) => `${v} px` },
];

export default function ControlPanel({ config, setConfig, running, setRunning, onReset }: Props) {
  function handleChange(key: keyof SimConfig, value: number) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="bg-[#16162a] border border-indigo-500/20 rounded-2xl p-6 w-full max-w-xs shadow-xl flex flex-col gap-5">
      <h2 className="text-indigo-300 font-semibold text-lg tracking-wide">Controls</h2>

      {SLIDERS.map((s) => (
        <div key={s.key} className="flex flex-col gap-1">
          <div className="flex justify-between text-sm">
            <span className="text-gray-300">{s.label}</span>
            <span className="text-indigo-400 font-mono">
              {s.format(config[s.key] as number)}
            </span>
          </div>
          <input
            type="range"
            min={s.min}
            max={s.max}
            step={s.step}
            value={config[s.key] as number}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              handleChange(s.key, parseFloat(e.target.value))
            }
            className="w-full accent-indigo-500 cursor-pointer"
          />
        </div>
      ))}

      <div className="flex flex-col gap-2 mt-1">
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <div
            onClick={() => setConfig((p) => ({ ...p, trailEnabled: !p.trailEnabled }))}
            className={clsx(
              'w-10 h-5 rounded-full transition-colors duration-200 relative',
              config.trailEnabled ? 'bg-indigo-500' : 'bg-gray-600'
            )}
          >
            <div
              className={clsx(
                'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200',
                config.trailEnabled ? 'translate-x-5' : 'translate-x-0.5'
              )}
            />
          </div>
          <span className="text-gray-300 text-sm">Ball Trail</span>
        </label>
      </div>

      <div className="flex gap-3 mt-2">
        <button
          onClick={() => setRunning((r) => !r)}
          className={clsx(
            'flex-1 py-2 rounded-xl font-semibold text-sm transition-colors',
            running
              ? 'bg-amber-500 hover:bg-amber-400 text-black'
              : 'bg-green-500 hover:bg-green-400 text-black'
          )}
        >
          {running ? 'Pause' : 'Resume'}
        </button>
        <button
          onClick={onReset}
          className="flex-1 py-2 rounded-xl font-semibold text-sm bg-rose-500 hover:bg-rose-400 text-white transition-colors"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
