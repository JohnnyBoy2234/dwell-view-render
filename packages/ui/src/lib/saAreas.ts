// Built-in list of common South African areas/suburbs. Used as an instant,
// no-key fallback for area suggestions (the same set the web search uses), so a
// dropdown always shows even when Google Places isn't configured. When a Google
// Maps key IS present, live predictions supersede this list.
export const SA_AREAS: string[] = [
  // ── Cape Town & surrounds ────────────────────────────────────────────────
  "Cape Town",
  "Sea Point, Cape Town", "Green Point, Cape Town", "Mouille Point, Cape Town",
  "De Waterkant, Cape Town", "Bo-Kaap, Cape Town", "Gardens, Cape Town",
  "Tamboerskloof, Cape Town", "Oranjezicht, Cape Town", "Vredehoek, Cape Town",
  "City Centre, Cape Town", "Woodstock, Cape Town", "Salt River, Cape Town",
  "Observatory, Cape Town", "Mowbray, Cape Town", "Rosebank, Cape Town",
  "Rondebosch, Cape Town", "Newlands, Cape Town", "Claremont, Cape Town",
  "Kenilworth, Cape Town", "Wynberg, Cape Town", "Plumstead, Cape Town",
  "Bishopscourt, Cape Town", "Constantia, Cape Town", "Tokai, Cape Town",
  "Meadowridge, Cape Town", "Bergvliet, Cape Town", "Diep River, Cape Town",
  "Hout Bay, Cape Town", "Llandudno, Cape Town", "Camps Bay, Cape Town",
  "Clifton, Cape Town", "Bantry Bay, Cape Town", "Fresnaye, Cape Town",
  "Muizenberg, Cape Town", "Kalk Bay, Cape Town", "Fish Hoek, Cape Town",
  "Simon's Town, Cape Town", "Noordhoek, Cape Town", "Kommetjie, Cape Town",
  "Bloubergstrand, Cape Town", "Table View, Cape Town", "Parklands, Cape Town",
  "Milnerton, Cape Town", "Century City, Cape Town", "Sunningdale, Cape Town",
  "Melkbosstrand, Cape Town", "Edgemead, Cape Town", "Panorama, Cape Town",
  "Plattekloof, Cape Town", "Goodwood, Cape Town", "Parow, Cape Town",
  "Bellville, Cape Town", "Durbanville, Cape Town", "Brackenfell, Cape Town",
  "Kraaifontein, Cape Town", "Kuils River, Cape Town", "Pinelands, Cape Town",
  "Rondebosch East, Cape Town", "Athlone, Cape Town", "Grassy Park, Cape Town",
  "Ottery, Cape Town", "Retreat, Cape Town",
  "Stellenbosch", "Somerset West", "Strand", "Gordon's Bay", "Paarl",
  "Franschhoek", "Wellington", "Kuils River",
  // ── Johannesburg & surrounds ─────────────────────────────────────────────
  "Johannesburg",
  "Sandton", "Sandton Central", "Morningside, Sandton", "Rivonia, Sandton",
  "Bryanston", "Bryanston East", "Fourways", "Lonehill", "Sunninghill",
  "Woodmead", "Douglasdale", "Northriding", "Bloubosrand", "North Riding",
  "Rosebank, Johannesburg", "Melrose, Johannesburg", "Melrose Arch, Johannesburg",
  "Illovo, Johannesburg", "Hyde Park, Johannesburg", "Dunkeld, Johannesburg",
  "Parktown, Johannesburg", "Parktown North, Johannesburg", "Parkview, Johannesburg",
  "Parkhurst, Johannesburg", "Parkwood, Johannesburg", "Saxonwold, Johannesburg",
  "Houghton, Johannesburg", "Killarney, Johannesburg", "Greenside, Johannesburg",
  "Emmarentia, Johannesburg", "Linden, Johannesburg", "Melville, Johannesburg",
  "Craighall Park, Johannesburg", "Blairgowrie, Johannesburg", "Ferndale, Randburg",
  "Randburg", "Cresta, Randburg", "Northcliff, Johannesburg", "Fairland, Johannesburg",
  "Roodepoort", "Florida, Roodepoort", "Weltevreden Park", "Constantia Kloof",
  "Midrand", "Waterfall, Midrand", "Halfway House, Midrand", "Noordwyk, Midrand",
  "Edenvale", "Bedfordview", "Kensington, Johannesburg", "Germiston",
  "Boksburg", "Benoni", "Kempton Park", "Alberton", "Brakpan", "Springs",
  "Soweto", "Lenasia",
  // ── Pretoria / Tshwane ───────────────────────────────────────────────────
  "Pretoria",
  "Brooklyn, Pretoria", "Hatfield, Pretoria", "Arcadia, Pretoria",
  "Waterkloof, Pretoria", "Waterkloof Ridge, Pretoria", "Lynnwood, Pretoria",
  "Lynnwood Ridge, Pretoria", "Menlo Park, Pretoria", "Menlyn, Pretoria",
  "Garsfontein, Pretoria", "Faerie Glen, Pretoria", "Moreleta Park, Pretoria",
  "Silver Lakes, Pretoria", "Equestria, Pretoria", "Wapadrand, Pretoria",
  "Groenkloof, Pretoria", "Muckleneuk, Pretoria", "Sunnyside, Pretoria",
  "Villieria, Pretoria", "Queenswood, Pretoria", "Montana, Pretoria",
  "Wonderboom, Pretoria", "Annlin, Pretoria", "Sinoville, Pretoria",
  "Centurion", "Highveld, Centurion", "Wierdapark, Centurion",
  "Eldoraigne, Centurion", "Rooihuiskraal, Centurion", "Midstream Estate",
  "Irene, Centurion",
  // ── Durban / eThekwini ───────────────────────────────────────────────────
  "Durban",
  "Umhlanga", "Umhlanga Rocks", "La Lucia, Durban", "Ballito", "Umdloti",
  "Durban North", "Morningside, Durban", "Glenwood, Durban", "Berea, Durban",
  "Musgrave, Durban", "Essenwood, Durban", "Windermere, Durban",
  "Westville", "Westville North", "Pinetown", "Kloof", "Hillcrest",
  "Gillitts", "Waterfall, KZN", "Amanzimtoti", "Queensburgh", "Chatsworth",
  "Phoenix, Durban", "Verulam", "Tongaat",
  // ── Eastern Cape ─────────────────────────────────────────────────────────
  "Gqeberha (Port Elizabeth)", "Port Elizabeth", "Summerstrand, Gqeberha",
  "Walmer, Gqeberha", "Newton Park, Gqeberha", "Mill Park, Gqeberha",
  "East London", "Vincent, East London", "Beacon Bay, East London",
  "Nahoon, East London", "Gonubie, East London", "Mthatha", "Grahamstown (Makhanda)",
  "Jeffreys Bay",
  // ── Garden Route & Western Cape towns ────────────────────────────────────
  "George", "Knysna", "Plettenberg Bay", "Mossel Bay", "Sedgefield",
  "Hermanus", "Kleinmond", "Gansbaai", "Langebaan", "Saldanha", "Vredenburg",
  "Worcester", "Robertson", "Swellendam", "Oudtshoorn",
  // ── Free State ───────────────────────────────────────────────────────────
  "Bloemfontein", "Universitas, Bloemfontein", "Langenhoven Park, Bloemfontein",
  "Welkom", "Bethlehem", "Clarens",
  // ── Gauteng (other) / North West / Mpumalanga / Limpopo ──────────────────
  "Vereeniging", "Vanderbijlpark", "Krugersdorp", "Potchefstroom",
  "Rustenburg", "Klerksdorp", "Mahikeng",
  "Nelspruit (Mbombela)", "White River", "Witbank (eMalahleni)", "Middelburg, Mpumalanga",
  "Secunda", "Ermelo",
  "Polokwane", "Tzaneen", "Thohoyandou",
  // ── Northern Cape ────────────────────────────────────────────────────────
  "Kimberley", "Upington",
];

/** Case-insensitive substring match against the built-in areas, capped. */
export function matchSaAreas(query: string, limit = 6): string[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  // Prefer names that START with the query, then any substring match, so
  // "sea" surfaces "Sea Point" ahead of "…Chelsea…"-style incidental hits.
  const starts: string[] = [];
  const contains: string[] = [];
  for (const a of SA_AREAS) {
    const lower = a.toLowerCase();
    if (lower.startsWith(q)) starts.push(a);
    else if (lower.includes(q)) contains.push(a);
  }
  return [...starts, ...contains].slice(0, limit);
}
