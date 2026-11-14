import { FEATURE_STATUS_LABEL, PRODUCT_FEATURES } from "@/lib/features";
import Link from "next/link";

interface Props {
  showStatus?: boolean;
}

export default function FeatureCards({ showStatus = false }: Props) {
  return (
    <div className="grid grid-cols-1 gap-space-xl md:grid-cols-2">
      {PRODUCT_FEATURES.map((feature) => (
        <article key={feature.title} className="feature-card relative flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-surface p-space-xl shadow-sm transition-all duration-200">
          <div className={`edge-strand absolute inset-y-0 left-0 w-1.5 ${feature.edge} opacity-80`} />
          <div>
            <div className={`mb-space-lg flex h-12 w-12 items-center justify-center rounded-lg ${feature.iconWrap} ${feature.iconText}`}>
              <span className="material-symbols-outlined text-2xl leading-none" aria-hidden="true">{feature.icon}</span>
            </div>
            <div className="flex flex-wrap items-start justify-between gap-space-sm">
              <h3 className="font-headline-sm text-headline-sm text-primary-container">{feature.title}</h3>
              {showStatus ? <span className="paper-stamp border-border text-text-muted">{FEATURE_STATUS_LABEL[feature.status]}</span> : null}
            </div>
            <p className="mt-space-xs font-body-md text-body-md leading-relaxed text-text-muted">{feature.description}</p>
          </div>
          <div className="mt-space-xl flex items-center justify-between gap-space-sm rounded-lg border border-secondary/10 bg-surface-bright p-space-md pt-space-md">
            <span className="font-code-tag text-code-tag text-primary-container">{feature.detail}</span>
            <span className="material-symbols-outlined shrink-0 text-base leading-none text-surface-tint" aria-hidden="true">
              {feature.detailIcon}
            </span>
          </div>
          {feature.title === "Quiz & Exam Prep" ? <Link href="/dashboard/study-prep" className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg border border-primary-container px-4 font-medium text-primary-container hover:bg-surface-container">Open Study Prep</Link> : null}
        </article>
      ))}
    </div>
  );
}
