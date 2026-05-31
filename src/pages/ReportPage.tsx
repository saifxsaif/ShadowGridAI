// ShadowGrid AI — Citizen Report Submission Page
// Uses AppContext.submitReport() so each submission immediately re-runs the
// engine and the Dashboard/ZoneDetails reflect updated scores.

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CheckCircle2, Send, AlertTriangle, Info, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage
} from '@/components/ui/form';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useAppStore } from '@/store/AppContext';
import { REPORT_TYPE_LABELS, RISK_CATEGORY_LABELS, REPORT_TYPE_TO_CATEGORY } from '@/lib/constants';
import { getRiskLevel, RISK_LEVEL_CONFIG } from '@/lib/constants';
import type { ReportType } from '@/types/types';

const formSchema = z.object({
  report_type: z.string().min(1, 'Report type is required'),
  zone_id:     z.string().min(1, 'Zone is required'),
  severity:    z.string().min(1, 'Severity is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  image_url:   z.string().url('Must be a valid URL').optional().or(z.literal('')),
  contact_info: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const SEVERITY_OPTIONS = [
  { value: 'low',      label: 'Low — Minor inconvenience',           color: 'text-green-400' },
  { value: 'medium',   label: 'Medium — Noticeable disruption',       color: 'text-yellow-400' },
  { value: 'high',     label: 'High — Significant hazard',            color: 'text-orange-400' },
  { value: 'critical', label: 'Critical — Emergency / Life safety',   color: 'text-red-400' },
];

export default function ReportPage() {
  const { zones, getZoneSummary, submitReport } = useAppStore();

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedZoneId, setSubmittedZoneId] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      report_type: '',
      zone_id:     '',
      severity:    '',
      description: '',
      image_url:   '',
      contact_info: '',
    },
  });

  const selectedType   = form.watch('report_type') as ReportType | '';
  const selectedZoneId = form.watch('zone_id');
  const affectedCategory = selectedType ? REPORT_TYPE_TO_CATEGORY[selectedType] : null;

  // Live zone risk preview while filling the form
  const previewSummary = selectedZoneId ? getZoneSummary(selectedZoneId) : null;
  const previewLevel   = previewSummary ? getRiskLevel(previewSummary.overall_score) : null;
  const previewConfig  = previewLevel ? RISK_LEVEL_CONFIG[previewLevel] : null;

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    const result = await submitReport({
      report_type:  values.report_type as ReportType,
      zone_id:      values.zone_id,
      severity:     values.severity as 'low' | 'medium' | 'high' | 'critical',
      description:  values.description,
      image_url:    values.image_url || undefined,
      contact_info: values.contact_info || undefined,
    });

    setSubmitting(false);
    if (result.success) {
      setSubmittedZoneId(values.zone_id);
      setSubmitted(true);
      toast.success('Report submitted!', {
        description: 'Zone risk score has been recalculated.',
      });
    } else {
      toast.error('Submission failed', { description: result.error });
    }
  }

  if (submitted) {
    const updatedSummary = submittedZoneId ? getZoneSummary(submittedZoneId) : null;
    const updatedLevel   = updatedSummary ? getRiskLevel(updatedSummary.overall_score) : null;
    const updatedConfig  = updatedLevel ? RISK_LEVEL_CONFIG[updatedLevel] : null;

    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
        <Card className="border-green-500/40">
          <CardContent className="p-8 flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 rounded-full bg-green-500/15 flex items-center justify-center border border-green-500/30">
              <CheckCircle2 size={28} className="text-green-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Report Submitted</h2>
              <p className="text-sm text-muted-foreground mt-2 text-pretty">
                Your report has been recorded and the zone risk score has been recalculated in real time.
              </p>
            </div>
            <div className="flex gap-3 flex-wrap justify-center mt-2">
              <Button onClick={() => { setSubmitted(false); form.reset(); }}>
                Submit Another Report
              </Button>
              {submittedZoneId && (
                <Button asChild variant="ghost" className="border border-border text-foreground hover:bg-accent">
                  <Link to={`/zone/${submittedZoneId}`}>View Zone Details</Link>
                </Button>
              )}
              <Button asChild variant="ghost" className="border border-border text-muted-foreground hover:bg-accent">
                <Link to="/dashboard">View Dashboard</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Show updated zone risk impact */}
        {updatedSummary && updatedConfig && (
          <Card className="border-primary/25">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={14} className="text-primary" />
                <span className="text-sm font-semibold text-foreground">Updated Risk Impact</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{updatedSummary.zone_name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Top concern: {RISK_CATEGORY_LABELS[updatedSummary.top_category]}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-bold font-mono ${updatedConfig.color}`}>
                    {updatedSummary.overall_score}
                  </p>
                  <Badge variant="outline" className={`${updatedConfig.bgColor} ${updatedConfig.color} text-xs mt-1`}>
                    {updatedConfig.label}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-foreground">Submit Incident Report</h1>
        <p className="text-sm text-muted-foreground mt-1 text-pretty">
          Help Metroville predict failures. Your report feeds directly into the ShadowGrid AI risk engine.
        </p>
      </div>

      {/* Info banner */}
      <div className="flex gap-2 p-3 rounded-lg bg-primary/8 border border-primary/25">
        <Info size={14} className="text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          Reports are anonymous. Contact info is optional. Submissions are used only for infrastructure risk analysis.
          Submitting a report immediately recalculates the zone's risk score.
        </p>
      </div>

      {/* Live zone risk preview */}
      {previewSummary && previewConfig && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-3 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Current risk for selected zone</p>
              <p className="text-sm font-medium text-foreground truncate">{previewSummary.zone_name}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className={`text-2xl font-bold font-mono ${previewConfig.color}`}>
                {previewSummary.overall_score}
              </span>
              <Badge variant="outline" className={`${previewConfig.bgColor} ${previewConfig.color} border-current/30 text-xs`}>
                {previewConfig.label}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <AlertTriangle size={15} className="text-orange-400" />
                Incident Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Report type */}
              <FormField control={form.control} name="report_type" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-normal text-muted-foreground">Issue Type *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select issue type" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(REPORT_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {affectedCategory && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Affects risk category: <span className="text-primary">{RISK_CATEGORY_LABELS[affectedCategory]}</span>
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )} />

              {/* Zone */}
              <FormField control={form.control} name="zone_id" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-normal text-muted-foreground">Affected Zone *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select zone" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {zones.map(z => (
                        <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Severity */}
              <FormField control={form.control} name="severity" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-normal text-muted-foreground">Severity *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select severity level" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SEVERITY_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <span className={opt.color}>{opt.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Description */}
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-normal text-muted-foreground">Description *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe what you observed. Include location details, approximate time, and any immediate dangers."
                      className="resize-none min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          {/* Optional fields */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground">Optional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="image_url" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-normal text-muted-foreground">Image URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com/photo.jpg" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="contact_info" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-normal text-muted-foreground">Contact Info (email or phone)</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional — for follow-up only" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Separator />

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="ghost"
              className="border border-border text-muted-foreground hover:bg-accent"
              onClick={() => form.reset()}
            >
              Clear Form
            </Button>
            <Button type="submit" disabled={submitting} className="gap-2">
              {submitting ? 'Submitting…' : (
                <>
                  <Send size={14} />
                  Submit Report
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
