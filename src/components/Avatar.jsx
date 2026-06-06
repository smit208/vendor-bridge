const COLORS = ['#1B4FD8','#DC2626','#16A34A','#D97706','#7C3AED','#0891B2'];

export default function Avatar({ name = '', size = 32 }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const color = COLORS[name.charCodeAt(0) % COLORS.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: color + '22', color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: size * 0.38, flexShrink: 0,
      border: `1.5px solid ${color}44`,
    }}>
      {initials}
    </div>
  );
}
