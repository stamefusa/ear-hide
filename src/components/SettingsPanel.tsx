import type { Settings } from '../types';

interface SettingsPanelProps {
  settings: Settings;
  onChange: (settings: Settings) => void;
}

interface NumberFieldProps {
  label: string;
  value: number;
  min: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
}

const NumberField = ({ label, value, min, step, unit, onChange }: NumberFieldProps) => (
  <label className="number-field">
    <span>{label}</span>
    <div className="number-input-row">
      <input
        type="number"
        min={min}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <span className="unit">{unit}</span>
    </div>
  </label>
);

export const SettingsPanel = ({ settings, onChange }: SettingsPanelProps) => {
  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <section className="panel settings-panel" aria-labelledby="settings-title">
      <div className="panel-heading">
        <h2 id="settings-title">設定</h2>
      </div>
      <div className="settings-grid">
        <NumberField
          label="しきい値距離"
          value={settings.thresholdDistanceM}
          min={1}
          step={100}
          unit="m"
          onChange={(value) => updateSetting('thresholdDistanceM', value)}
        />
        <NumberField
          label="位置取得間隔"
          value={settings.locationIntervalMs}
          min={1000}
          step={500}
          unit="ms"
          onChange={(value) => updateSetting('locationIntervalMs', value)}
        />
        <NumberField
          label="連続超過判定回数"
          value={settings.consecutiveExceedLimit}
          min={1}
          step={1}
          unit="回"
          onChange={(value) => updateSetting('consecutiveExceedLimit', value)}
        />
        <NumberField
          label="巻き取り時間"
          value={settings.retractDurationMs}
          min={1}
          step={100}
          unit="ms"
          onChange={(value) => updateSetting('retractDurationMs', value)}
        />
        <NumberField
          label="ゆるめ時間"
          value={settings.releaseDurationMs}
          min={1}
          step={100}
          unit="ms"
          onChange={(value) => updateSetting('releaseDurationMs', value)}
        />
      </div>
    </section>
  );
};
