// nina-illustrations.jsx — refined dog & cat avatars + glyph icons
// Line-art style, recognizable, drawn at 64×64 unless noted

const Pet = ({ pet, size = 44 }) => {
  if (!pet) return null;
  const stroke = '#3d342a';
  const fill = pet.species === 'cat' ? '#efe2c2' : '#f1d9cb';
  const accent = pet.species === 'cat' ? '#b88a3a' : '#b86b4d';
  if (pet.species === 'cat') {
    return (
      <svg viewBox="0 0 64 64" width={size} height={size} aria-label={`${pet.name}, ${pet.breed}`}>
        {/* Head */}
        <path d="M14 20 L20 12 L26 22 Q32 18 38 22 L44 12 L50 20 Q54 30 50 42 Q44 54 32 54 Q20 54 14 42 Q10 30 14 20 Z"
              fill={fill} stroke={stroke} strokeWidth="1.4" strokeLinejoin="round"/>
        {/* Inner ears */}
        <path d="M18 18 L21 15 L23 19 Z" fill={accent} opacity="0.5"/>
        <path d="M46 18 L43 15 L41 19 Z" fill={accent} opacity="0.5"/>
        {/* Eyes */}
        <ellipse cx="25" cy="32" rx="2.2" ry="3" fill={stroke}/>
        <ellipse cx="39" cy="32" rx="2.2" ry="3" fill={stroke}/>
        <circle cx="25.6" cy="31" r="0.7" fill="#fff"/>
        <circle cx="39.6" cy="31" r="0.7" fill="#fff"/>
        {/* Nose */}
        <path d="M30 38 L34 38 L32 40.5 Z" fill={accent}/>
        {/* Mouth */}
        <path d="M32 41 Q30 44 28 43 M32 41 Q34 44 36 43" fill="none" stroke={stroke} strokeWidth="1.1" strokeLinecap="round"/>
        {/* Whiskers */}
        <path d="M22 38 L14 37 M22 40 L14 41 M42 38 L50 37 M42 40 L50 41"
              stroke={stroke} strokeWidth="0.7" strokeLinecap="round" opacity="0.55"/>
      </svg>
    );
  }
  // Dog
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-label={`${pet.name}, ${pet.breed}`}>
      {/* Floppy ears */}
      <path d="M14 20 Q10 30 14 40 Q18 44 20 38 L20 22 Z"
            fill={accent} opacity="0.55" stroke={stroke} strokeWidth="1.2" strokeLinejoin="round"/>
      <path d="M50 20 Q54 30 50 40 Q46 44 44 38 L44 22 Z"
            fill={accent} opacity="0.55" stroke={stroke} strokeWidth="1.2" strokeLinejoin="round"/>
      {/* Head */}
      <path d="M18 22 Q20 12 32 12 Q44 12 46 22 Q50 30 48 42 Q44 54 32 54 Q20 54 16 42 Q14 30 18 22 Z"
            fill={fill} stroke={stroke} strokeWidth="1.4" strokeLinejoin="round"/>
      {/* Snout */}
      <path d="M26 38 Q26 46 32 46 Q38 46 38 38 Z" fill="#fbf7ef" stroke={stroke} strokeWidth="1.1"/>
      {/* Eyes */}
      <circle cx="25" cy="30" r="1.8" fill={stroke}/>
      <circle cx="39" cy="30" r="1.8" fill={stroke}/>
      <circle cx="25.5" cy="29.4" r="0.6" fill="#fff"/>
      <circle cx="39.5" cy="29.4" r="0.6" fill="#fff"/>
      {/* Nose */}
      <ellipse cx="32" cy="39" rx="2.4" ry="1.8" fill={stroke}/>
      {/* Mouth */}
      <path d="M32 41 L32 43 M32 43 Q29 45 27 44 M32 43 Q35 45 37 44"
            fill="none" stroke={stroke} strokeWidth="1.1" strokeLinecap="round"/>
    </svg>
  );
};

// Generic icon renderer — 18×18 viewBox stroke icons
const Icon = ({ name, size = 18 }) => {
  const p = { width: size, height: size, viewBox: '0 0 18 18', fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const paths = {
    today:    <><circle cx="9" cy="9" r="6.5"/><path d="M9 5v4l2.5 1.5"/></>,
    schedule: <><rect x="2.5" y="3.5" width="13" height="11" rx="1.6"/><path d="M2.5 7h13M6 2v3M12 2v3"/></>,
    rebook:   <><path d="M3 9a6 6 0 1 0 1.8-4.3"/><path d="M3 3v3.5h3.5"/></>,
    clients:  <><circle cx="9" cy="6" r="2.6"/><path d="M3.5 14.5c.6-2.6 3-4 5.5-4s4.9 1.4 5.5 4"/></>,
    services: <><path d="M5 4l-2 2 6 6 2-2zM12 2l4 4-2 2-4-4z"/></>,
    money:    <><rect x="2.5" y="4.5" width="13" height="9" rx="1.4"/><circle cx="9" cy="9" r="2"/><path d="M5 9h.5M13 9h-.5"/></>,
    notes:    <><path d="M4 3h7l3 3v9H4z"/><path d="M11 3v3h3M6 8.5h6M6 11h4"/></>,
    settings: <><circle cx="9" cy="9" r="2"/><path d="M9 1.5v2M9 14.5v2M3.2 3.2l1.4 1.4M13.4 13.4l1.4 1.4M1.5 9h2M14.5 9h2M3.2 14.8l1.4-1.4M13.4 4.6l1.4-1.4"/></>,
    plus:     <path d="M9 3v12M3 9h12"/>,
    search:   <><circle cx="8" cy="8" r="4.5"/><path d="M11.5 11.5l3 3"/></>,
    phone:    <path d="M3.5 4.5c0 6 4 10 10 10l1.5-2.5-3-1.5-1.5 1.5c-1.5-.7-2.8-2-3.5-3.5l1.5-1.5L7 4l-2.5-1.5z"/>,
    msg:      <><path d="M3 4h12v8H7l-3 2.5V12H3z"/></>,
    arrow:    <><path d="M4 9h10M10 4l5 5-5 5"/></>,
    chev:     <path d="M6 4l4 5-4 5"/>,
    close:    <path d="M4 4l10 10M14 4L4 14"/>,
    check:    <path d="M3.5 9.5L7 13l7.5-8"/>,
    edit:     <><path d="M3 15h3l8-8-3-3-8 8z"/><path d="M11 4l3 3"/></>,
    receipt:  <><path d="M4 2h10v14l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5z"/><path d="M6 6h6M6 9h6M6 12h4"/></>,
    cal:      <><rect x="2.5" y="3.5" width="13" height="11" rx="1.6"/><path d="M2.5 7h13M6 2v3M12 2v3"/><circle cx="6" cy="10" r="0.8" fill="currentColor" stroke="none"/></>,
    paw:      <><ellipse cx="9" cy="13" rx="3.5" ry="2.5"/><circle cx="5" cy="8" r="1.4"/><circle cx="9" cy="6" r="1.4"/><circle cx="13" cy="8" r="1.4"/></>,
    sparkle:  <><path d="M9 2v4M9 12v4M2 9h4M12 9h4M4 4l2.5 2.5M11.5 11.5L14 14M14 4l-2.5 2.5M6.5 11.5L4 14"/></>,
    bell:     <><path d="M9 2c-2.5 0-4 1.8-4 4.5 0 3-1 4-1.5 5h11c-.5-1-1.5-2-1.5-5C13 3.8 11.5 2 9 2z"/><path d="M7 14a2 2 0 0 0 4 0"/></>,
    moon:     <path d="M14 11A6 6 0 1 1 7 4a5 5 0 0 0 7 7z"/>,
    sun:      <><circle cx="9" cy="9" r="3"/><path d="M9 1.5v2M9 14.5v2M3.2 3.2l1.4 1.4M13.4 13.4l1.4 1.4M1.5 9h2M14.5 9h2M3.2 14.8l1.4-1.4M13.4 4.6l1.4-1.4"/></>,
    map:      <><path d="M9 16s5-4.5 5-9a5 5 0 0 0-10 0c0 4.5 5 9 5 9z"/><circle cx="9" cy="7" r="2"/></>,
    dots:     <><circle cx="4.5" cy="9" r="1" fill="currentColor"/><circle cx="9" cy="9" r="1" fill="currentColor"/><circle cx="13.5" cy="9" r="1" fill="currentColor"/></>,
  };
  return <svg {...p}>{paths[name] || null}</svg>;
};

Object.assign(window, { Pet, Icon });
