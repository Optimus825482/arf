import { ReactNode } from 'react';

interface HudPanelProps {
  children: ReactNode;
  className?: string;
}

export default function HudPanel({ children, className = '' }: HudPanelProps) {
  return (
    <div className={`glass-panel relative rounded-lg p-8 flex flex-col items-center text-center ${className}`}>
      <div className="hud-bracket tl"></div>
      <div className="hud-bracket tr"></div>
      <div className="hud-bracket bl"></div>
      <div className="hud-bracket br"></div>
      {children}
    </div>
  );
}
