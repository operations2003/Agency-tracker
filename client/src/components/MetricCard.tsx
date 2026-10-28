import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
    isWarning?: boolean;
  };
  onClick?: () => void;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  onClick,
  className = ''
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-slate-800/80 backdrop-blur-sm border border-slate-700/60 rounded-xl p-5 shadow-sm transition-all duration-200 hover:border-slate-600 ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{title}</p>
        {icon && <div className="p-2 rounded-lg bg-slate-700/50 text-slate-300">{icon}</div>}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <h3 className="text-2xl font-bold tracking-tight text-white">{value}</h3>
        {trend && (
          <span
            className={`text-xs font-medium ${
              trend.isWarning
                ? 'text-amber-400'
                : trend.isPositive
                ? 'text-emerald-400'
                : 'text-rose-400'
            }`}
          >
            {trend.value}
          </span>
        )}
      </div>

      {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
    </div>
  );
};
