import { statusColor } from '../utils/helpers';

export default function Badge({ status, size = 'sm' }) {
  const color = statusColor[status] || '#6B7280';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: size === 'sm' ? '2px 8px' : '4px 12px',
      borderRadius: 20,
      background: color + '18',
      color,
      fontSize: size === 'sm' ? 11 : 12,
      fontWeight: 600,
      whiteSpace: 'nowrap',
    }}>
      {status}
    </span>
  );
}
