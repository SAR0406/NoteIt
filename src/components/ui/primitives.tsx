'use client';

import React from 'react';

type Tone = 'default' | 'accent' | 'success' | 'warning' | 'danger';

const toneClass: Record<Tone, string> = {
  default: 'surface-card',
  accent: 'surface-card-accent',
  success: 'surface-card-success',
  warning: 'surface-card-warning',
  danger: 'surface-card-danger',
};

export function SectionCard({
  title,
  subtitle,
  action,
  tone = 'default',
  children,
  className = '',
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`${toneClass[tone]} rounded-2xl p-4 md:p-5 ${className}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function StatCard({
  label,
  value,
  icon,
  className = '',
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`surface-card rounded-2xl p-4 ${className}`}>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs text-[var(--text-secondary)]">{label}</p>
        {icon}
      </div>
      <p className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">{value}</p>
    </div>
  );
}

export function Chip({
  active = false,
  children,
  className = '',
}: {
  active?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return <span className={`chip ${active ? 'chip-active' : ''} ${className}`}>{children}</span>;
}

export function PillButton({
  children,
  active = false,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
}) {
  return (
    <button
      {...props}
      className={`pill-button ${active ? 'pill-button-active' : ''} ${className}`}
    >
      {children}
    </button>
  );
}

export function TabButton({
  label,
  active,
  onClick,
  badge,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: string | number;
}) {
  return (
    <button onClick={onClick} className={`tab-button ${active ? 'tab-button-active' : ''}`}>
      <span>{label}</span>
      {badge !== undefined && <span className="chip chip-active ml-1">{badge}</span>}
    </button>
  );
}

export function SegmentedControl({
  value,
  options,
  onChange,
}: {
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="segmented">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`segmented-item ${value === option.value ? 'segmented-item-active' : ''}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function FloatingToolbar({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`floating-toolbar ${className}`}>{children}</div>;
}

export function TimelineRail({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`timeline-rail ${className}`}>{children}</div>;
}

export function SplitPane({
  left,
  right,
  leftClassName = '',
  rightClassName = '',
}: {
  left: React.ReactNode;
  right: React.ReactNode;
  leftClassName?: string;
  rightClassName?: string;
}) {
  return (
    <div className="split-pane">
      <div className={leftClassName}>{left}</div>
      <div className={rightClassName}>{right}</div>
    </div>
  );
}
