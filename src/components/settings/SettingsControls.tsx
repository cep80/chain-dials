"use client";

import type { ReactNode } from "react";
import { Hint } from "@/components/ui/Hint";
import type { TipId } from "@/lib/settings/tips";

export function SettingsSection({
  id,
  eyebrow,
  title,
  blurb,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  blurb: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className="rounded-[14px] border border-line bg-ink-elevated/70"
    >
      <header className="border-b border-line/80 px-5 py-4 md:px-6">
        <p className="text-[10px] uppercase tracking-[0.2em] text-accent">
          {eyebrow}
        </p>
        <h2
          id={`${id}-heading`}
          className="mt-1 text-xl font-bold tracking-tight text-paper"
        >
          {title}
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-paper-muted">{blurb}</p>
      </header>
      <div className="divide-y divide-line/70">{children}</div>
    </section>
  );
}

export function SettingsRow({
  label,
  description,
  tip,
  control,
}: {
  label: string;
  description: string;
  tip?: TipId;
  control: ReactNode;
}) {
  const labelNode = tip ? (
    <Hint tip={tip} className="min-w-0">
      <span className="text-sm font-semibold text-paper underline decoration-dotted decoration-paper-muted/50 underline-offset-4">
        {label}
      </span>
    </Hint>
  ) : (
    <span className="text-sm font-semibold text-paper">{label}</span>
  );

  return (
    <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8 md:px-6">
      <div className="min-w-0 flex-1">
        {labelNode}
        <p className="mt-1 text-xs leading-relaxed text-paper-muted">
          {description}
        </p>
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

export function SettingsToggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
        checked
          ? "border-accent/60 bg-accent/25"
          : "border-line bg-ink"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full transition ${
          checked
            ? "left-[1.35rem] bg-accent"
            : "left-0.5 bg-paper-muted"
        }`}
      />
    </button>
  );
}

export function SettingsSegmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (next: T) => void;
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex flex-wrap gap-1 rounded-[10px] border border-line bg-ink p-1"
    >
      {options.map((opt) => {
        const on = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(opt.value)}
            className={`rounded-[8px] px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              on
                ? "bg-accent text-ink"
                : "text-paper-muted hover:text-paper"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function SettingsSelect<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (next: T) => void;
  label: string;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-xs text-paper-muted">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="rounded-[10px] border border-line bg-ink px-3 py-2 text-sm text-paper outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
