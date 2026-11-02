import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendPositive = true,
  color = 'blue',
  badgeText
}) {
  const colorMap = {
    blue: {
      bg: 'bg-blue-50',
      text: 'text-blue-600',
      border: 'border-blue-100',
      glow: 'shadow-blue-500/10'
    },
    emerald: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-600',
      border: 'border-emerald-100',
      glow: 'shadow-emerald-500/10'
    },
    purple: {
      bg: 'bg-purple-50',
      text: 'text-purple-600',
      border: 'border-purple-100',
      glow: 'shadow-purple-500/10'
    },
    amber: {
      bg: 'bg-amber-50',
      text: 'text-amber-600',
      border: 'border-amber-100',
      glow: 'shadow-amber-500/10'
    },
    rose: {
      bg: 'bg-rose-50',
      text: 'text-rose-600',
      border: 'border-rose-100',
      glow: 'shadow-rose-500/10'
    }
  };

  const scheme = colorMap[color] || colorMap.blue;

  return (
    <div className={`p-5 sm:p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden group`}>
      {/* Top row */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</span>
        <div className={`w-11 h-11 rounded-xl ${scheme.bg} ${scheme.text} flex items-center justify-center transition-transform group-hover:scale-110 shadow-xs`}>
          {Icon && <Icon className="w-5 h-5" />}
        </div>
      </div>

      {/* Main Stat Value */}
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-['Plus_Jakarta_Sans'] tracking-tight">
          {value}
        </span>
        {badgeText && (
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${scheme.bg} ${scheme.text}`}>
            {badgeText}
          </span>
        )}
      </div>

      {/* Subtitle / Trend */}
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
        {trend && (
          <span className={`inline-flex items-center gap-0.5 font-semibold ${trendPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
            {trendPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {trend}
          </span>
        )}
        <span>{subtitle}</span>
      </div>

      {/* Subtle corner light accent */}
      <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-slate-50 group-hover:scale-150 transition-transform duration-500 -z-10" />
    </div>
  );
}
