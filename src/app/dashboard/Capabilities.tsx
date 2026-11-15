import FeatureCards from "@/components/FeatureCards";

export default function Capabilities() {
  return (
    <section id="capabilities" aria-labelledby="capabilities-heading" className="mt-space-xl border-t-[3px] border-double border-primary-container pt-space-md">
      <div className="mb-space-lg flex flex-wrap items-end justify-between gap-space-sm border-b border-primary-container/25 pb-1">
        <div>
          <p className="paper-kicker text-accent-text">Current system capabilities</p>
          <h2 id="capabilities-heading" className="mt-1 font-display text-[30px] leading-tight text-primary-container">Crafted capabilities</h2>
        </div>
        <p className="max-w-md font-body-sm text-body-sm text-text-muted">What CoursePilot supports today, plus features still being woven into the system.</p>
      </div>
      <FeatureCards showStatus variant="paper" />
    </section>
  );
}
