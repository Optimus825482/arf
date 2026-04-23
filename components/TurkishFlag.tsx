export default function TurkishFlag({ className = "w-6 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 1200 800" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="1200" height="800" fill="#E30A17" />
      <circle cx="425" cy="400" r="200" fill="#ffffff" />
      <circle cx="475" cy="400" r="160" fill="#E30A17" />
      <polygon fill="#ffffff" points="583.333,400 740.852,451.173 643.513,317.151 643.513,482.849 740.852,348.827" />
    </svg>
  );
}
