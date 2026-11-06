import type { ReactNode } from "react";

export function ComingSoonBadge() {
  return (
    <span className="shrink-0 rounded-full border border-border bg-surface-container-low px-2 py-0.5 font-code-tag text-[10px] uppercase tracking-[0.12em] text-text-muted">
      Coming soon
    </span>
  );
}

interface SectionProps {
  id?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

export default function SettingsSection({
  id,
  title,
  description,
  action,
  children,
  footer,
}: SectionProps) {
  return (
    <section
      id={id}
      className="rounded-2xl border border-border bg-surface p-space-lg shadow-sm"
    >
      <header className="flex flex-col gap-space-sm sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-headline-sm text-headline-sm text-primary-container">{title}</h2>
          {description && (
            <p className="mt-1 max-w-xl font-body-sm text-body-sm text-text-muted">
              {description}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      <div className="mt-space-md divide-y divide-border">{children}</div>
      {footer && <div className="mt-space-md border-t border-border pt-space-md">{footer}</div>}
    </section>
  );
}

interface RowProps {
  label: string;
  helper?: string;
  comingSoon?: boolean;
  children?: ReactNode;
}

export function SettingsRow({ label, helper, comingSoon, children }: RowProps) {
  return (
    <div className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-space-md">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-label-md text-label-md text-on-surface">{label}</p>
          {comingSoon && <ComingSoonBadge />}
        </div>
        {helper && (
          <p className="mt-0.5 font-body-sm text-body-sm text-text-muted">{helper}</p>
        )}
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  );
}

export function SettingsGroup({
  label,
  tag,
  children,
}: {
  label: string;
  tag?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-space-md">
      <div className="flex items-center justify-between gap-space-sm px-1">
        <h2 className="font-code-tag text-code-tag uppercase tracking-widest text-text-muted">
          {label}
        </h2>
        {tag && (
          <span className="font-code-tag text-[10px] uppercase tracking-[0.12em] text-text-muted">
            {tag}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
