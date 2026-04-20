import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import WavyRouteLine from "@/components/ui/WavyRouteLine";
import jamieChenPhoto from "@/assets/jamie-chen.jpg";
import {
  Map,
  MapPin,
  Route,
  Compass,
  Signpost,
  Flag,
  ArrowRight,
  Layers,
  Users,
  BarChart3,
} from "lucide-react";
import heroPastel from "@/assets/hero-pastel.jpg.asset.json";
import DevPanel from "@/components/dev/DevPanel";

/* ─── Logo icon options ─── */
const LOGO_ICONS = [MapPin, Route, Compass, Signpost, Flag];

/* ─── Value prop data ─── */
const VALUE_PROPS = [
  {
    icon: Layers,
    title: "Drag. Drop. Done.",
    body: "No training manual required. Rearrange priorities as fast as you can think of them.",
    placeholder: "Canvas view — draggable cards on a timeline grid",
  },
  {
    icon: Users,
    title: "One plan, many hands.",
    body: "Invite your team. Comment, assign, and resolve — without another meeting.",
    placeholder: "Collaboration — team avatars and inline comments",
  },
  {
    icon: BarChart3,
    title: "See what's stuck.",
    body: "Built-in analytics show what's moving, what's blocked, and what quietly slipped.",
    placeholder: "Analytics — completion rates and velocity charts",
  },
];

/* ─── Layout variants ─── */

function LayoutCards({ items }: { items: typeof VALUE_PROPS }) {
  return (
    <div className="grid gap-8 sm:grid-cols-3">
      {items.map((p, i) => (
        <div key={i} className="rounded-xl border border-border/50 bg-background p-6 space-y-4">
          <div className="flex items-center justify-center h-11 w-11 rounded-lg bg-primary/10">
            <p.icon className="h-5 w-5 text-primary" />
          </div>
          <div className="w-full aspect-[4/3] rounded-lg bg-muted/60 border border-border/40 flex items-center justify-center">
            <span className="text-[11px] text-muted-foreground px-4 text-center leading-snug">
              [{p.placeholder}]
            </span>
          </div>
          <h3 className="font-display text-base font-semibold text-foreground">{p.title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{p.body}</p>
        </div>
      ))}
    </div>
  );
}

function LayoutNumbered({ items }: { items: typeof VALUE_PROPS }) {
  return (
    <div className="grid gap-6 sm:grid-cols-3">
      {items.map((p, i) => (
        <div key={i} className="flex gap-4">
          <span className="font-display text-4xl font-bold text-primary/20 leading-none">
            {String(i + 1).padStart(2, "0")}
          </span>
          <div className="space-y-2 pt-1">
            <h3 className="font-display text-base font-semibold text-foreground">{p.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{p.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function LayoutAlternating({ items }: { items: typeof VALUE_PROPS }) {
  return (
    <div className="space-y-16">
      {items.map((p, i) => (
        <div
          key={i}
          className={`flex flex-col sm:flex-row gap-8 items-center ${
            i % 2 !== 0 ? "sm:flex-row-reverse" : ""
          }`}
        >
          <div className="flex-1 w-full aspect-[16/10] rounded-xl bg-muted/60 border border-border/40 flex items-center justify-center">
            <span className="text-[11px] text-muted-foreground px-4 text-center leading-snug">
              [{p.placeholder}]
            </span>
          </div>
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-center h-11 w-11 rounded-lg bg-primary/10">
              <p.icon className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-display text-xl font-semibold text-foreground">{p.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">{p.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function LayoutMinimalList({ items }: { items: typeof VALUE_PROPS }) {
  return (
    <div className="divide-y divide-border/50">
      {items.map((p, i) => (
        <div key={i} className="flex items-start gap-5 py-8 first:pt-0 last:pb-0">
          <div className="flex items-center justify-center h-11 w-11 rounded-lg bg-primary/10 shrink-0 mt-0.5">
            <p.icon className="h-5 w-5 text-primary" />
          </div>
          <div className="space-y-1">
            <h3 className="font-display text-base font-semibold text-foreground">{p.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-md">{p.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function LayoutLargeCards({ items }: { items: typeof VALUE_PROPS }) {
  return (
    <div className="space-y-6">
      {items.map((p, i) => (
        <div
          key={i}
          className="relative overflow-hidden rounded-2xl border border-border/50 bg-muted/30 p-8 sm:p-10"
        >
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <div className="space-y-3 flex-1">
              <div className="flex items-center justify-center h-11 w-11 rounded-lg bg-primary/10">
                <p.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-display text-xl font-semibold text-foreground">{p.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">{p.body}</p>
            </div>
            <div className="w-full sm:w-64 aspect-[4/3] rounded-lg bg-background border border-border/40 flex items-center justify-center shrink-0">
              <span className="text-[11px] text-muted-foreground px-4 text-center leading-snug">
                [{p.placeholder}]
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

const LAYOUTS = [LayoutCards, LayoutNumbered, LayoutAlternating, LayoutMinimalList, LayoutLargeCards];

/* ─── Landing Page ─── */

export default function Landing() {
  const [layoutIndex, setLayoutIndex] = useState(1);
  const heroRef = useRef<HTMLDivElement>(null);
  const [showFixedNav, setShowFixedNav] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowFixedNav(window.scrollY > 160);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const LogoIcon = LOGO_ICONS[1]; // Route icon
  const ActiveLayout = LAYOUTS[layoutIndex];

  return (
    <div className="min-h-screen bg-[hsl(60,20%,95.5%)]">
      <SEOHead
        title="Roadmapper — Ship the right things, in the right order"
        description="The visual roadmap tool that keeps your team aligned. Drag, drop, and plan product priorities on one shared canvas."
        url="https://myroadmapcanvas.lovable.app/"
      />

      {/* ─── Dev Panel ─── */}
      <DevPanel
        layoutIndex={layoutIndex}
        setLayoutIndex={setLayoutIndex}
      />

      {/* ─── Fixed nav — slides in after 160px scroll ─── */}
      <div className={`fixed top-0 left-0 right-0 z-50 px-6 pt-4 transition-transform duration-300 ease-out ${
        showFixedNav ? "translate-y-0" : "-translate-y-full"
      }`}>
        <nav className="mx-auto max-w-5xl flex items-center justify-between px-5 py-3 bg-[hsl(164,100%,6%)] backdrop-blur-xl rounded-xl shadow-lg">
          <Link to="/" className="flex items-center gap-2">
            <LogoIcon className="h-5 w-5 text-white" />
            <span className="font-display text-base font-bold text-white">Roadmapper</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="font-display text-sm text-white/80 hover:text-white hover:bg-white/10">
                Sign in
              </Button>
            </Link>
            <Link to="/signup">
              <Button size="sm" className="font-display text-sm">
                Get started free
              </Button>
            </Link>
          </div>
        </nav>
      </div>

      {/* ─── Section 1: Hero ─── */}
      <section className="px-6 pt-4 sm:pt-6">
        <div className="mx-auto max-w-5xl">
          {/* Hero image with content in natural flow */}
          <div ref={heroRef} className="relative rounded-2xl overflow-hidden border border-foreground/10">
            {/* Background image (absolute) */}
            <img
              src={heroPastel.url}
              alt="A forest road winding through autumn trees — representing the journey of product planning"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-white/40 via-transparent to-white/20" />
            {/* Top subtle gradient for nav area */}
            <div className="absolute top-0 left-0 right-0 h-44 bg-gradient-to-b from-[hsl(60,20%,97.5%)]/85 via-[hsl(60,20%,97.5%)]/50 to-transparent z-[1]" />

            {/* Static nav — inside hero, scrolls away naturally */}
            <div className="relative z-10 px-4 pt-4">
              <nav className="flex items-center justify-between px-5 py-3 rounded-xl">
                <Link to="/" className="flex items-center gap-2">
                  <LogoIcon className="h-5 w-5 text-foreground" />
                  <span className="font-display text-base font-bold text-foreground">Roadmapper</span>
                </Link>
                <div className="flex items-center gap-3">
                  <Link to="/login">
                    <Button variant="ghost" size="sm" className="font-display text-sm text-foreground/70 hover:text-foreground hover:bg-foreground/5">
                      Sign in
                    </Button>
                  </Link>
                  <Link to="/signup">
                    <Button size="sm" className="font-display text-sm">
                      Get started free
                    </Button>
                  </Link>
                </div>
              </nav>
            </div>

            {/* Hero content — in flow, pushes height */}
            <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 sm:px-10 pt-12 sm:pt-20 pb-44 sm:pb-56">
              <h1 className="font-display text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-[1.1] max-w-2xl text-balance">
                Ship the right things, in the right order.
              </h1>
              <p className="mt-3 text-base sm:text-lg text-foreground/70 max-w-md leading-relaxed text-balance">
                One canvas. Every priority. Your whole team, finally on the same page.
              </p>
              <div className="mt-6">
                <Link to="/signup">
                  <Button size="lg" className="font-display text-sm px-8 py-5 rounded-lg shadow-lg">
                    Start for free
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Demo UI card — in flow, negative margin pulls it up to overlap hero */}
          <div className="mx-8 -mt-24 sm:-mt-32 relative z-20">
            <div className="rounded-xl border border-border/60 bg-white shadow-lg shadow-black/8 overflow-hidden">
              {/* Mock app UI */}
              <div className="flex" style={{ height: 340 }}>
                {/* Sidebar */}
                <div className="w-44 border-r border-border/50 bg-white p-3 flex flex-col gap-1 shrink-0">
                  <div className="flex items-center gap-2 px-2 py-1.5 mb-3">
                    <Route className="h-4 w-4 text-foreground" />
                    <span className="font-display text-xs font-bold text-foreground">Roadmapper</span>
                  </div>
                  <div className="px-2 py-1.5 rounded-md bg-secondary text-xs font-medium text-foreground">Q1 Product launch</div>
                  <div className="px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-muted/50">Mobile redesign</div>
                  <div className="px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-muted/50">API v2 roadmap</div>
                  <div className="mt-auto px-2 py-1.5 text-[10px] text-muted-foreground/60">3 roadmaps</div>
                </div>
                {/* Canvas area */}
                <div className="flex-1 bg-[hsl(60,20%,97.5%)] flex flex-col">
                  {/* Timeline header */}
                  <div className="flex border-b border-border/40 bg-white/80">
                    <div className="flex-1 px-4 py-2 text-[10px] font-display font-semibold text-muted-foreground uppercase tracking-wider border-r border-border/30">Q1 2025</div>
                    <div className="flex-1 px-4 py-2 text-[10px] font-display font-semibold text-muted-foreground uppercase tracking-wider border-r border-border/30">Q2 2025</div>
                    <div className="flex-1 px-4 py-2 text-[10px] font-display font-semibold text-muted-foreground uppercase tracking-wider border-r border-border/30">Q3 2025</div>
                    <div className="flex-1 px-4 py-2 text-[10px] font-display font-semibold text-muted-foreground uppercase tracking-wider">Q4 2025</div>
                  </div>
                  {/* Cards */}
                  <div className="flex-1 relative p-4">
                    {/* Card 1 - Completed */}
                    <div className="absolute left-4 top-4 w-36 rounded-lg border border-border/50 bg-white p-2.5 shadow-sm">
                      <div className="w-full h-0.5 rounded-full bg-[#16A34A] mb-2" />
                      <p className="text-[11px] font-medium text-foreground">User research</p>
                      <div className="flex items-center gap-1 mt-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A]" />
                        <span className="text-[9px] text-muted-foreground">Completed</span>
                      </div>
                    </div>
                    {/* Card 2 - In Progress */}
                    <div className="absolute left-44 top-20 w-40 rounded-lg border border-border/50 bg-white p-2.5 shadow-sm">
                      <div className="w-full h-0.5 rounded-full bg-[#D97706] mb-2" />
                      <p className="text-[11px] font-medium text-foreground">Design system v2</p>
                      <div className="flex items-center gap-1 mt-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#D97706]" />
                        <span className="text-[9px] text-muted-foreground">In progress</span>
                      </div>
                    </div>
                    {/* Card 3 - Planned */}
                    <div className="absolute right-16 top-8 w-36 rounded-lg border border-border/50 bg-white p-2.5 shadow-sm">
                      <div className="w-full h-0.5 rounded-full bg-[#9CA3AF] mb-2" />
                      <p className="text-[11px] font-medium text-foreground">API integration</p>
                      <div className="flex items-center gap-1 mt-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#9CA3AF]" />
                        <span className="text-[9px] text-muted-foreground">Planned</span>
                      </div>
                    </div>
                    {/* Card 4 - In Progress */}
                    <div className="absolute left-8 top-40 w-44 rounded-lg border border-border/50 bg-white p-2.5 shadow-sm">
                      <div className="w-full h-0.5 rounded-full bg-[#D97706] mb-2" />
                      <p className="text-[11px] font-medium text-foreground">Onboarding flow</p>
                      <div className="flex items-center gap-1 mt-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#D97706]" />
                        <span className="text-[9px] text-muted-foreground">In progress</span>
                      </div>
                    </div>
                    {/* Card 5 - Planned */}
                    <div className="absolute right-8 top-44 w-36 rounded-lg border border-border/50 bg-white p-2.5 shadow-sm">
                      <div className="w-full h-0.5 rounded-full bg-[#9CA3AF] mb-2" />
                      <p className="text-[11px] font-medium text-foreground">Launch beta</p>
                      <div className="flex items-center gap-1 mt-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#9CA3AF]" />
                        <span className="text-[9px] text-muted-foreground">Planned</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Wavy route divider ─── */}
      <div className="flex justify-center pt-8 py-2">
        <WavyRouteLine height={192} className="text-primary/60" color="currentColor" />
      </div>

      {/* ─── Section 2: Value props ─── */}
      <section className="px-6 py-14 sm:py-18">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-foreground text-center">
            Less process. More progress.
          </h2>
          <p className="mt-3 text-base text-muted-foreground text-center max-w-lg mx-auto text-balance">
            Three things that actually matter when you're deciding what to build next.
          </p>

          <div className="mt-14">
            <ActiveLayout items={VALUE_PROPS} />
          </div>
        </div>
      </section>

      {/* ─── Wavy route divider ─── */}
      <div className="flex justify-center py-2">
        <WavyRouteLine height={192} className="text-primary/60" color="currentColor" />
      </div>

      {/* ─── Section 3: Social proof ─── */}
      <section className="px-6 py-4">
        <div className="mx-auto max-w-5xl rounded-2xl bg-[hsl(55,20%,89%)] px-8 py-20 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xl sm:text-2xl text-foreground leading-relaxed italic">
              "We replaced three tools and a weekly status meeting. Roadmapper is the only planning surface our team actually opens every day."
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <img src={jamieChenPhoto} alt="Jamie Chen" className="h-10 w-10 rounded-full object-cover border border-[hsl(55,15%,78%)]" />
              <div className="text-left">
                <p className="font-display text-sm font-medium text-foreground">Jamie Chen</p>
                <p className="text-xs text-muted-foreground">Head of Product, Series B startup</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Wavy route divider ─── */}
      <div className="flex justify-center py-4">
        <WavyRouteLine height={192} className="text-primary/60" color="currentColor" />
      </div>

      {/* ─── Section 4: Final CTA ─── */}
      <section className="px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-2xl sm:text-4xl font-bold text-foreground leading-tight">
            Your roadmap deserves<br className="hidden sm:block" /> better than a spreadsheet.
          </h2>
          <p className="mt-4 text-base text-muted-foreground max-w-md mx-auto text-balance">
            Free to start. No credit card. Set up in under two minutes.
          </p>
          <div className="mt-8">
            <Link to="/signup">
              <Button size="lg" className="font-display text-sm px-10 py-6 rounded-lg shadow-lg">
                Get started free
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="px-6 py-8 border-t border-border/30">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <LogoIcon className="h-4 w-4 text-primary" />
            <span className="font-display text-sm font-semibold text-foreground">Roadmapper</span>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Roadmapper. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
