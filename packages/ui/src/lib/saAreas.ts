// Built-in list of common South African areas/suburbs. Used as an instant,
// no-key fallback for area suggestions (the same set the web search uses), so a
// dropdown always shows even when Google Places isn't configured. When a Google
// Maps key IS present, live predictions supersede this list.
export const SA_AREAS: string[] = [
  // Cape Town
  "Cape Town", "Sea Point, Cape Town", "Green Point, Cape Town", "De Waterkant, Cape Town",
  "Gardens, Cape Town", "Tamboerskloof, Cape Town", "Oranjezicht, Cape Town", "Vredehoek, Cape Town",
  "Observatory, Cape Town", "Woodstock, Cape Town", "Salt River, Cape Town", "Mowbray, Cape Town",
  "Rondebosch, Cape Town", "Claremont, Cape Town", "Kenilworth, Cape Town", "Wynberg, Cape Town",
  "Constantia, Cape Town", "Hout Bay, Cape Town", "Camps Bay, Cape Town", "Clifton, Cape Town",
  "Bantry Bay, Cape Town", "Bloubergstrand, Cape Town", "Table View, Cape Town", "Milnerton, Cape Town",
  "Century City, Cape Town", "Bellville, Cape Town", "Durbanville, Cape Town", "Stellenbosch",
  "Somerset West", "Gordon's Bay", "Strand", "Paarl", "Franschhoek",
  // Johannesburg
  "Johannesburg", "Sandton", "Rosebank, Johannesburg", "Melrose, Johannesburg", "Illovo, Johannesburg",
  "Parktown, Johannesburg", "Parkview, Johannesburg", "Linden, Johannesburg", "Greenside, Johannesburg",
  "Craighall Park, Johannesburg", "Hyde Park, Johannesburg", "Bryanston", "Fourways", "Randburg",
  "Midrand", "Edenvale", "Bedfordview", "Germiston", "Boksburg", "Benoni",
  // Pretoria
  "Pretoria", "Brooklyn, Pretoria", "Hatfield, Pretoria", "Arcadia, Pretoria", "Waterkloof, Pretoria",
  "Lynnwood, Pretoria", "Centurion", "Midstream Estate", "Garsfontein, Pretoria",
  // Durban
  "Durban", "Umhlanga", "Ballito", "La Lucia, Durban", "Morningside, Durban", "Glenwood, Durban",
  "Berea, Durban", "Musgrave, Durban", "Westville, Durban", "Pinetown",
  // Other cities
  "Port Elizabeth", "East London", "Bloemfontein", "Polokwane", "Nelspruit", "Kimberley",
  "George", "Knysna", "Hermanus", "Mossel Bay",
];

/** Case-insensitive substring match against the built-in areas, capped. */
export function matchSaAreas(query: string, limit = 6): string[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  return SA_AREAS.filter((a) => a.toLowerCase().includes(q)).slice(0, limit);
}
