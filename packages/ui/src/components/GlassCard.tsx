import { PropsWithChildren, HTMLAttributes } from "react";

type GlassCardProps = PropsWithChildren<
  { className?: string } & HTMLAttributes<HTMLDivElement>
>;

export default function GlassCard({ children, className = "", ...rest }: GlassCardProps) {
  return (
    <div
      {...rest}
      className={[
        "group relative rounded-2xl border border-white/20 dark:border-white/10",
        // subtle glass with brand tint
        "bg-ocean-blue/[0.06] dark:from-slate-900/60 dark:via-slate-900/50 dark:to-slate-900/60 backdrop-blur-md",
        // brand ring
        "ring-1 ring-ocean-blue/10 shadow-soft",
        // pop-out on hover/focus (GPU for smoother transforms)
        "transform-gpu transition-all duration-300 ease-out-soft",
        "motion-safe:hover:-translate-y-0.5 motion-safe:hover:scale-[1.01] motion-safe:hover:shadow-pop",
        "motion-safe:focus-within:-translate-y-0.5 motion-safe:focus-within:shadow-pop",
        // subtle inner gradient glow on hover using ::before
        "before:absolute before:inset-0 before:-z-10 before:rounded-2xl before:opacity-0",
        "before:transition before:duration-300 before:blur-xl",
        "before:bg-[radial-gradient(140px_140px_at_20%_20%,rgba(37,99,235,.22),transparent_60%),radial-gradient(160px_160px_at_80%_80%,rgba(16,185,129,.22),transparent_60%)]",
        "group-hover:before:opacity-100",
        // focus ring accent
        "focus-within:ring-2 focus-within:ring-ocean-blue/30",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}
