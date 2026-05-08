import type { AppMode } from '../types';
import { MODE_LABELS } from '../constants';

interface ModeSelectorProps {
  value: AppMode;
  onChange: (mode: AppMode) => void;
}

const MODES: AppMode[] = ['production', 'distance-test', 'motor-test'];

export const ModeSelector = ({ value, onChange }: ModeSelectorProps) => (
  <div className="mode-selector" role="tablist" aria-label="動作モード">
    {MODES.map((mode) => (
      <button
        key={mode}
        type="button"
        role="tab"
        aria-selected={value === mode}
        className={value === mode ? 'active' : ''}
        onClick={() => onChange(mode)}
      >
        {MODE_LABELS[mode]}
      </button>
    ))}
  </div>
);
