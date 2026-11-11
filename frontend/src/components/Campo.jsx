export default function Campo({ label, erro, ...props }) {
  return (
    <label style={{ display: 'grid', gap: 4 }}>
      {label}
      <input {...props} />
      {erro && <span style={{ color: 'crimson', fontSize: 14 }}>{erro}</span>}
    </label>
  );
}