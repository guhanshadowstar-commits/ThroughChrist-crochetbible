// Names for the things a picture is made of, in English and Tamil (used by the picture editor).
const EN = {
  setting: { meadow: 'Meadow', sea: 'Sea', mountain: 'Mountain', desert: 'Desert', city: 'City', temple: 'Temple', garden: 'Garden', heaven: 'Heaven', cave: 'Cave', field: 'Field', river: 'River', house: 'House' },
  time: { day: 'Day', dawn: 'Dawn', dusk: 'Evening', night: 'Night' },
  mood: { calm: 'Calm', joy: 'Joyful', holy: 'Holy', sorrow: 'Sorrowful', storm: 'Stormy', wrath: 'Fiery', peace: 'Peaceful' },
};
const TA = {
  setting: { meadow: 'புல்வெளி', sea: 'கடல்', mountain: 'மலை', desert: 'பாலைவனம்', city: 'நகரம்', temple: 'ஆலயம்', garden: 'தோட்டம்', heaven: 'வானம்', cave: 'குகை', field: 'வயல்', river: 'ஆறு', house: 'வீடு' },
  time: { day: 'பகல்', dawn: 'விடியல்', dusk: 'மாலை', night: 'இரவு' },
  mood: { calm: 'அமைதி', joy: 'மகிழ்ச்சி', holy: 'பரிசுத்தம்', sorrow: 'துயரம்', storm: 'புயல்', wrath: 'அனல்', peace: 'சமாதானம்' },
};
const FIGURES_TA = {
  lamb: 'ஆட்டுக்குட்டி', sheep: 'ஆடு', dove: 'புறா', fish: 'மீன்', boat: 'படகு', ark: 'பேழை', lion: 'சிங்கம்', camel: 'ஒட்டகம்',
  donkey: 'கழுதை', horse: 'குதிரை', eagle: 'கழுகு', serpent: 'சர்ப்பம்', tree: 'மரம்', palm: 'பனை', cedar: 'கேதுரு', flower: 'மலர்',
  lily: 'லீலி', wheat: 'கோதுமை', grapes: 'திராட்சை', sprout: 'முளை', apple: 'கனி', cross: 'சிலுவை', heart: 'இதயம்', crown: 'கிரீடம்',
  throne: 'சிங்காசனம்', cup: 'பாத்திரம்', bread: 'அப்பம்', jar: 'ஜாடி', book: 'புத்தகம்', scroll: 'சுருள்', tablets: 'கற்பலகைகள்',
  sword: 'வாள்', shield: 'கேடயம்', helmet: 'தலைக்கவசம்', door: 'கதவு', key: 'திறவுகோல்', anchor: 'நங்கூரம்', trumpet: 'எக்காளம்',
  harp: 'வீணை', hands: 'ஜெபக் கரங்கள்', hand: 'கை', eye: 'கண்', scales: 'தராசு', well: 'கிணறு', rock: 'பாறை', tomb: 'கல்லறை',
  net: 'வலை', coins: 'நாணயங்கள்', gem: 'இரத்தினம்', spear: 'ஈட்டி', bow: 'வில்', chains: 'சங்கிலிகள்', house: 'வீடு', tent: 'கூடாரம்',
  tower: 'கோபுரம்', wall: 'மதில்', temple: 'ஆலயம்', gate: 'வாசல்', man: 'மனிதன்', man2: 'மனிதன் 2', man3: 'மனிதன் 3', woman: 'பெண்',
  woman2: 'பெண் 2', child: 'குழந்தை', king: 'ராஜா', priest: 'ஆசாரியன்', shepherd: 'மேய்ப்பன்', prophet: 'தீர்க்கதரிசி',
  warrior: 'போர்வீரன்', angel: 'தூதன்', lamp: 'விளக்கு', candle: 'மெழுகுதிரி', flame: 'தீச்சுடர்', altar: 'பலிபீடம்', spark: 'ஒளிப்பொறி',
};
const title = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export const label = (kind, key, lang) => (lang === 'ta' ? TA : EN)[kind]?.[key] ?? title(key);
export const figureLabel = (key, lang) => (lang === 'ta' ? FIGURES_TA[key] ?? title(key) : title(key));
