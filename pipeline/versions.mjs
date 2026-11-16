// Registry of every Bible text bundled in the app.
// Only public-domain or openly licensed (CC BY-SA) texts belong here.
// `source` is the eBible.org translation id; the raw files live in data/raw/<source>/.

export const VERSIONS = [
  // ---------- English ----------
  {
    id: 'en-web', lang: 'en', source: 'engwebp', abbr: 'WEB', default: true,
    name: 'World English Bible',
    license: 'Public Domain',
    attribution: 'World English Bible (WEB). Public domain.',
    notes: 'Modern English. Omits the Deuterocanon/Apocrypha.',
    stripMarkup: true,
  },
  {
    id: 'en-kjv', lang: 'en', source: 'eng-kjv2006', abbr: 'KJV',
    name: 'King James Version',
    license: 'Public Domain (outside the UK)',
    attribution: 'King James (Authorized) Version, 1769 text. Public domain.',
    notes: 'In the United Kingdom the KJV is subject to a Crown letters patent; eBible.org says printing it there, or importing printed copies, needs permission. Check with the rights holders before distributing an app in the UK.',
    stripMarkup: true,
  },
  {
    id: 'en-bsb', lang: 'en', source: 'engbsb', abbr: 'BSB',
    name: 'Berean Standard Bible',
    license: 'Public Domain',
    attribution: 'Berean Standard Bible (BSB), BSB Publishing, LLC. Dedicated to the public domain.',
    notes: 'Omits some verses that are not in the earliest manuscripts (about 16 verses).',
    stripMarkup: true,
  },
  {
    id: 'en-asv', lang: 'en', source: 'eng-asv', abbr: 'ASV',
    name: 'American Standard Version (1901)',
    license: 'Public Domain',
    attribution: 'American Standard Version (1901). Public domain.',
    notes: 'A handful of verses are blank because the ASV omits them.',
    stripMarkup: true,
  },
  {
    id: 'en-ylt', lang: 'en', source: 'engylt', abbr: 'YLT',
    name: "Young's Literal Translation",
    license: 'Public Domain',
    attribution: "Young's Literal Translation (1898). Public domain.",
    notes: 'Very literal; often uses unusual word order.',
    stripMarkup: true,
  },
  {
    id: 'en-bbe', lang: 'en', source: 'engBBE', abbr: 'BBE',
    name: 'Bible in Basic English',
    license: 'Public Domain (per eBible.org)',
    attribution: 'Bible in Basic English (1965). Treated as public domain per eBible.org.',
    notes: 'Public-domain status differs between countries; eBible.org lists it as redistributable.',
    stripMarkup: true,
  },
  {
    id: 'en-dby', lang: 'en', source: 'engDBY', abbr: 'DBY',
    name: 'Darby Translation',
    license: 'Public Domain',
    attribution: 'Darby Translation (1890). Public domain.',
    notes: 'Omits three verses (Matt 23:14, Acts 8:37, Acts 15:34).',
    stripMarkup: true,
  },
  {
    id: 'en-gnv', lang: 'en', source: 'enggnv', abbr: 'GNV',
    name: 'Geneva Bible (1599)',
    license: 'Public Domain',
    attribution: 'Geneva Bible (1599). Public domain.',
    notes: 'Original 16th-century spelling (u/v, i/j), so modern spellings like "loved" will not match. Some verse numbering differs from the KJV.',
    stripMarkup: true,
  },
  {
    id: 'en-wbt', lang: 'en', source: 'engwebster', abbr: 'WBT',
    name: 'Webster Bible (1833)',
    license: 'Public Domain',
    attribution: "Noah Webster's Bible (1833). Public domain.",
    notes: 'A light revision of the KJV.',
    stripMarkup: true,
  },

  // ---------- Tamil ----------
  {
    id: 'ta-irv', lang: 'ta', source: 'tam2017', abbr: 'IRV', default: true,
    name: 'இண்டியன் ரிவைஸ்டு வெர்ஸன் (IRV)',
    license: 'CC BY-SA 4.0',
    attribution: 'Tamil Indian Revised Version (IRV), Copyright © 2017, 2019 Bridge Connectivity Solutions. Licensed CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/). Source: https://ebible.org/tam2017/. The text is used unmodified.',
    notes: 'Share-alike: the Tamil text stays under CC BY-SA 4.0 wherever it is redistributed. Verse 3 John 1:15 exists (3 John is split into 15 verses).',
    stripMarkup: false,
  },
  {
    id: 'ta-tcv', lang: 'ta', source: 'tamtcv', abbr: 'TCV',
    name: 'Biblica® திறந்தநிலை தமிழ் சமகால பதிப்பு',
    license: 'CC BY-SA 4.0',
    attribution: 'Biblica® Open Tamil Contemporary Version™ (திறந்தநிலை தமிழ் சமகால பதிப்பு™), Copyright © 2005, 2020, 2022 Biblica, Inc. Original work by Biblica, Inc. is freely available at www.biblica.com and open.bible. Licensed CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/). The text is used unmodified.',
    notes: 'Biblica® is a registered trademark. It must be kept intact while the text is unmodified; remove the trademark if the text is ever changed. Psalm 1:2 is merged into Psalm 1:1.',
    stripMarkup: false,
  },
];

export const VERSION_BY_ID = Object.fromEntries(VERSIONS.map((v) => [v.id, v]));
