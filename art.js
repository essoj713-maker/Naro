const box = (b) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">${b}</svg>`;
const eyes = (c, y = 112) => `<ellipse cx="76" cy="${y}" rx="11" ry="16" fill="${c}"/><ellipse cx="124" cy="${y}" rx="11" ry="16" fill="${c}"/><circle cx="80" cy="${y-7}" r="4.5" fill="#fff"/><circle cx="128" cy="${y-7}" r="4.5" fill="#fff"/>`;
const cheeks = `<ellipse cx="55" cy="136" rx="11" ry="6" fill="#FF8FB5"/><ellipse cx="145" cy="136" rx="11" ry="6" fill="#FF8FB5"/>`;
const smile = (c) => `<path d="M86 138 Q100 154 114 138" fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round"/>`;
export const CHARS = [
 { name: 'القطقوط', svg: box(`<path d="M42 82L38 22L90 54ZM158 82L162 22L110 54Z" fill="#0F6B4E"/><ellipse cx="100" cy="115" rx="75" ry="68" fill="#0F6B4E"/><ellipse cx="100" cy="132" rx="58" ry="46" fill="#E4F7EC"/>${eyes('#14231D')}${cheeks}${smile('#14231D')}`) },
 { name: 'السحابة', svg: box(`<path d="M64 54L70 20L92 44ZM136 54L130 20L108 44Z" fill="#2B6CB0"/><g fill="#BFE0FF"><circle cx="62" cy="112" r="42"/><circle cx="100" cy="88" r="52"/><circle cx="142" cy="115" r="40"/><rect x="52" y="110" width="100" height="52" rx="26"/></g>${eyes('#1A365D')}${cheeks}${smile('#1A365D')}`) },
 { name: 'النينجا', svg: box(`<path d="M40 85L45 25L90 52ZM160 85L155 25L110 52Z" fill="#26213A"/><circle cx="100" cy="112" r="72" fill="#26213A"/><rect x="38" y="85" width="124" height="52" rx="26" fill="#FFE3CF"/><path d="M31 76Q100 58 169 76L168 90Q100 74 32 90Z" fill="#E5484D"/>${eyes('#26213A')}`) },
 { name: 'الناري', svg: box(`<path d="M100 12Q122 48 144 52L150 28Q188 80 170 130Q154 184 100 184Q46 184 30 130Q18 88 52 44L68 70Q74 38 100 12Z" fill="#FF7A30"/><ellipse cx="100" cy="128" rx="46" ry="48" fill="#FFD25A"/>${eyes('#4A1D08',118)}${smile('#4A1D08')}`) },
 { name: 'الفضائي', svg: box(`<circle cx="100" cy="104" r="84" fill="#E8E4FF" stroke="#7B61D9" stroke-width="7"/><path d="M52 90L55 48L88 66ZM148 90L145 48L112 66Z" fill="#7B61D9"/><circle cx="100" cy="116" r="56" fill="#7B61D9"/>${eyes('#1E1440')}${smile('#fff')}`) },
 { name: 'النعسان', svg: box(`<path d="M42 90Q30 30 56 30Q80 40 88 60ZM158 90Q170 30 144 30Q120 40 112 60Z" fill="#F28AB2"/><circle cx="100" cy="115" r="70" fill="#FFB8D2"/><path d="M62 108Q76 122 90 108M110 108Q124 122 138 108" fill="none" stroke="#4A1830" stroke-width="5" stroke-linecap="round"/>${cheeks}<circle cx="100" cy="142" r="7" fill="#4A1830"/>`) },
];
const scene = (c, b) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 400" preserveAspectRatio="xMidYMid slice"><rect width="200" height="400" fill="${c}"/>${b}</svg>`;
const dots = (c, p, r = 3) => p.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`).join('');
const stars = [[30,40],[70,95],[160,140],[45,200],[110,30],[175,260],[90,300]];
const cloud = (x, y) => `<g fill="#fff"><circle cx="${x}" cy="${y}" r="20"/><circle cx="${x+26}" cy="${y-10}" r="27"/><circle cx="${x+52}" cy="${y+2}" r="19"/></g>`;
export const BGS = [
 { name: 'ليلة أنمي', dark: true, svg: scene('#17184A', `<circle cx="150" cy="70" r="28" fill="#FFE9A8"/><circle cx="139" cy="62" r="25" fill="#17184A"/>${dots('#fff', stars)}<path d="M0 350Q55 305 110 345T200 335V400H0Z" fill="#0B0C2A"/>`) },
 { name: 'ساكورا', svg: scene('#FFDCE8', `${dots('#FF8FB5', [[40,50],[90,90],[120,28]], 18)}${dots('#F0679A', stars, 5)}<path d="M0 370Q100 330 200 370V400H0Z" fill="#B8E0B0"/>`) },
 { name: 'سما صافية', svg: scene('#BDE5FF', `<circle cx="160" cy="55" r="26" fill="#FFD84D"/>${cloud(25,110)}${cloud(110,240)}${cloud(15,330)}`) },
 { name: 'غروب', svg: scene('#FFD0A0', `<circle cx="100" cy="290" r="55" fill="#FFE08A"/><rect y="290" width="200" height="110" fill="#8A63B0"/>`) },
 { name: 'مطر', dark: true, svg: scene('#3E5470', `${cloud(20,50)}${cloud(115,70)}` + stars.map(([x,y]) => `<path d="M${x} ${y+60}l-8 20" stroke="#BFE0FF" stroke-width="3"/>`).join('')) },
 { name: 'غابة', svg: scene('#CDEFD9', `<path d="M-10 360L45 220L100 360ZM95 360L155 190L215 360Z" fill="#4C9A72"/><path d="M35 380L100 250L165 380Z" fill="#0F6B4E"/><rect y="375" width="200" height="25" fill="#0A4A36"/>`) },
 { name: 'فضاء', dark: true, svg: scene('#241547', `<circle cx="55" cy="110" r="32" fill="#FF8FB5"/><ellipse cx="55" cy="110" rx="52" ry="11" fill="none" stroke="#FFD84D" stroke-width="4"/><circle cx="145" cy="300" r="24" fill="#6FD3C7"/>${dots('#fff', stars, 2)}`) },
 { name: 'مدينة', dark: true, svg: scene('#2A2F6B', `<path d="M0 270H35V210H75V290H100V180H145V260H170V230H200V400H0Z" fill="#12142F"/>${dots('#FFD84D', [[50,230],[115,200],[130,230],[20,300],[185,250],[90,320]], 4)}`) },
];
const ic = (d) => (color) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
export const ICONS = {
 chat: ic('M4 4h16v12H9l-5 4z'),
 naro: ic('M4 11V3l5 3h6l5-3v8a8 9 0 01-16 0zM9 12h.01M15 12h.01M10 16q2 1.5 4 0'),
 store: ic('M5 8h14l-1 13H6zM9 8V6a3 3 0 016 0v2'),
 fun: ic('M12 3a9 9 0 100 18 9 9 0 000-18zM8 14q4 5 8 0M9 9h.01M15 9h.01'),
 pray: ic('M3 21h18M5 21v-7h14v7M6 14c0-5 6-5 6-10 0 5 6 5 6 10M10 21v-3a2 2 0 014 0v3'),
 more: ic('M4 6h16M4 12h16M4 18h16'),
};
