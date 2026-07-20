import walletUrl from '@/assets/payments-wallet.png';

/**
 * Premium 3D payments illustration: a glossy teal wallet with cards fanning out
 * of the top and a snap-button on the side. Rendered from the source 3D artwork
 * with a transparent background so it sits cleanly on the Payments module's soft
 * teal hero. Shared by the hero (large) and the empty state (smaller).
 */
export default function PaymentsWallet({ className }: { className?: string }) {
  return (
    <img
      src={walletUrl}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={className}
    />
  );
}
