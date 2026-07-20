import toolboxUrl from '@/assets/maintenance-toolbox.png';

/**
 * Premium 3D maintenance illustration: a glossy green toolbox with a house
 * badge, a chrome fluted screwdriver (green collar, sprouting leaf), a green
 * pipe over the rim, a right-leaning green spanner, a black-handled screwdriver,
 * and a separate green spanner resting on a silver hex nut. Rendered from the
 * source 3D artwork with a transparent background so it sits cleanly on the
 * mint hero gradient.
 */
export default function MaintenanceToolbox({ className }: { className?: string }) {
  return (
    <img
      src={toolboxUrl}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={className}
    />
  );
}
