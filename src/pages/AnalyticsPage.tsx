// ShadowGrid AI — Analytics Page
// All chart data comes from the AppContext engine output (computed, not static).

import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell, CartesianGrid
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/dashboard/StatCard';
import { Activity, AlertTriangle, Users, Newspaper, TrendingUp, Shield } from 'lucide-react';
import { useAppStore } from '@/store/AppContext';
import { RISK_CATEGORY_LABELS } from '@/lib/constants';
import { getCategoryColor } from '@/lib/uiHelpers';
import type { RiskCategory } from '@/types/types';

const ALL_CATEGORIES: RiskCategory[] = [
  'drainage', 'road', 'water', 'power', 'traffic', 'emergency_access',
];

const tooltipStyle = {
  contentStyle: {
    background: 'hsl(222 22% 14%)',
    border: '1px solid hsl(222 18% 22%)',
    borderRadius: 6,
    fontSize: 12,
  },
  labelStyle: { color: '#e2e8f0' },
  itemStyle: { color: '#94a3b8' },
};

export default function AnalyticsPage() {
  const {
    dashboardSummary,
    zoneSummaries,
    riskTrend,
    signalTrend,
    cityName,
  } = useAppStore();

  // Category distribution computed from live zone summaries
  const categoryPieData = ALL_CATEGORIES.map(cat => ({
    name: RISK_CATEGORY_LABELS[cat],
    value: Math.round(
      zoneSummaries.reduce((sum, z) => sum + (z.scores_by_category[cat] ?? 0), 0) /
      Math.max(1, zoneSummaries.length)
    ),
    color: getCategoryColor(cat),
  }));

  // Zone comparison bar data from live summaries
  const zoneBarData = [...zoneSummaries]
    .sort((a, b) => b.overall_score - a.overall_score)
    .map(z => ({
      name: z.zone_name.split(' ').slice(0, 2).join(' '),
      score: z.overall_score,
      fill:
        z.overall_score >= 80 ? '#ef4444' :
        z.overall_score >= 60 ? '#f97316' :
        z.overall_score >= 40 ? '#eab308' :
        '#22c55e',
    }));

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-foreground">Risk Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Historical trends, signal volumes, and zone risk distribution · {cityName}
        </p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Active Signals Today"   value={dashboardSummary.total_active_signals}    icon={AlertTriangle} variant="warning" />
        <StatCard label="Citizen Reports Today"  value={dashboardSummary.citizen_reports_today}   icon={Users}         variant="info" />
        <StatCard label="External Signals Today" value={dashboardSummary.external_signals_today}  icon={Newspaper}     variant="default" />
        <StatCard label="Response Improvement"   value={`${dashboardSummary.response_improvement_pct}%`} icon={TrendingUp} variant="success" />
      </div>

      {/* 30-day risk trend (engine-generated, converges to current scores) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Activity size={15} className="text-primary" />
            30-Day Risk Trend by Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full min-w-0 overflow-hidden h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={riskTrend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  {ALL_CATEGORIES.map(cat => (
                    <linearGradient key={cat} id={`g_${cat}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={getCategoryColor(cat)} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={getCategoryColor(cat)} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 18% 20%)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} interval={4} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip {...tooltipStyle} />
                <Legend layout="horizontal" wrapperStyle={{ paddingTop: 8, fontSize: 11 }} />
                {ALL_CATEGORIES.map(cat => (
                  <Area
                    key={cat}
                    type="monotone"
                    dataKey={cat}
                    name={RISK_CATEGORY_LABELS[cat]}
                    stroke={getCategoryColor(cat)}
                    strokeWidth={1.5}
                    fill={`url(#g_${cat})`}
                    dot={false}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Signal trends + category pie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Signal count trend — derived from real report timestamps */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-foreground">Signal Volume (14 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full min-w-0 overflow-hidden h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={signalTrend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 18% 20%)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} interval={2} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
                  <Tooltip {...tooltipStyle} />
                  <Legend layout="horizontal" wrapperStyle={{ paddingTop: 8, fontSize: 11 }} />
                  <Bar dataKey="citizen" name="Citizen"  stackId="a" fill="#60a5fa" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="weather" name="Weather"  stackId="a" fill="#22d3ee" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="news"    name="News"     stackId="a" fill="#a78bfa" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category risk distribution pie — live averages */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-foreground">Average Risk by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full min-w-0 overflow-hidden h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryPieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={50}
                    dataKey="value"
                    nameKey="name"
                    label={({ value }) => `${value}`}
                    labelLine={false}
                  >
                    {categoryPieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} opacity={0.85} />
                    ))}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                  <Legend layout="horizontal" wrapperStyle={{ paddingTop: 8, fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Zone comparison — live overall scores */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Shield size={15} className="text-primary" />
            Zone Risk Comparison (Overall Score)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full min-w-0 overflow-hidden h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={zoneBarData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 18% 20%)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="score" name="Risk Score" radius={[3, 3, 0, 0]}>
                  {zoneBarData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Key metrics — live computed values */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Estimated Failures Prevented</p>
            <p className="text-3xl font-bold font-mono text-green-400 mt-1">{dashboardSummary.estimated_failures_prevented}</p>
            <p className="text-xs text-muted-foreground mt-1">This week via early intervention</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Response Time Improvement</p>
            <p className="text-3xl font-bold font-mono text-primary mt-1">{dashboardSummary.response_improvement_pct}%</p>
            <p className="text-xs text-muted-foreground mt-1">Faster than reactive baseline</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Critical Zones Active</p>
            <p className="text-3xl font-bold font-mono text-red-400 mt-1">{dashboardSummary.critical_zones_count}</p>
            <p className="text-xs text-muted-foreground mt-1">Requiring immediate attention</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
