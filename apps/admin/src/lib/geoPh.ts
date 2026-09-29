// Philippine reference geography (client- + edge-safe, no imports).
// Provinces: complete (82). Cities: component/independent/HUC cities per
// province — municipalities stay free text (forms use datalist suggestions,
// validation stays non-empty so unlisted towns still pass).

export const COUNTRIES = ["Philippines"] as const;

export interface Province {
  name: string;
  region: string;
}

export const PROVINCES: Province[] = [
  // Cordillera (CAR)
  { name: "Abra", region: "CAR" },
  { name: "Apayao", region: "CAR" },
  { name: "Benguet", region: "CAR" },
  { name: "Ifugao", region: "CAR" },
  { name: "Kalinga", region: "CAR" },
  { name: "Mountain Province", region: "CAR" },
  // Ilocos (I)
  { name: "Ilocos Norte", region: "Ilocos" },
  { name: "Ilocos Sur", region: "Ilocos" },
  { name: "La Union", region: "Ilocos" },
  { name: "Pangasinan", region: "Ilocos" },
  // Cagayan Valley (II)
  { name: "Batanes", region: "Cagayan Valley" },
  { name: "Cagayan", region: "Cagayan Valley" },
  { name: "Isabela", region: "Cagayan Valley" },
  { name: "Nueva Vizcaya", region: "Cagayan Valley" },
  { name: "Quirino", region: "Cagayan Valley" },
  // Central Luzon (III)
  { name: "Aurora", region: "Central Luzon" },
  { name: "Bataan", region: "Central Luzon" },
  { name: "Bulacan", region: "Central Luzon" },
  { name: "Nueva Ecija", region: "Central Luzon" },
  { name: "Pampanga", region: "Central Luzon" },
  { name: "Tarlac", region: "Central Luzon" },
  { name: "Zambales", region: "Central Luzon" },
  // CALABARZON (IV-A)
  { name: "Batangas", region: "CALABARZON" },
  { name: "Cavite", region: "CALABARZON" },
  { name: "Laguna", region: "CALABARZON" },
  { name: "Quezon", region: "CALABARZON" },
  { name: "Rizal", region: "CALABARZON" },
  // MIMAROPA (IV-B)
  { name: "Marinduque", region: "MIMAROPA" },
  { name: "Occidental Mindoro", region: "MIMAROPA" },
  { name: "Oriental Mindoro", region: "MIMAROPA" },
  { name: "Palawan", region: "MIMAROPA" },
  { name: "Romblon", region: "MIMAROPA" },
  // Bicol (V)
  { name: "Albay", region: "Bicol" },
  { name: "Camarines Norte", region: "Bicol" },
  { name: "Camarines Sur", region: "Bicol" },
  { name: "Catanduanes", region: "Bicol" },
  { name: "Masbate", region: "Bicol" },
  { name: "Sorsogon", region: "Bicol" },
  // Western Visayas (VI)
  { name: "Aklan", region: "Western Visayas" },
  { name: "Antique", region: "Western Visayas" },
  { name: "Capiz", region: "Western Visayas" },
  { name: "Guimaras", region: "Western Visayas" },
  { name: "Iloilo", region: "Western Visayas" },
  // Negros Island Region (NIR)
  { name: "Negros Occidental", region: "NIR" },
  { name: "Negros Oriental", region: "NIR" },
  { name: "Siquijor", region: "NIR" },
  // Central Visayas (VII)
  { name: "Bohol", region: "Central Visayas" },
  { name: "Cebu", region: "Central Visayas" },
  // Eastern Visayas (VIII)
  { name: "Biliran", region: "Eastern Visayas" },
  { name: "Eastern Samar", region: "Eastern Visayas" },
  { name: "Leyte", region: "Eastern Visayas" },
  { name: "Northern Samar", region: "Eastern Visayas" },
  { name: "Samar", region: "Eastern Visayas" },
  { name: "Southern Leyte", region: "Eastern Visayas" },
  // Zamboanga Peninsula (IX)
  { name: "Zamboanga del Norte", region: "Zamboanga Peninsula" },
  { name: "Zamboanga del Sur", region: "Zamboanga Peninsula" },
  { name: "Zamboanga Sibugay", region: "Zamboanga Peninsula" },
  // Northern Mindanao (X)
  { name: "Bukidnon", region: "Northern Mindanao" },
  { name: "Camiguin", region: "Northern Mindanao" },
  { name: "Lanao del Norte", region: "Northern Mindanao" },
  { name: "Misamis Occidental", region: "Northern Mindanao" },
  { name: "Misamis Oriental", region: "Northern Mindanao" },
  // Davao (XI)
  { name: "Davao del Norte", region: "Davao" },
  { name: "Davao del Sur", region: "Davao" },
  { name: "Davao Oriental", region: "Davao" },
  { name: "Davao de Oro", region: "Davao" },
  { name: "Davao Occidental", region: "Davao" },
  // SOCCSKSARGEN (XII)
  { name: "Cotabato", region: "SOCCSKSARGEN" },
  { name: "Sarangani", region: "SOCCSKSARGEN" },
  { name: "South Cotabato", region: "SOCCSKSARGEN" },
  { name: "Sultan Kudarat", region: "SOCCSKSARGEN" },
  // Caraga (XIII)
  { name: "Agusan del Norte", region: "Caraga" },
  { name: "Agusan del Sur", region: "Caraga" },
  { name: "Dinagat Islands", region: "Caraga" },
  { name: "Surigao del Norte", region: "Caraga" },
  { name: "Surigao del Sur", region: "Caraga" },
  // BARMM
  { name: "Basilan", region: "BARMM" },
  { name: "Lanao del Sur", region: "BARMM" },
  { name: "Maguindanao del Norte", region: "BARMM" },
  { name: "Maguindanao del Sur", region: "BARMM" },
  { name: "Sulu", region: "BARMM" },
  { name: "Tawi-Tawi", region: "BARMM" },
];

export const CITIES_OF: Record<string, string[]> = {
  Abra: ["Bangued"],
  Apayao: ["Conner"],
  Benguet: ["Baguio", "La Trinidad"],
  Ifugao: ["Lagawe"],
  Kalinga: ["Tabuk"],
  "Mountain Province": ["Bontoc"],
  "Ilocos Norte": ["Laoag", "Batac"],
  "Ilocos Sur": ["Vigan", "Candon"],
  "La Union": ["San Fernando"],
  Pangasinan: ["Dagupan", "Urdaneta", "Alaminos", "San Carlos"],
  Batanes: ["Basco"],
  Cagayan: ["Tuguegarao"],
  Isabela: ["Ilagan", "Cauayan", "Santiago"],
  "Nueva Vizcaya": ["Bayombong"],
  Quirino: ["Cabarroguis"],
  Aurora: ["Baler"],
  Bataan: ["Balanga"],
  Bulacan: ["Malolos", "Meycauayan", "San Jose del Monte"],
  "Nueva Ecija": ["Palayan", "Cabanatuan", "Gapan", "Muñoz", "San Jose"],
  Pampanga: ["San Fernando", "Angeles", "Mabalacat"],
  Tarlac: ["Tarlac City"],
  Zambales: ["Olongapo"],
  Batangas: ["Batangas City", "Lipa", "Tanauan", "Santo Tomas", "Calaca"],
  Cavite: ["Cavite City", "Dasmariñas", "Imus", "Bacoor", "Tagaytay", "Trece Martires", "General Trias"],
  Laguna: ["Santa Rosa", "Calamba", "San Pablo", "Biñan", "Cabuyao", "San Pedro"],
  Quezon: ["Lucena", "Tayabas"],
  Rizal: ["Antipolo"],
  Marinduque: ["Boac"],
  "Occidental Mindoro": ["San Jose"],
  "Oriental Mindoro": ["Calapan"],
  Palawan: ["Puerto Princesa"],
  Romblon: ["Romblon"],
  Albay: ["Legazpi", "Ligao", "Tabaco"],
  "Camarines Norte": ["Daet"],
  "Camarines Sur": ["Naga", "Iriga"],
  Catanduanes: ["Virac"],
  Masbate: ["Masbate City"],
  Sorsogon: ["Sorsogon City"],
  Aklan: ["Kalibo"],
  Antique: ["San Jose de Buenavista"],
  Capiz: ["Roxas"],
  Guimaras: ["Jordan"],
  Iloilo: ["Iloilo City", "Passi"],
  "Negros Occidental": ["Bacolod", "Bago", "Cadiz", "Escalante", "Himamaylan", "Kabankalan", "Sagay", "San Carlos", "Silay", "Sipalay", "Talisay", "Victorias", "La Carlota"],
  "Negros Oriental": ["Dumaguete", "Bais", "Bayawan", "Canlaon", "Guihulngan", "Tanjay"],
  Siquijor: ["Siquijor"],
  Bohol: ["Tagbilaran"],
  Cebu: ["Cebu City", "Lapu-Lapu", "Mandaue", "Bogo", "Carcar", "Danao", "Naga", "Talisay", "Toledo"],
  Biliran: ["Naval"],
  "Eastern Samar": ["Borongan"],
  Leyte: ["Tacloban", "Baybay", "Ormoc"],
  "Northern Samar": ["Catarman"],
  Samar: ["Calbayog", "Catbalogan"],
  "Southern Leyte": ["Maasin"],
  "Zamboanga del Norte": ["Dapitan", "Dipolog"],
  "Zamboanga del Sur": ["Pagadian", "Zamboanga City"],
  "Zamboanga Sibugay": ["Ipil"],
  Bukidnon: ["Malaybalay", "Valencia"],
  Camiguin: ["Mambajao"],
  "Lanao del Norte": ["Iligan"],
  "Misamis Occidental": ["Oroquieta", "Ozamiz", "Tangub"],
  "Misamis Oriental": ["Cagayan de Oro", "El Salvador", "Gingoog"],
  "Davao del Norte": ["Tagum", "Panabo", "Samal"],
  "Davao del Sur": ["Davao City", "Digos"],
  "Davao Oriental": ["Mati"],
  "Davao de Oro": ["Nabunturan"],
  "Davao Occidental": ["Malita"],
  Cotabato: ["Kidapawan"],
  Sarangani: ["Alabel", "Glan", "Malungon"],
  "South Cotabato": ["General Santos", "Koronadal"],
  "Sultan Kudarat": ["Tacurong", "Isulan"],
  "Agusan del Norte": ["Butuan", "Cabadbaran"],
  "Agusan del Sur": ["Bayugan", "Prosperidad"],
  "Dinagat Islands": ["San Jose"],
  "Surigao del Norte": ["Surigao City"],
  "Surigao del Sur": ["Bislig", "Tandag"],
  Basilan: ["Isabela", "Lamitan"],
  "Lanao del Sur": ["Marawi"],
  "Maguindanao del Norte": ["Datu Odin Sinsuat"],
  "Maguindanao del Sur": ["Buluan"],
  Sulu: ["Jolo"],
  "Tawi-Tawi": ["Bongao"],
  "Metro Manila": [
    "Caloocan", "Las Piñas", "Makati", "Malabon", "Mandaluyong", "Manila", "Marikina",
    "Muntinlupa", "Navotas", "Parañaque", "Pasay", "Pasig", "Quezon City", "San Juan",
    "Taguig", "Valenzuela",
  ],
};

export function provincesOf(region?: string): Province[] {
  if (!region) return PROVINCES;
  return PROVINCES.filter((p) => p.region === region);
}

export function citiesOf(province: string): string[] {
  return CITIES_OF[province] ?? [];
}

const norm = (s: string): string => s.trim().toLowerCase();

/** Provinces containing a city (exact, case-insensitive). Empty when unknown. */
export function provincesForCity(city: string): string[] {
  const want = norm(city);
  if (!want) return [];
  return Object.keys(CITIES_OF).filter((prov) =>
    (CITIES_OF[prov] ?? []).some((c) => norm(c) === want),
  );
}

/**
 * Keep province and city coinciding: a typed city keeps its province when it
 * fits, otherwise switches to the owning province (first match when ambiguous).
 * Null when the city is unknown — free text still submits.
 */
export function resolveProvince(city: string, currentProvince: string): string | null {
  const owners = provincesForCity(city);
  if (owners.length === 0) return null;
  if (owners.includes(currentProvince)) return currentProvince;
  return owners[0];
}
