import type { StatusItem } from '../types';

interface StatusPanelProps {
  items: StatusItem[];
  errors: string[];
  thresholdNotice: boolean;
}

export const StatusPanel = ({ items, errors, thresholdNotice }: StatusPanelProps) => (
  <section className="panel status-panel" aria-labelledby="status-title">
    <div className="panel-heading">
      <h2 id="status-title">状態</h2>
    </div>
    <dl className="status-grid">
      {items.map((item) => (
        <div key={item.label} className={`status-item ${item.tone ?? 'normal'}`}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
    {thresholdNotice && (
      <p className="notice warn" role="status">
        しきい値を超えました
      </p>
    )}
    {errors.length > 0 && (
      <div className="error-list" role="alert">
        {errors.map((error) => (
          <p key={error}>{error}</p>
        ))}
      </div>
    )}
  </section>
);
