import Link from "next/link";

const stats = [
  { metric: "Private Beta", label: "Join early-stage founders" },
  { metric: "AI-Powered", label: "Smart matching in seconds" },
  { metric: "Free to Start", label: "No credit card required" },
];

const features = [
  {
    title: "AI-curated partners",
    description:
      "We ingest your product positioning, audience data, and past collaborations to surface founders who can unlock viral reach immediately.",
  },
  {
    title: "One-click intros",
    description:
      "Draft your outreach with AI, personalize in seconds, and deliver intros that get responses without cold pitching.",
  },
  {
    title: "Launch playbooks",
    description:
      "Run proven co-marketing campaigns—bundles, live events, referral swaps—with automated tracking and follow-up.",
  },
];

const steps = [
  {
    title: "Share your product",
    description: "Onboard in five minutes with your positioning, audience size, and offers.",
  },
  {
    title: "Get curated matches",
    description: "Our engine blends semantic search and traction signals to deliver high-intent partners.",
  },
  {
    title: "Launch together",
    description: "Generate outreach, track responses, and convert promising matches into live collaborations.",
  },
];

export default function Home() {
  return (
    <main className="relative overflow-hidden bg-gradient-to-b from-emerald-950 via-emerald-900 to-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-1/4 top-[-200px] h-[520px] w-[520px] rounded-full bg-emerald-500/30 blur-[140px]" />
        <div className="absolute right-[-200px] top-[240px] h-[420px] w-[420px] rounded-full bg-teal-500/20 blur-[140px]" />
      </div>

      <section className="relative mx-auto flex min-h-[90vh] w-full max-w-6xl flex-col items-center gap-10 px-5 pb-20 pt-32 text-center sm:px-8">
        <span className="rounded-full border border-emerald-300/40 bg-emerald-300/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-100">
          COLAUNCH — VIRAL PARTNERSHIPS
        </span>
        <h1 className="max-w-4xl text-4xl font-semibold leading-tight text-white sm:text-6xl">
          Unlock viral growth by partnering with founders who already reach your dream customers.
        </h1>
        <p className="max-w-2xl text-lg text-emerald-50/80 sm:text-xl">
          CoLaunch uses AI to pair your product with complementary audiences, craft intros that earn replies, and launch cross-promotions that actually drive revenue.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row">
          <Link
            href="/auth/signup"
            className="inline-flex items-center justify-center rounded-full bg-white px-8 py-3 text-sm font-semibold text-emerald-900 shadow-lg shadow-emerald-900/30 transition hover:-translate-y-0.5 hover:bg-emerald-50"
          >
            Start free trial
          </Link>
          <Link
            href="/demo"
            className="inline-flex items-center justify-center rounded-full border border-white/40 px-8 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:border-white"
          >
            Try interactive demo
          </Link>
        </div>

        <div className="grid w-full gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm sm:grid-cols-3">
          {stats.map((item) => (
            <div key={item.metric} className="space-y-1">
              <p className="text-3xl font-semibold text-white sm:text-4xl">{item.metric}</p>
              <p className="text-sm text-emerald-50/70">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative mx-auto flex w-full max-w-6xl flex-col gap-10 px-5 pb-24 text-left sm:px-8">
        <h2 className="text-3xl font-semibold text-white sm:text-4xl">Everything you need to co-launch in days, not months.</h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-emerald-950/30 backdrop-blur"
            >
              <h3 className="text-xl font-semibold text-white">{feature.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-emerald-50/80">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative mx-auto w-full max-w-6xl px-5 pb-24 sm:px-8">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur sm:p-12">
          <div className="grid gap-8 sm:grid-cols-3">
            {steps.map((step, index) => (
              <div key={step.title} className="space-y-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-400/20 text-sm font-semibold text-emerald-100">
                  {index + 1}
                </span>
                <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                <p className="text-sm leading-relaxed text-emerald-50/80">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative mx-auto w-full max-w-5xl px-5 pb-28 text-center sm:px-8">
        <div className="rounded-3xl border border-white/10 bg-white/10 p-10 shadow-2xl shadow-emerald-950/40 backdrop-blur">
          <h2 className="text-3xl font-semibold text-white sm:text-4xl">Stop renting attention. Grow together.</h2>
          <p className="mt-4 text-base text-emerald-50/80 sm:text-lg">
            Join our private beta of founders ready to share audiences, swap campaigns, and ship joint launches that feel organic for both communities.
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/auth/signup"
              className="inline-flex items-center justify-center rounded-full bg-white px-8 py-3 text-sm font-semibold text-emerald-900 transition hover:-translate-y-0.5 hover:bg-emerald-100"
            >
              Join the beta — it&apos;s free
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex items-center justify-center rounded-full border border-white/40 px-8 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:border-white"
            >
              Already have an account? Sign in
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
