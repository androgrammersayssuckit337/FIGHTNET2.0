
interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Logo({ className = '', size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: 'text-xl',
    md: 'text-3xl',
    lg: 'text-4xl',
    xl: 'text-7xl',
  };

  return (
    <div className={`font-logo select-none flex items-baseline leading-none tracking-tighter ${sizeClasses[size]} ${className}`}>
      <span className="text-[#E31837] filter drop-shadow-[0_0_8px_rgba(227,24,55,0.4)]">F</span>
      <span className="text-white">ight</span>
      <span className="text-[#E31837] ml-0.5 filter drop-shadow-[0_0_8px_rgba(227,24,55,0.4)]">N</span>
      <span className="text-white">et</span>
    </div>
  );
}
