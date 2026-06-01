// ShadowGrid AI — Analytics Preview (mini chart for dashboard)
// Shows the last 7 days of the engine-computed risk trend (mode-aware).

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useAppStore } from '@/store/AppContext';

export function RiskAnalyticsPreview() {
  const { riskTrend } = useAppStore();
  const previewData = riskTrend.slice(-7);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center justify-between">
          <span>Risk Trend (7 Days)</span>
          <Link
            to="/analytics"
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors font-normal"
          >
            Full Analytics <ArrowRight size={12} />
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0">
        <div className="w-full min-w-0 overflow-hidden h-[280px]">
          {previewData.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <p className="text-sm text-muted-foreground text-center text-pretty max-w-xs">
                No trend data yet. Ingest signals in Live mode to populate this chart.
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={previewData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gDrainage" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gPower" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#facc15" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#facc15" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gEmergency" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ background: 'hsl(222 22% 14%)', border: '1px solid hsl(222 18% 22%)', borderRadius: 6, fontSize: 12 }}
                  labelStyle={{ color: '#e2e8f0' }}
                  itemStyle={{ color: '#94a3b8' }}
                />
                <Legend layout="horizontal" wrapperStyle={{ paddingTop: 8, fontSize: 11 }} />
                <Area type="monotone" dataKey="drainage" name="Drainage" stroke="#22d3ee" strokeWidth={1.5} fill="url(#gDrainage)" dot={false} />
                <Area type="monotone" dataKey="power" name="Power" stroke="#facc15" strokeWidth={1.5} fill="url(#gPower)" dot={false} />
                <Area type="monotone" dataKey="emergency_access" name="Emergency" stroke="#f43f5e" strokeWidth={1.5} fill="url(#gEmergency)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
