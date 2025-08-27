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
        "bg-white/55 dark:bg-slate-900/50 backdrop-blur-md",
        "ring-1 ring-black/5 shadow-soft",
        // pop-out on hover/focus (GPU for smoother transforms)
        "transform-gpu transition-all duration-300 ease-out-soft",
        "motion-safe:hover:-translate-y-0.5 motion-safe:hover:scale-[1.01] motion-safe:hover:shadow-pop",
        "motion-safe:focus-within:-translate-y-0.5 motion-safe:focus-within:shadow-pop",
        // subtle inner gradient glow on hover using ::before
        "before:absolute before:inset-0 before:-z-10 before:rounded-2xl before:opacity-0",
        "before:transition before:duration-300 before:blur-xl",
        "before:bg-[radial-gradient(120px_120px_at_20%_20%,rgba(37,99,235,.18),transparent_60%),radial-gradient(140px_140px_at_80%_80%,rgba(16,185,129,.18),transparent_60%)]",
        "group-hover:before:opacity-100",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}
