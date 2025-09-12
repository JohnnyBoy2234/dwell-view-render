// Maintenance Classification Helper
// Classifies maintenance requests by category and urgency using keyword matching

export type MaintenanceCategory =
  | "Plumbing" | "Electrical" | "Appliance" | "Security" | "Carpentry" | "Structural" | "HVAC" | "General";

export type Urgency = "low" | "medium" | "high";

export interface Classification {
  category: MaintenanceCategory;
  urgency: Urgency;
  confidence: number; // 0..1
  signals: string[];  // matched keywords
}

const CATEGORY_KEYWORDS: Record<MaintenanceCategory, string[]> = {
  Plumbing:   ["leak", "leaking", "geyser", "pipe", "burst", "drip", "tap", "toilet", "flush", "sink", "water", "drain", "blocked"],
  Electrical: ["power", "plug", "socket", "trip", "tripping", "breaker", "short", "sparks", "burning", "fuse", "light", "switch", "electricity"],
  Appliance:  ["stove", "oven", "fridge", "freezer", "microwave", "washing", "dryer", "dishwasher", "appliance"],
  Security:   ["lock", "door", "handle", "gate", "alarm", "burglar", "intercom", "key", "broken key", "security", "safe"],
  Carpentry:  ["wood", "door frame", "hinge", "cupboard", "drawer", "shelf", "cabinet", "wardrobe"],
  Structural: ["ceiling", "roof", "crack", "damp", "leak through roof", "wall", "foundation", "structural"],
  HVAC:       ["aircon", "air con", "air conditioner", "heater", "heating", "cooling", "vent", "hvac"],
  General:    []
};

const URGENCY_HIGH_KEYWORDS = [
  "flood", "sparks", "burning", "live wire", "gas", "smell gas", "burst", "unsafe", "emergency", 
  "no power", "no water", "dangerous", "urgent", "immediately", "asap"
];

const URGENCY_LOW_KEYWORDS = [
  "cosmetic", "minor", "when convenient", "non-urgent", "aesthetic", "surface"
];

export function classifyMaintenance(text: string): Classification {
  const normalizedText = (text || "").toLowerCase();
  
  // Find best category match
  let bestCategory: MaintenanceCategory = "General";
  let bestScore = 0;
  let categorySignals: string[] = [];

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const matches = keywords.filter(keyword => normalizedText.includes(keyword));
    const score = matches.length;
    
    if (score > bestScore) {
      bestCategory = category as MaintenanceCategory;
      bestScore = score;
      categorySignals = matches;
    }
  }

  // Determine urgency
  const highUrgencyMatches = URGENCY_HIGH_KEYWORDS.filter(keyword => 
    normalizedText.includes(keyword)
  );
  const lowUrgencyMatches = URGENCY_LOW_KEYWORDS.filter(keyword => 
    normalizedText.includes(keyword)
  );

  let urgency: Urgency = "medium";
  let urgencySignals: string[] = [];

  if (highUrgencyMatches.length > 0) {
    urgency = "high";
    urgencySignals = highUrgencyMatches;
  } else if (lowUrgencyMatches.length > 0) {
    urgency = "low";
    urgencySignals = lowUrgencyMatches;
  } else if (bestCategory === "General") {
    urgency = "low";
  }

  // Calculate confidence based on matches
  const baseConfidence = Math.min(1, 0.5 + (bestScore * 0.15));
  const urgencyBonus = urgencySignals.length > 0 ? 0.2 : 0;
  const confidence = Math.min(1, baseConfidence + urgencyBonus);

  return {
    category: bestCategory,
    urgency,
    confidence,
    signals: [...categorySignals, ...urgencySignals]
  };
}

// Helper to get SLA hours based on urgency and category
export function getSLAHours(urgency: Urgency, category: MaintenanceCategory): number {
  if (urgency === "high" || category === "Electrical" || category === "Plumbing") {
    return 8; // 8 hours for urgent issues
  }
  if (urgency === "medium") {
    return 48; // 2 days for medium priority
  }
  return 120; // 5 days for low priority
}

// Helper to determine if auto-approval is allowed
export function shouldAutoApprove(estimatedCost: number, autoApprovalLimit: number = 1500): boolean {
  return estimatedCost <= autoApprovalLimit;
}