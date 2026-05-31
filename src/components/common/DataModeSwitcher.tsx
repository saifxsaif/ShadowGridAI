// ShadowGrid AI — Runtime Data Mode switcher
//
// Lets the user flip between the stable Demo dataset and the live, ingested
// dataset at runtime (no env changes / restart). The selection is persisted
// in localStorage by AppContext.
//
// Two variants:
//   • "full"    — labelled segmented control + description (Operations page)
//   • "compact" — small inline toggle for the sidebar / header

import { FlaskConical, Radio, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/AppContext';
import { DATA_MODE_DESCRIPTIONS, type DataMode } from '@/lib/dataMode';
import { Button } from '@/components/ui/button';

interface DataModeSwitcherProps {
  variant?: 'full' | 'compact';
  className?: string;
}

const MODES: { mode: DataMode; label: string; icon: typeof FlaskConical }[] = [
  { mode: 'demo', label: 'Demo', icon: FlaskConical },
  { mode: 'live', label: 'Live', icon: Radio },
];

export function DataModeSwitcher({ variant = 'full', className }: DataModeSwitcherProps) {
  const { dataMode, setDataMode, resetDataMode, capabilities, loading, ingesting } = useAppStore();

  const busy = loading || ingesting;

  async function handleSelect(mode: DataMode) {
    if (mode === dataMode || busy) return;
    if (mode === 'live' && !capabilities.supabaseConfigured) {
      toast.warning('Live mode needs Supabase configured. Showing live dataset from DB if available.');
    }
    await setDataMode(mode);
    toast.success(`Switched to ${mode === 'demo' ? 'Demo' : 'Live'} data`);
  }

  if (variant === 'compact') {
    return (
      <div
        role="group"
        aria-label="Data mode"
        className={cn('inline-flex items-center rounded-md border border-border p-0.5 bg-muted/40', className)}
      >
        {MODES.map(({ mode, label, icon: Icon }) => (
          <button
            key={mode}
            type="button"
            disabled={busy}
            aria-pressed={dataMode === mode}
            onClick={() => handleSelect(mode)}
            className={cn(
              'flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors disabled:opacity-50',
              dataMode === mode
                ? mode === 'live'
                  ? 'bg-green-500/20 text-green-300'
                  : 'bg-yellow-500/20 text-yellow-300'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon size={11} />
            {label}
          </button>
        ))}
      </div>
    );
  }

  // Full variant
  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-2 flex-wrap">
        <div
          role="group"
          aria-label="Data mode"
          className="inline-flex items-center rounded-lg border border-border p-1 bg-muted/40"
        >
          {MODES.map(({ mode, label, icon: Icon }) => (
            <button
              key={mode}
              type="button"
              disabled={busy}
              aria-pressed={dataMode === mode}
              onClick={() => handleSelect(mode)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors disabled:opacity-50',
                dataMode === mode
                  ? mode === 'live'
                    ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                    : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        <Button
          size="sm"
          variant="ghost"
          className="gap-1.5 text-xs text-muted-foreground border border-border hover:bg-accent"
          onClick={() => { resetDataMode(); toast.success('Reset to Demo mode'); }}
          disabled={busy || dataMode === 'demo'}
        >
          <RotateCcw size={12} />
          Reset to Demo
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-pretty max-w-xl">
        {DATA_MODE_DESCRIPTIONS[dataMode]}
      </p>

      {dataMode === 'live' && !capabilities.newsConfigured && (
        <p className="text-[11px] text-yellow-400/80">
          News API key not set — live mode ingests weather only (news falls back to seeded signals).
        </p>
      )}
    </div>
  );
}
