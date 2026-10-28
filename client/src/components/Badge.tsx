import React from 'react';

interface BadgeProps {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'purple';
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'neutral', children, className = '', dot = false }) => {
  const styles = {
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    danger: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    info: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    neutral: 'bg-slate-800 text-slate-300 border-slate-700'
  };

  const dotStyles = {
    success: 'bg-emerald-400',
    warning: 'bg-amber-400',
    danger: 'bg-rose-400',
    info: 'bg-sky-400',
    purple: 'bg-purple-400',
    neutral: 'bg-slate-400'
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[variant]} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotStyles[variant]}`} />}
      {children}
    </span>
  );
};

export const SlaBadge: React.FC<{ status: string; consumption?: number }> = ({ status, consumption }) => {
  let variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'purple' = 'neutral';
  let label = status;

  switch (status) {
    case 'ON_TRACK':
      variant = 'success';
      label = `On Track (${consumption ? `${consumption}%` : '<70%'})`;
      break;
    case 'AMBER':
      variant = 'warning';
      label = `Amber Warning (${consumption ? `${consumption}%` : '≥70%'})`;
      break;
    case 'RED':
      variant = 'danger';
      label = `Critical SLA (${consumption ? `${consumption}%` : '≥90%'})`;
      break;
    case 'BREACHED':
      variant = 'danger';
      label = 'Contractual SLA BREACHED';
      break;
    case 'PAUSED':
      variant = 'neutral';
      label = 'Paused (On Hold)';
      break;
    case 'COMPLETED':
      variant = 'info';
      label = 'Completed';
      break;
  }

  return <Badge variant={variant} dot>{label}</Badge>;
};

export const MarginBadge: React.FC<{ status: string; marginPct: number | null }> = ({ status, marginPct }) => {
  let variant: 'success' | 'warning' | 'danger' | 'neutral' = 'neutral';
  let label = marginPct !== null ? `${marginPct}% Margin` : 'N/A';

  switch (status) {
    case 'HEALTHY':
      variant = 'success';
      break;
    case 'WARNING':
      variant = 'warning';
      label = `${marginPct}% (Below Threshold)`;
      break;
    case 'CRITICAL':
      variant = 'danger';
      label = `${marginPct}% (Negative Margin)`;
      break;
    case 'NO_REVENUE_DEFICIT':
      variant = 'danger';
      label = 'Cost Deficit (Zero Rev)';
      break;
    case 'NO_ACTIVITY':
      variant = 'neutral';
      label = 'N/A (No Activity)';
      break;
  }

  return <Badge variant={variant} dot>{label}</Badge>;
};

