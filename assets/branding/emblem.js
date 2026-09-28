// Original emblem: heater shield + upright golden sword. Drawn in a 1024 box; `scale` shrinks it around the center.
module.exports = function emblem({ scale = 1, mono = false } = {}) {
  const c = (color) => (mono ? '#ffffff' : color);
  return `<g transform="translate(512 512) scale(${scale}) translate(-512 -512)">
    <defs>
      <linearGradient id="shield" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${c('#6e3b24')}"/><stop offset="1" stop-color="${c('#3d1f12')}"/>
      </linearGradient>
      <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${c('#ffe8a3')}"/><stop offset="0.5" stop-color="${c('#e3b545')}"/><stop offset="1" stop-color="${c('#9c7322')}"/>
      </linearGradient>
      <linearGradient id="blade" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="${c('#ffffff')}"/><stop offset="0.5" stop-color="${c('#d6dbe3')}"/><stop offset="1" stop-color="${c('#8e98aa')}"/>
      </linearGradient>
    </defs>
    ${mono ? '' : `<path d="M512 150 L800 240 L780 560 Q760 760 512 880 Q264 760 244 560 L224 240 Z" fill="url(#shield)" stroke="url(#gold)" stroke-width="28" stroke-linejoin="round"/>
    <path d="M512 196 L756 272 L738 556 Q720 728 512 832 Q304 728 286 556 L268 272 Z" fill="none" stroke="#2a150c" stroke-width="10" opacity="0.6"/>`}
    ${mono ? `<path d="M512 150 L800 240 L780 560 Q760 760 512 880 Q264 760 244 560 L224 240 Z" fill="none" stroke="#fff" stroke-width="40" stroke-linejoin="round"/>` : ''}
    <path d="M512 120 L552 200 L552 640 L472 640 L472 200 Z" fill="url(#blade)" stroke="${c('#4a4f58')}" stroke-width="8"/>
    ${mono ? '' : '<path d="M512 160 L512 630" stroke="#8e98aa" stroke-width="8"/>'}
    <rect x="352" y="632" width="320" height="48" rx="24" fill="url(#gold)" stroke="${c('#6e5218')}" stroke-width="6"/>
    <rect x="490" y="680" width="44" height="120" rx="10" fill="${c('#5a3a22')}"/>
    <circle cx="512" cy="830" r="40" fill="url(#gold)" stroke="${c('#6e5218')}" stroke-width="6"/>
  </g>`;
};
