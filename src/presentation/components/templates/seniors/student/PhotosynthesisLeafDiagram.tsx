/** Inline leaf diagram -never depends on static-file routing under /seniors. */
export function PhotosynthesisLeafDiagram({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 520 360"
      fill="none"
      role="img"
      aria-labelledby="psTitle psDesc"
      className={className}
    >
      <title id="psTitle">Photosynthesis in Leaf</title>
      <desc id="psDesc">
        Leaf diagram showing sunlight, carbon dioxide and water as inputs, and oxygen and
        glucose as outputs.
      </desc>
      <rect width="520" height="360" rx="16" fill="#F8FAFC" />
      <ellipse cx="260" cy="185" rx="118" ry="78" fill="#4ADE80" stroke="#16A34A" strokeWidth="3" />
      <ellipse cx="260" cy="185" rx="92" ry="56" fill="#86EFAC" opacity="0.55" />
      <path d="M260 112 C250 160 250 210 260 258" stroke="#15803D" strokeWidth="3" strokeLinecap="round" />
      <path d="M260 150 C220 165 200 185 210 210" stroke="#15803D" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      <path d="M260 150 C300 165 320 185 310 210" stroke="#15803D" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      <circle cx="260" cy="42" r="22" fill="#FDE047" stroke="#EAB308" strokeWidth="2" />
      <g stroke="#FACC15" strokeWidth="2.5" strokeLinecap="round">
        <line x1="260" y1="8" x2="260" y2="16" />
        <line x1="260" y1="68" x2="260" y2="76" />
        <line x1="226" y1="42" x2="234" y2="42" />
        <line x1="286" y1="42" x2="294" y2="42" />
      </g>
      <text x="260" y="92" textAnchor="middle" fill="#854D0E" fontFamily="system-ui,sans-serif" fontSize="13" fontWeight="600">
        Sunlight
      </text>
      <path d="M260 98 L260 118" stroke="#EAB308" strokeWidth="2.5" markerEnd="url(#arrowY)" />
      <rect x="28" y="150" width="108" height="36" rx="10" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="1.5" />
      <text x="82" y="173" textAnchor="middle" fill="#1D4ED8" fontFamily="system-ui,sans-serif" fontSize="12" fontWeight="600">
        CO₂
      </text>
      <text x="82" y="140" textAnchor="middle" fill="#64748B" fontFamily="system-ui,sans-serif" fontSize="11">
        Carbon Dioxide
      </text>
      <path d="M138 168 L148 168" stroke="#3B82F6" strokeWidth="2.5" markerEnd="url(#arrowB)" />
      <rect x="28" y="230" width="108" height="36" rx="10" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="1.5" />
      <text x="82" y="253" textAnchor="middle" fill="#1D4ED8" fontFamily="system-ui,sans-serif" fontSize="12" fontWeight="600">
        H₂O
      </text>
      <text x="82" y="220" textAnchor="middle" fill="#64748B" fontFamily="system-ui,sans-serif" fontSize="11">
        Water
      </text>
      <path d="M138 248 L148 210" stroke="#3B82F6" strokeWidth="2.5" markerEnd="url(#arrowB)" />
      <path d="M372 150 L390 150" stroke="#16A34A" strokeWidth="2.5" markerEnd="url(#arrowG)" />
      <rect x="392" y="132" width="100" height="36" rx="10" fill="#DCFCE7" stroke="#16A34A" strokeWidth="1.5" />
      <text x="442" y="155" textAnchor="middle" fill="#15803D" fontFamily="system-ui,sans-serif" fontSize="12" fontWeight="600">
        O₂
      </text>
      <text x="442" y="122" textAnchor="middle" fill="#64748B" fontFamily="system-ui,sans-serif" fontSize="11">
        Oxygen
      </text>
      <path d="M372 220 L390 248" stroke="#16A34A" strokeWidth="2.5" markerEnd="url(#arrowG)" />
      <rect x="392" y="230" width="100" height="36" rx="10" fill="#DCFCE7" stroke="#16A34A" strokeWidth="1.5" />
      <text x="442" y="253" textAnchor="middle" fill="#15803D" fontFamily="system-ui,sans-serif" fontSize="12" fontWeight="600">
        C₆H₁₂O₆
      </text>
      <text x="442" y="220" textAnchor="middle" fill="#64748B" fontFamily="system-ui,sans-serif" fontSize="11">
        Glucose
      </text>
      <defs>
        <marker id="arrowY" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#EAB308" />
        </marker>
        <marker id="arrowB" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#3B82F6" />
        </marker>
        <marker id="arrowG" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#16A34A" />
        </marker>
      </defs>
    </svg>
  );
}
