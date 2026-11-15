"use client";

const colors = [
  ["#ff6347", "12px", "3.4s"],
  ["#00ced1", "18px", "6.1s"],
  ["#adff2f", "10px", "2.9s"],
  ["#9370db", "16px", "7.8s"],
  ["#ff1493", "14px", "4.6s"],
  ["#00bfff", "11px", "3.3s"],
  ["#7fff00", "17px", "5.5s"],
  ["#dc143c", "13px", "6.7s"],
  ["#8a2be2", "19px", "8.2s"],
  ["#48d1cc", "15px", "9.1s"],
  ["#ff4500", "14px", "4.2s"],
  ["#00ff7f", "16px", "5.8s"],
  ["#ba55d3", "10px", "7.3s"],
  ["#1e90ff", "18px", "6.4s"],
  ["#ffa500", "20px", "10s"],
  ["#ff69b4", "12px", "3.7s"],
  ["#00fa9a", "11px", "2.6s"],
  ["#9400d3", "17px", "6.9s"],
  ["#ffb6c1", "13px", "5.3s"],
  ["#20b2aa", "19px", "7.7s"],
];

export default function ColorOrbLoader({ label }: { label: string }) {
  return (
    <div className="orb-loader-backdrop" role="status" aria-live="polite" aria-label={label}>
      <div className="orb-loader-content">
        <aside className="container-loader" aria-hidden="true">
          {colors.map(([color, offset, duration], index) => (
            <article
              key={`${color}-${index}`}
              className="ball"
              style={{ "--color": color, "--i": offset, "--d": duration } as React.CSSProperties}
            />
          ))}
        </aside>
        <p className="orb-loader-label">{label}</p>
      </div>
    </div>
  );
}
