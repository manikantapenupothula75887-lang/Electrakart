import React from 'react';
import { Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

interface LogoProps {
  className?: string;
  showTagline?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'light' | 'dark';
}

export const ElectraKartLogo: React.FC<LogoProps> = ({
  className = '',
  showTagline = true,
  size = 'md',
  variant = 'dark',
}) => {
  const sizeClasses = {
    sm: { icon: 'w-5 h-5', title: 'text-lg', tag: 'text-[9px]' },
    md: { icon: 'w-7 h-7', title: 'text-2xl', tag: 'text-[11px]' },
    lg: { icon: 'w-9 h-9', title: 'text-3xl', tag: 'text-xs' },
  };

  const isLight = variant === 'light';

  return (
    <Link to="/" className={`inline-flex items-center gap-2.5 group select-none ${className}`}>
      {/* Icon Badge */}
      <div className="relative flex items-center justify-center p-2 rounded-xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 text-slate-950 shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform duration-200">
        <Zap className={`${sizeClasses[size].icon} fill-slate-950 stroke-slate-950`} />
        {/* Subtle glow dot */}
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white"></span>
      </div>

      {/* Brand Text */}
      <div className="flex flex-col leading-none">
        <div className="flex items-baseline tracking-tight">
          <span className={`font-extrabold ${sizeClasses[size].title} ${isLight ? 'text-white' : 'text-slate-900'}`}>
            Electra
          </span>
          <span className={`font-extrabold ${sizeClasses[size].title} text-amber-500`}>
            Kart
          </span>
        </div>
        {showTagline && (
          <span
            className={`font-semibold tracking-wider uppercase mt-0.5 ${sizeClasses[size].tag} ${
              isLight ? 'text-amber-300' : 'text-slate-500'
            }`}
          >
            From Estimate to Delivery
          </span>
        )}
      </div>
    </Link>
  );
};
