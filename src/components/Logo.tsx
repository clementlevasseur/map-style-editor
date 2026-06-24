/** App mark — a layered-map glyph, identical to public/favicon.svg. */
export default function Logo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="#4c8dff" />
      <g fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
        <path d="M16 6 L26 11 L16 16 L6 11 Z" fill="#ffffff" />
        <path d="M6 16 L16 21 L26 16" />
        <path d="M6 21 L16 26 L26 21" />
      </g>
    </svg>
  );
}
