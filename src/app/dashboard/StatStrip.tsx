interface Stat {
  label: string;
  value: number;
  detail?: string;
}

interface Props {
  stats: Stat[];
}

export default function StatStrip({ stats }: Props) {
  return (
    <section
      aria-label="Semester at a glance"
      className="mt-space-md grid grid-cols-2 border-y border-primary-container/25 sm:grid-cols-4"
    >
      {stats.map((stat, index) => (
        <div
          key={stat.label}
          className={`flex flex-col justify-center px-space-sm py-space-sm ${
            index % 2 === 1 ? "border-l border-primary-container/20" : ""
          } ${index > 1 ? "border-t border-primary-container/20 sm:border-t-0" : ""} ${
            index === 2 ? "sm:border-l" : ""
          } ${index === 3 ? "sm:border-l" : ""}`}
        >
          <span className="font-display text-[32px] leading-none tabular-nums text-primary-container">
            {stat.value}
          </span>
          <span className="paper-kicker mt-1 text-text-muted">{stat.label}</span>
          {stat.detail && (
            <span className="mt-0.5 font-code-tag text-[10px] leading-4 text-text-muted/80">
              {stat.detail}
            </span>
          )}
        </div>
      ))}
    </section>
  );
}
