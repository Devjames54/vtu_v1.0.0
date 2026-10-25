export interface PaymentGatewayConfig {
  id: string;
  name: string;
  provider: "paystack" | "flutterwave";
  status: "active" | "inactive";
  isDefault: boolean;
  environment: "live" | "test";
  publicKey: string;
  secretKey: string;
  merchantId?: string;
  webhookSecret?: string;
  supportedMethods: ("card" | "transfer" | "ussd" | "qr" | "barter")[];
  feePercentage?: number;
  fixedFee?: number;
  notes?: string;
}

export interface AggregatorConfig {
  id: string;
  name: string;
  providerType: "clubkonnect" | "vtpass" | "ebills" | "alrahuz" | "mobilenig" | "custom";
  status: "active" | "inactive";
  isPrimary: boolean;
  userId: string;
  apiKey: string;
  publicKey?: string;
  apiUrl: string;
  activeServices: ("airtime" | "data" | "electricity" | "cables" | "exam_pins" | "betting")[];
  balance?: number;
  notes?: string;
}

export interface ServiceRoutingConfig {
  airtime: string;
  data: string;
  electricity: string;
  cables: string;
  exam_pins: string;
  betting: string;
}

export interface SystemConfig {
  maintenanceMode: boolean;
  globalDiscount: number;
  apiLatency: number;
  providerStatuses: Record<string, "online" | "offline">;
  systemAlert: string;
  localAdmins?: string[];
  clubkonnectUserId?: string;
  clubkonnectApiKey?: string;
  paystackSecretKey?: string;
  paystackPublicKey?: string;
  gateways?: PaymentGatewayConfig[];
  aggregators?: AggregatorConfig[];
  serviceRouting?: ServiceRoutingConfig;
}

export const defaultGateways: PaymentGatewayConfig[] = [
  {
    id: "gw_paystack",
    name: "Paystack Gateway",
    provider: "paystack",
    status: "active",
    isDefault: true,
    environment: "live",
    publicKey: "pk_test_3ac926ffefcedbc1ed98990286d61a1348351537",
    secretKey: "sk_test_b8e59653ffe2ba5940bca226a2134e0fbcbbee92",
    merchantId: "",
    supportedMethods: ["card", "transfer", "ussd", "qr"],
    feePercentage: 1.5,
    fixedFee: 0,
    notes: "Official Paystack gateway supporting Cards, USSD, Dedicated Virtual Bank Transfer, and QR."
  }
];

export const defaultAggregators: AggregatorConfig[] = [
  {
    id: "agg_clubkonnect",
    name: "ClubKonnect (NelloByte)",
    providerType: "clubkonnect",
    status: "active",
    isPrimary: true,
    userId: "CK101290943",
    apiKey: "L771Q3F7698VHR08X3VJZW846P79135WD991JVP0379BN4MNORWE2D4BO0ZMTR31",
    apiUrl: "https://www.nellobytesystems.com",
    activeServices: ["airtime", "data", "electricity", "cables", "exam_pins", "betting"],
    balance: 0,
    notes: "Exclusive primary VTU aggregator for Airtime, Data Bundles, TV Cables, Electricity Discos, Exam Scratch Cards, and Betting."
  }
];

export const defaultServiceRouting: ServiceRoutingConfig = {
  airtime: "agg_clubkonnect",
  data: "agg_clubkonnect",
  electricity: "agg_clubkonnect",
  cables: "agg_clubkonnect",
  exam_pins: "agg_clubkonnect",
  betting: "agg_clubkonnect"
};

export interface AdminActivityLog {
  id: string;
  timestamp: string;
  adminEmail: string;
  action: "create" | "update" | "delete" | "toggle_status" | "set_default" | "routing_change" | "credential_change" | "system_save";
  targetType: "gateway" | "aggregator" | "service_routing" | "system";
  targetId: string;
  targetName: string;
  summary: string;
  details?: Record<string, any> | string;
  severity: "info" | "warning" | "critical";
}

export interface AggregatorHealthStatus {
  id: string;
  name: string;
  providerType: string;
  status: "operational" | "degraded" | "offline";
  responseTimeMs: number;
  uptimePercent: number;
  lastChecked: string;
  httpStatus?: number;
  message?: string;
  balance?: string | number;
  activeServices: string[];
  latencyHistory: number[];
}
