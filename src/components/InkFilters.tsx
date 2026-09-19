export function InkFilters() {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" className="filter-defs">
      <filter id="graphite" x="-2%" y="-2%" width="104%" height="104%">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="1.1"
          numOctaves="2"
          seed="7"
          result="noise"
        />
        <feColorMatrix
          in="noise"
          type="matrix"
          values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.4 2.05"
          result="grain"
        />
        <feComposite in="SourceGraphic" in2="grain" operator="in" />
      </filter>
      <filter id="ink" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.05"
          numOctaves="2"
          seed="4"
          result="noise"
        />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.4" />
      </filter>
    </svg>
  );
}
