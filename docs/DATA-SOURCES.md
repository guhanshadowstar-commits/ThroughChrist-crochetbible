# Data sources

Where each Bible text came from, under what license, and how it is handled. The credit lines the licenses require are
in [`ATTRIBUTION.md`](../ATTRIBUTION.md) and inside the app (Settings, Credits and licenses). Both are generated from
[`pipeline/versions.mjs`](../pipeline/versions.mjs).

## The source

Everything comes from **eBible.org** (https://ebible.org), which publishes Bible translations in open formats and records each
translation's license. The index (`translations.csv`) was read to find every English and Tamil text marked redistributable.
`npm run fetch` (`pipeline/fetch-sources.mjs`) downloads each text's *verse per line* zip (`<id>_vpl.zip`) into `data/raw/<id>/`.
Nothing in `data/raw` is edited. The repository does not contain the texts: GitHub Actions downloads them during every build.

**File format.** One line per verse: `GEN 1:1 In the beginning God created the heavens and the earth.`
Book codes are the 3-letter codes in `core/books.mjs`. Deuterocanonical books are skipped (the app has the 66-book canon).

## The 11 texts

| App id | Version | eBible id | License | Notes |
|---|---|---|---|---|
| en-web | World English Bible | engwebp | Public domain | Modern English; default English version |
| en-kjv | King James Version (1769 text) | eng-kjv2006 | Public domain outside the UK | In the UK the KJV has a Crown letters patent: printing there, or importing printed copies, needs permission |
| en-bsb | Berean Standard Bible | engbsb | Public domain | Omits 16 verses absent from the earliest manuscripts |
| en-asv | American Standard Version (1901) | eng-asv | Public domain | 16 verses are blank in the source (omitted) |
| en-ylt | Young's Literal Translation | engylt | Public domain | Very literal word order |
| en-bbe | Bible in Basic English | engBBE | Public domain per eBible.org | Status differs by country; 16 verses blank |
| en-dby | Darby Translation | engDBY | Public domain | Omits Matt 23:14, Acts 8:37, Acts 15:34 |
| en-gnv | Geneva Bible (1599) | enggnv | Public domain | 16th-century spelling (so "loved" does not match "loued"); some numbering differs from the KJV |
| en-wbt | Webster Bible (1833) | engwebster | Public domain | A light revision of the KJV |
| ta-irv | Tamil Indian Revised Version | tam2017 | **CC BY-SA 4.0**, © Bridge Connectivity Solutions | Default Tamil version; used unmodified |
| ta-tcv | Biblica Open Tamil Contemporary Version | tamtcv | **CC BY-SA 4.0**, © Biblica, Inc. | Biblica® trademark must stay intact while unmodified; Psalm 1:2 is merged into 1:1 |

**CC BY-SA means share-alike:** wherever the Tamil text is redistributed, the credit must travel with it and the text stays under the same license.
The Tamil text is stored exactly as published. Application code is separate from the texts.

## What was left out, and why

- **Douay-Rheims 1899:** uses Vulgate Psalm numbering and the deuterocanon, so its verses do not line up with the others without a numbering map (5,513 extra and 804 missing verse ids against the KJV).
- **Tamil Easy-to-Read Version (tam2008):** marked not redistributable.
- **Old Tamil Union Version:** no openly licensed copy was found in the eBible index.
- **Copyrighted translations (NIV, ESV, NLT, current Tamil Bible Society editions):** cannot be bundled freely. The project is limited to public-domain and open-license texts.

## Differences between versions

Verses are matched across versions by verse id. After checking every version's verse ids against the KJV:

- `ta-irv` and `ta-tcv` have an extra verse, **3 John 1:15** (the English texts have 14 verses). `ta-tcv` is missing Psalm 1:2 (merged into 1:1).
- `en-web` has Romans 14:24-26 and lacks 16:26-27 (it moves the closing doxology); 5 verses are blank.
- `en-gnv` has 27 extra and 39 missing verse ids (for example Daniel 3 and 4, Ecclesiastes 4 and 5, 1 Samuel 20 and 23, 2 Corinthians 13).
- `en-bsb`, `en-asv` and `en-bbe` omit about 16 verses each (the late-manuscript verses). A verse missing from a version shows as "not in this version".
- Verse counts stored per version: WEB 31,098 · KJV 31,102 · BSB 31,086 · ASV 31,086 · YLT 31,102 · BBE 31,086 · Darby 31,099 · Geneva 31,090 · Webster 31,102 · IRV 31,103 · TCV 31,102.

So a side-by-side view can differ slightly at those few places.

## Cleaning that is applied

- **English:** the paragraph mark `¶` and the square brackets that mark supplied words are removed (they are typesetting, not text). Nothing else changes.
- **Tamil:** only surrounding spaces are trimmed.
- **Tamil book names** come from the IRV file headers (`\h`, `\toc1`, `\toc2` in `tam2017_usfm.zip`) and are stored in `core/tamil-names.gen.mjs`.

## How the data was checked

An independent script re-read every raw file with a different, minimal parser and compared each stored verse with it: **0 differences** across all 11 versions;
all Tamil verses appear word for word in the source; six anchor verses (Gen 1:1, Ps 23:1, Matt 5:3, John 3:16, Rom 8:28, Rev 22:21) are present in every version.
The ongoing tests in `pipeline/database.test.mjs` repeat the important checks on every build.
