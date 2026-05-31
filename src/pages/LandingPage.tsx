// ShadowGrid AI — Landing / Overview Page

import { Link } from 'react-router-dom';
import {
  Shield, BarChart3, Map, AlertTriangle, ChevronRight,
  Activity, Radio, Brain, Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/store/AppContext';
import { getRiskLevel, RISK_LEVEL_CONFIG, RISK_CATEGORY_LABELS } from '@/lib/constants';
import { RiskBadge } from '@/components/common/RiskBadge';
import { CategoryIcon } from '@/components/common/CategoryIcon';

const FEATURES = [
  { icon: Map,           title: 'Zone Risk Mapping',         desc: 'Interactive city map with color-coded risk zones updated in real time from multiple signal sources.' },
  { icon: Radio,         title: 'Civic Pulse Scanner',       desc: 'Ingests weather alerts, news signals, and citizen reports to detect early warning patterns.' },
  { icon: Brain,         title: 'Risk Scoring Engine',       desc: 'Weighted formula combining citizen reports, weather severity, public signals, and historical data.' },
  { icon: Activity,      title: 'Failure Chain Simulation',  desc: 'Models cascading failure sequences: rainfall → drainage → road block → ambulance delay.' },
  { icon: Target,        title: 'Preventive Recommender',    desc: 'Generates ranked, actionable interventions for maintenance teams before failures escalate.' },
  { icon: BarChart3,     title: 'Analytics Dashboard',       desc: 'Trend charts, signal counts, failure rates, and team deployment effectiveness metrics.' },
];

export default function LandingPage() {
  const {
    zoneSummaries,
    dashboardSummary,
    dataMode,
    dataModeLabel,
    citizenReports,
    externalSignals,
  } = useAppStore();

  const topZones = [...zoneSummaries]
    .sort((a, b) => b.overall_score - a.overall_score)
    .slice(0, 3);

  const LIVE_STATS = [
    { value: dashboardSummary.total_active_signals, label: 'Active Signals' },
    { value: dashboardSummary.critical_zones_count, label: 'Critical Zones' },
    { value: dashboardSummary.estimated_failures_prevented, label: 'Failures Prevented' },
    { value: `${dashboardSummary.response_improvement_pct}%`, label: 'Faster Response' },
  ];

  const modeBadgeColor: Record<string, string> = {
    demo: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30',
    live: 'bg-green-500/10 text-green-300 border-green-500/30',
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 py-16 md:py-24 border-b border-border">
        {/* Decorative background grid */}
        <div
          className="absolute inset-0 z-0 pointer-events-none opacity-[0.04]"
          style={{ backgroundImage: 'linear-gradient(hsl(191 100% 48%) 1px, transparent 1px), linear-gradient(90deg, hsl(191 100% 48%) 1px, transparent 1px)', backgroundSize: '40px 40px' }}
        />
        {/* Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 rounded-full bg-primary/10 blur-3xl z-0 pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          {/* Hackathon badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-primary risk-critical-pulse" />
            <span className="text-xs font-medium text-primary">Hackathon MVP · Live Demo</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold text-foreground text-balance mb-4">
            <span className="gradient-text">ShadowGrid AI</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground text-balance mb-2">
            Predictive Smart City Failure Intelligence
          </p>
          <p className="text-sm text-muted-foreground text-pretty max-w-2xl mx-auto mb-8">
            Real-time infrastructure risk monitoring that fuses citizen reports, weather signals, and public data
            to predict failures before they happen — and recommend targeted preventive actions.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
            <Button asChild size="lg" className="gap-2">
              <Link to="/dashboard">
                <BarChart3 size={18} /> Open Dashboard
              </Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="gap-2 border border-border text-foreground hover:bg-accent">
              <Link to="/map">
                <Map size={18} /> Explore Risk Map
              </Link>
            </Button>
          </div>

          {/* Live stat counters */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {LIVE_STATS.map(stat => (
              <div key={stat.label} className="p-3 rounded-lg border border-border bg-card/60 text-center">
                <p className="text-2xl font-bold font-mono text-primary">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Data mode label */}
          <div className="mt-4 flex justify-center">
            <Badge className={`text-[10px] h-5 border ${modeBadgeColor[dataMode] ?? modeBadgeColor.demo}`}>
              {dataModeLabel}
            </Badge>
          </div>
        </div>
      </section>

      {/* Problem statement */}
      <section className="px-4 py-12 md:py-16 border-b border-border bg-card/30">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-red-500/30 bg-red-500/10 mb-4">
            <AlertTriangle size={12} className="text-red-400" />
            <span className="text-xs font-medium text-red-400">The Problem</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-foreground mb-4 text-balance">
            Cities React to Failures. ShadowGrid Predicts Them.
          </h2>
          <p className="text-sm text-muted-foreground text-pretty mb-6 max-w-2xl mx-auto">
            Urban infrastructure fails silently — a blocked drain escalates to a flood, a power dip becomes
            a blackout, a road crack causes an accident. By the time alerts reach operators, the cascade has
            already started. ShadowGrid AI surfaces the risk <em>before</em> citizens feel it.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-sm text-muted-foreground font-mono">
            {['rainfall', 'drain overflow', 'road blocked', 'ambulance delayed'].map((step, i, arr) => (
              <span key={step} className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded border ${i === arr.length - 1 ? 'border-red-500/40 text-red-400 bg-red-500/10' : 'border-border text-foreground bg-card'}`}>
                  {step}
                </span>
                {i < arr.length - 1 && <ChevronRight size={14} className="shrink-0 text-muted-foreground" />}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="px-4 py-12 md:py-16 border-b border-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-xl md:text-2xl font-bold text-foreground text-balance">What ShadowGrid Does</h2>
            <p className="text-sm text-muted-foreground mt-2">Six AI-powered modules working together in real time</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(f => (
              <Card key={f.title} className="h-full hover:border-primary/30 transition-colors duration-200">
                <CardContent className="p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/15 border border-primary/20">
                    <f.icon size={20} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{f.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 text-pretty">{f.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Live risk preview */}
      <section className="px-4 py-12 md:py-16 border-b border-border">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground text-balance">
                Current Risk Snapshot
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Top 3 highest-risk zones right now — powered by {citizenReports.length} citizen reports &amp; {externalSignals.length} signals
              </p>
            </div>
            <Button asChild variant="ghost" size="sm" className="gap-1 text-primary border border-primary/30 hover:bg-primary/10">
              <Link to="/dashboard">
                Full Dashboard <ChevronRight size={14} />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {topZones.map((zone, idx) => {
              const levelConfig = RISK_LEVEL_CONFIG[getRiskLevel(zone.overall_score)];
              return (
                <Link key={zone.zone_id} to={`/zone/${zone.zone_id}`}>
                  <Card className={`h-full hover:border-primary/40 transition-all duration-200 ${idx === 0 ? 'border-red-500/40' : ''}`}>
                    <CardContent className="p-4 flex flex-col gap-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground font-mono">#{idx + 1} Risk Zone</p>
                          <p className="text-sm font-bold text-foreground mt-0.5 text-balance">{zone.zone_name}</p>
                        </div>
                        <span className={`text-3xl font-bold font-mono ${levelConfig.color}`}>
                          {Math.round(zone.overall_score)}
                        </span>
                      </div>
                      <RiskBadge score={zone.overall_score} />
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CategoryIcon category={zone.top_category} size={12} />
                        <span>Top: {RISK_CATEGORY_LABELS[zone.top_category]}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-primary">
                        View Details <ChevronRight size={11} />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Risk formula */}
      <section className="px-4 py-12 md:py-16 border-b border-border bg-card/30">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-xl md:text-2xl font-bold text-foreground mb-3 text-balance">
            Explainable Risk Formula
          </h2>
          <p className="text-sm text-muted-foreground mb-6 text-pretty">
            Every score is traceable. No black box — each zone score is a weighted sum of five measurable components.
          </p>
          <div className="p-4 rounded-lg border border-border bg-background font-mono text-sm text-left overflow-x-auto">
            <p className="text-primary font-semibold mb-2">Final Risk Score =</p>
            {[
              ['0.30', 'Citizen Complaint Density'],
              ['0.25', 'Weather Severity'],
              ['0.20', 'Public Web Signal Strength'],
              ['0.15', 'Historical Failure Rate'],
              ['0.10', 'Nearby Zone Impact'],
            ].map(([weight, factor], i) => (
              <p key={factor} className="text-sm">
                <span className="text-muted-foreground">{i === 0 ? '  ' : '+ '}</span>
                <span className="text-yellow-400">{weight}</span>
                <span className="text-muted-foreground"> × </span>
                <span className="text-foreground">{factor}</span>
              </p>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Scores are recomputed on every signal event — no polling latency.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-16 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4 text-balance">
            Ready to Explore?
          </h2>
          <p className="text-muted-foreground text-pretty mb-8">
            Dive into the live city risk dashboard, submit a citizen report, or explore the interactive map.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="gap-2">
              <Link to="/dashboard">
                <BarChart3 size={18} /> Open Dashboard
              </Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="gap-2 border border-border text-foreground hover:bg-accent">
              <Link to="/map">
                <Map size={18} /> Risk Map
              </Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="gap-2 border border-border text-foreground hover:bg-accent">
              <Link to="/analytics">
                <Activity size={18} /> Analytics
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
