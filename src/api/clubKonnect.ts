/**
 * Service layer handler for interacting with the ClubKonnect API.
 * This helper operates server-side using the private credentials configured in .env.
 */

// Define type schema for ClubKonnect Data Plans
export interface ClubKonnectDataPlan {
  planCode: string;
  name: string;
  price: number;
  duration: string;
  networkCode: string;
}

// Map human network names/IDs to ClubKonnect code values
export const NETWORK_CODES: Record<string, string> = {
  "01": "01", // MTN
  "02": "02", // Glo
  "03": "03", // 9mobile
  "04": "04", // Airtel
  "mtn": "01",
  "glo": "02",
  "9mobile": "03",
  "airtel": "04",
};

// Map code values to fallback data plans in case of missing keys or network failure
const FALLBACK_PLANS: Record<string, ClubKonnectDataPlan[]> = {
  "01": [ // MTN
    { planCode: "M500", name: "MTN 500MB (SME) - 30 Days", price: 150, duration: "30 Days", networkCode: "01" },
    { planCode: "M1GB", name: "MTN 1GB (SME) - 30 Days", price: 245, duration: "30 Days", networkCode: "01" },
    { planCode: "M2GB", name: "MTN 2GB (SME) - 30 Days", price: 490, duration: "30 Days", networkCode: "01" },
    { planCode: "M5GB", name: "MTN 5GB (SME) - 30 Days", price: 1225, duration: "30 Days", networkCode: "01" },
    { planCode: "M10GB", name: "MTN 10GB (SME) - 30 Days", price: 2450, duration: "30 Days", networkCode: "01" },
  ],
  "02": [ // Glo
    { planCode: "G1GB", name: "Glo 1.05GB - 30 Days", price: 450, duration: "30 Days", networkCode: "02" },
    { planCode: "G2GB", name: "Glo 2.5GB - 30 Days", price: 900, duration: "30 Days", networkCode: "02" },
    { planCode: "G5GB", name: "Glo 5.8GB - 30 Days", price: 1800, duration: "30 Days", networkCode: "02" },
    { planCode: "G10GB", name: "Glo 12GB - 30 Days", price: 3600, duration: "30 Days", networkCode: "02" },
  ],
  "03": [ // 9mobile
    { planCode: "9M500", name: "9mobile 500MB - 30 Days", price: 400, duration: "30 Days", networkCode: "03" },
    { planCode: "9M1GB", name: "9mobile 1.5GB - 30 Days", price: 900, duration: "30 Days", networkCode: "03" },
    { planCode: "9M3GB", name: "9mobile 3GB - 30 Days", price: 1350, duration: "30 Days", networkCode: "03" },
  ],
  "04": [ // Airtel
    { planCode: "A1GB", name: "Airtel 1GB (CG) - 30 Days", price: 260, duration: "30 Days", networkCode: "04" },
    { planCode: "A2GB", name: "Airtel 2GB (CG) - 30 Days", price: 520, duration: "30 Days", networkCode: "04" },
    { planCode: "A5GB", name: "Airtel 5GB (CG) - 30 Days", price: 1300, duration: "30 Days", networkCode: "04" },
    { planCode: "A10GB", name: "Airtel 10GB (CG) - 30 Days", price: 2600, duration: "30 Days", networkCode: "04" },
  ]
};

/**
 * Service function to retrieve available ClubKonnect data plans for a given network ID.
 * @param networkId Either a human name string (e.g., 'MTN') or standard numeric code ('01')
 * @returns Array of available ClubKonnectDataPlan objects
 */
export async function fetchClubKonnectDataPlans(networkId: string): Promise<ClubKonnectDataPlan[]> {
  const normalizedId = networkId.toLowerCase();
  const networkCode = NETWORK_CODES[normalizedId] || "01";

  const userId = typeof process !== "undefined" && process?.env ? process.env.CLUBKONNECT_USER_ID : ((import.meta as any).env?.VITE_CLUBKONNECT_USER_ID as string);
  const apiKey = typeof process !== "undefined" && process?.env ? process.env.CLUBKONNECT_API_KEY : ((import.meta as any).env?.VITE_CLUBKONNECT_API_KEY as string);

  // Use fallback if API credentials are not provided, empty, or set to placeholder/default strings
  if (
    !userId || 
    !apiKey || 
    userId.trim() === "" || 
    apiKey.trim() === "" ||
    userId.includes("YOUR_") || 
    apiKey.includes("YOUR_") ||
    userId === "undefined" ||
    apiKey === "undefined"
  ) {
    console.log(`[ClubKonnect Service] Using fallback data plans for network: ${networkCode}`);
    return FALLBACK_PLANS[networkCode] || FALLBACK_PLANS["01"];
  }

  try {
    // Official ClubKonnect API url format to check data plan list
    const apiUrl = `https://www.clubkonnect.com/api/v1/plans?UserID=${userId}&APIKey=${apiKey}&mobileNetwork=${networkCode}`;
    
    const response = await fetch(apiUrl);
    if (!response.ok) {
       console.log(`[ClubKonnect Service] HTTP status ${response.status} from API, using fallback plans.`);
       return FALLBACK_PLANS[networkCode] || FALLBACK_PLANS["01"];
    }

    const rawText = await response.text();
    try {
      const data = JSON.parse(rawText);
      // Ensure we conform to dynamic lists or map accordingly
      if (data && Array.isArray(data.plans)) {
        return data.plans.map((p: any) => ({
          planCode: p.code || p.plan_code || p.value,
          name: p.name || p.label,
          price: Number(p.price || p.amount),
          duration: p.duration || "30 Days",
          networkCode
        }));
      }
      
      return FALLBACK_PLANS[networkCode] || FALLBACK_PLANS["01"];
    } catch (parseError) {
      console.log("[ClubKonnect Service] Could not parse raw API answer as JSON, using fallback plans.");
      return FALLBACK_PLANS[networkCode] || FALLBACK_PLANS["01"];
    }
  } catch (err: any) {
    console.log(`[ClubKonnect Service] API connection unavailable (${err?.message || err}), using fallback plans.`);
    return FALLBACK_PLANS[networkCode] || FALLBACK_PLANS["01"];
  }
}
