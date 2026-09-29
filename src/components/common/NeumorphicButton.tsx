import React from 'react';
import { sound } from '../../utils/sound';

interface NeumorphicButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'raised' | 'inset' | 'flat' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  active?: boolean;
}

export const NeumorphicButton: React.FC<NeumorphicButtonProps> = ({
  children,
  variant = 'raised',
  size = 'md',
  active = false,
  className = '',
  onClick,
  ...props
}) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    sound.playClick();
    if (onClick) onClick(e);
  };

  const sizeClasses = {
    sm: 'px-3.5 py-1.5 text-xs font-semibold rounded-2xl gap-1.5 active:scale-95',
    md: 'px-4.5 py-2.5 text-sm font-semibold rounded-2xl gap-2 active:scale-95',
    lg: 'px-6 py-3.5 text-base font-bold rounded-3xl gap-2.5 active:scale-95',
    icon: 'p-2.5 rounded-2xl aspect-square active:scale-90',
  }[size];

  let variantClasses = '';
  if (variant === 'raised') {
    variantClasses = active
      ? 'neu-inset text-slate-100 bg-[#16181d] dark:bg-[#14161a] border border-white/5'
      : 'neu-btn text-slate-700 dark:text-slate-200 bg-[#edf2f8] dark:bg-[#191b20] hover:text-black dark:hover:text-white border border-black/5 dark:border-white/5';
  } else if (variant === 'inset') {
    variantClasses = 'neu-inset text-slate-800 dark:text-slate-100 bg-[#e4eaf2] dark:bg-[#15171b] border border-black/5 dark:border-white/5';
  } else if (variant === 'danger') {
    variantClasses = 'neu-btn text-red-600 dark:text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20';
  } else if (variant === 'flat') {
    variantClasses = 'bg-slate-200 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-800 rounded-2xl';
  } else if (variant === 'ghost') {
    variantClasses = 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 rounded-2xl';
  }

  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center justify-center transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none ${sizeClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
