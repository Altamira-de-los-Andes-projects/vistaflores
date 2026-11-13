// Countries for the contact form: ISO 3166-1 code and international dialling prefix. Names come from the browser
// (Intl.DisplayNames), so they follow the site's language without a translation table.
// All countries that share +1 (US, Canada, the Caribbean…) list "1": their area code is part of the number itself.
const RAW =
  'AF93 AL355 DZ213 AS1 AD376 AO244 AI1 AG1 AR54 AM374 AW297 AU61 AT43 AZ994 BS1 BH973 BD880 BB1 BY375 BE32 BZ501 BJ229 BM1 BT975 BO591 BQ599 BA387 BW267 BR55 VG1 BN673 BG359 BF226 BI257 ' +
  'KH855 CM237 CA1 CV238 KY1 CF236 TD235 CL56 CN86 CO57 KM269 CG242 CD243 CK682 CR506 CI225 HR385 CU53 CW599 CY357 CZ420 DK45 DJ253 DM1 DO1 EC593 EG20 SV503 GQ240 ER291 EE372 SZ268 ET251 ' +
  'FK500 FO298 FJ679 FI358 FR33 GF594 PF689 GA241 GM220 GE995 DE49 GH233 GI350 GR30 GL299 GD1 GP590 GU1 GT502 GG44 GN224 GW245 GY592 HT509 HN504 HK852 HU36 IS354 IN91 ID62 IR98 IQ964 IE353 ' +
  'IM44 IL972 IT39 JM1 JP81 JE44 JO962 KZ7 KE254 KI686 KW965 KG996 LA856 LV371 LB961 LS266 LR231 LY218 LI423 LT370 LU352 MO853 MG261 MW265 MY60 MV960 ML223 MT356 MH692 MQ596 MR222 MU230 ' +
  'YT262 MX52 FM691 MD373 MC377 MN976 ME382 MS1 MA212 MZ258 MM95 NA264 NR674 NP977 NL31 NC687 NZ64 NI505 NE227 NG234 NU683 KP850 MK389 MP1 NO47 OM968 PK92 PW680 PS970 PA507 PG675 PY595 ' +
  'PE51 PH63 PL48 PT351 PR1 QA974 RE262 RO40 RU7 RW250 BL590 SH290 KN1 LC1 MF590 PM508 VC1 WS685 SM378 ST239 SA966 SN221 RS381 SC248 SL232 SG65 SX1 SK421 SI386 SB677 SO252 ZA27 KR82 SS211 ' +
  'ES34 LK94 SD249 SR597 SE46 CH41 SY963 TW886 TJ992 TZ255 TH66 TL670 TG228 TK690 TO676 TT1 TN216 TR90 TM993 TC1 TV688 UG256 UA380 AE971 GB44 US1 UY598 UZ998 VU678 VA39 VE58 VN84 VI1 ' +
  'WF681 EH212 YE967 ZM260 ZW263';

export type Country = { code: string; dial: string; name: string };

const regionName = (lang: string) => {
  try {
    return new Intl.DisplayNames([lang], { type: 'region' });
  } catch {
    return new Intl.DisplayNames(['en'], { type: 'region' }); // a language the browser doesn't know
  }
};

/** lower case, no accents: "Perú", "peru" and "PERU" are the same search */
export const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const cache = new Map<string, Country[]>();
/** every country with its name in `lang`, sorted by that name */
export function countries(lang: string): Country[] {
  let list = cache.get(lang);
  if (!list) {
    const names = regionName(lang);
    list = RAW.split(' ')
      .map((c) => ({ code: c.slice(0, 2), dial: c.slice(2), name: names.of(c.slice(0, 2)) ?? c.slice(0, 2) }))
      .sort((a, b) => a.name.localeCompare(b.name, lang));
    cache.set(lang, list);
  }
  return list;
}
