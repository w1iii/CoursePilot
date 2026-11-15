import { FEATURE_STATUS_LABEL, PRODUCT_FEATURES } from "@/lib/features";
import Link from "next/link";

interface Props {
  showStatus?: boolean;
  variant?: "default" | "paper";
}

export default function FeatureCards({ showStatus = false, variant = "default" }: Props) {
  const paper = variant === "paper";

  return (
    <div className={`grid grid-cols-1 gap-space-md md:grid-cols-2 ${paper ? "md:gap-x-space-lg md:gap-y-space-md" : "gap-space-xl"}`}>
      {PRODUCT_FEATURES.map((feature) => (
        <article key={feature.title} className={`feature-card relative flex flex-col justify-between overflow-hidden transition-all duration-200 ${paper ? "min-h-64 border-b border-primary-container/25 bg-transparent px-space-md pb-space-md pt-space-lg hover:border-primary-container/40" : "rounded-xl border border-border bg-surface p-space-xl shadow-sm"}`}>
          <div className={`edge-strand absolute ${paper ? "inset-x-0 top-0 h-[2px] w-full" : "inset-y-0 left-0 w-1.5"} ${feature.edge} opacity-80`} />
          <div>
            <div className={`mb-space-md flex h-8 w-8 items-center justify-center ${paper ? "border border-primary-container/20" : `rounded-lg ${feature.iconWrap}`} ${feature.iconText}`}>
              <span className="material-symbols-outlined text-2xl leading-none" aria-hidden="true">{feature.icon}</span>
            </div>
            <div className="flex flex-wrap items-start justify-between gap-space-sm">
              <h3 className={`${paper ? "font-display text-[21px] leading-tight" : "font-headline-sm text-headline-sm"} text-primary-container`}>{feature.title}</h3>
              {showStatus ? <span className="paper-stamp border-border text-text-muted">{FEATURE_STATUS_LABEL[feature.status]}</span> : null}
            </div>
            <p className={`mt-space-xs text-text-muted ${paper ? "font-body-sm text-body-sm" : "font-body-md text-body-md"} leading-relaxed`}>{feature.description}</p>
          </div>
          <div className={`mt-space-md flex items-center justify-between gap-space-sm border-t border-primary-container/20 pt-space-sm ${paper ? "bg-transparent" : "rounded-lg border-secondary/10 bg-surface-bright p-space-md"}`}>
            <span className="font-code-tag text-code-tag text-primary-container">{feature.detail}</span>
            <span className="material-symbols-outlined shrink-0 text-base leading-none text-surface-tint" aria-hidden="true">
              {feature.detailIcon}
            </span>
          </div>
          {feature.title === "Quiz & Exam Prep" ? <Link href="/dashboard/study-prep" className={`mt-4 inline-flex min-h-11 items-center justify-center border border-primary-container px-4 font-medium text-primary-container hover:bg-surface-container ${paper ? "font-code-tag text-[10px] uppercase tracking-[0.14em]" : "rounded-lg"}`}>Open Study Prep</Link> : null}
        </article>
      ))}
    </div>
  );
}
