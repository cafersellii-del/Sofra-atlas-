import type {
  CommissionConfig,
  CommissionMode,
  RestaurantCommissionOverride,
} from '../types/food';

export const COMMISSION_BOUNDS = {
  pctMin: 0,
  pctMax: 50,
  fixedMax: 5000,
  serviceFeeMax: 1000,
  courierMinFeeMax: 1000,
  minCommissionMax: 5000,
  noteMax: 160,
} as const;

export const DEFAULT_COMMISSION_CONFIG: CommissionConfig = {
  commissionMode: 'percentage',
  restaurantCommissionPct: 15,
  fixedCommissionTry: 0,
  customerServiceFeeTry: 0,
  courierSharePct: 0,
  courierMinFeeTry: 0,
  minCommissionTry: 0,
};

export const COMMISSION_STORAGE_KEY = 'sofra_atlas_commission_config';

export function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, Math.round(num * 100) / 100));
}

export function normalizeCommissionMode(mode: unknown): CommissionMode {
  if (mode === 'fixed' || mode === 'hybrid' || mode === 'percentage') {
    return mode;
  }
  return 'percentage';
}

export function sanitizeCommissionConfig(
  raw: Partial<CommissionConfig> | null | undefined
): CommissionConfig {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_COMMISSION_CONFIG };
  return {
    commissionMode: normalizeCommissionMode(raw.commissionMode),
    restaurantCommissionPct: clampNumber(
      raw.restaurantCommissionPct,
      COMMISSION_BOUNDS.pctMin,
      COMMISSION_BOUNDS.pctMax,
      DEFAULT_COMMISSION_CONFIG.restaurantCommissionPct
    ),
    fixedCommissionTry: Math.round(
      clampNumber(
        raw.fixedCommissionTry,
        0,
        COMMISSION_BOUNDS.fixedMax,
        DEFAULT_COMMISSION_CONFIG.fixedCommissionTry
      )
    ),
    customerServiceFeeTry: Math.round(
      clampNumber(
        raw.customerServiceFeeTry,
        0,
        COMMISSION_BOUNDS.serviceFeeMax,
        DEFAULT_COMMISSION_CONFIG.customerServiceFeeTry
      )
    ),
    courierSharePct: clampNumber(
      raw.courierSharePct,
      COMMISSION_BOUNDS.pctMin,
      COMMISSION_BOUNDS.pctMax,
      DEFAULT_COMMISSION_CONFIG.courierSharePct
    ),
    courierMinFeeTry: Math.round(
      clampNumber(
        raw.courierMinFeeTry,
        0,
        COMMISSION_BOUNDS.courierMinFeeMax,
        DEFAULT_COMMISSION_CONFIG.courierMinFeeTry
      )
    ),
    minCommissionTry: Math.round(
      clampNumber(
        raw.minCommissionTry,
        0,
        COMMISSION_BOUNDS.minCommissionMax,
        DEFAULT_COMMISSION_CONFIG.minCommissionTry
      )
    ),
    updatedByEmail:
      typeof raw.updatedByEmail === 'string' ? raw.updatedByEmail : undefined,
    updatedAt: raw.updatedAt,
  };
}

export function normalizeRestaurantCommissionKey(nameOrId: string): string {
  const trMap: Record<string, string> = {
    ç: 'c',
    ğ: 'g',
    ı: 'i',
    i: 'i',
    ö: 'o',
    ş: 's',
    ü: 'u',
  };
  const ascii = nameOrId
    .trim()
    .toLocaleLowerCase('tr')
    .replace(/[çğıiöşü]/g, (ch) => trMap[ch] ?? ch)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
  return ascii || 'restoran';
}

export interface OrderCommissionBreakdown {
  effectiveMode: CommissionMode;
  effectiveRatePct: number;
  effectiveFixedTry: number;
  serviceFeeTry: number;
  commissionTry: number;
  restaurantNetTry: number;
  courierEarningsTry: number;
  totalPlatformRevenueTry: number;
  isCustomOverride: boolean;
}

export function calculateOrderCommissionBreakdown(params: {
  netSubtotalTry: number;
  deliveryFeeTry: number;
  config: CommissionConfig;
  override?: RestaurantCommissionOverride | null;
}): OrderCommissionBreakdown {
  const { netSubtotalTry, deliveryFeeTry, config, override } = params;
  const safeNet = Math.max(0, netSubtotalTry);
  const safeDelivery = Math.max(0, deliveryFeeTry);

  const effectiveMode = override ? override.commissionMode : config.commissionMode;
  const effectiveRatePct = override
    ? override.restaurantCommissionPct
    : config.restaurantCommissionPct;
  const effectiveFixedTry = override
    ? override.fixedCommissionTry
    : config.fixedCommissionTry;

  const serviceFeeTry =
    safeNet > 0 ? Math.round(Math.max(0, config.customerServiceFeeTry)) : 0;

  let rawCommission = 0;
  if (safeNet > 0) {
    if (effectiveMode === 'percentage') {
      rawCommission = Math.round(safeNet * (effectiveRatePct / 100));
    } else if (effectiveMode === 'fixed') {
      rawCommission = Math.round(effectiveFixedTry);
    } else {
      rawCommission = Math.round(
        safeNet * (effectiveRatePct / 100) + effectiveFixedTry
      );
    }

    if (config.minCommissionTry > 0) {
      rawCommission = Math.max(rawCommission, Math.round(config.minCommissionTry));
    }
  }

  const commissionTry = Math.min(safeNet, Math.max(0, rawCommission));
  const restaurantNetTry = Math.max(0, safeNet - commissionTry);
  const courierEarningsTry = 0;

  return {
    effectiveMode,
    effectiveRatePct:
      effectiveMode === 'fixed' ? 0 : Math.round(effectiveRatePct * 100) / 100,
    effectiveFixedTry:
      effectiveMode === 'percentage' ? 0 : Math.round(effectiveFixedTry),
    serviceFeeTry,
    commissionTry,
    restaurantNetTry,
    courierEarningsTry,
    totalPlatformRevenueTry: commissionTry + serviceFeeTry,
    isCustomOverride: Boolean(override),
  };
}

export function formatCommissionPolicySummary(
  config: Pick<
    CommissionConfig,
    'commissionMode' | 'restaurantCommissionPct' | 'fixedCommissionTry'
  >
): string {
  if (config.commissionMode === 'percentage') {
    return `%${config.restaurantCommissionPct} komisyon`;
  }
  if (config.commissionMode === 'fixed') {
    return `${Math.round(config.fixedCommissionTry).toLocaleString('tr-TR')} ₺ sabit komisyon`;
  }
  return `%${config.restaurantCommissionPct} + ${Math.round(
    config.fixedCommissionTry
  ).toLocaleString('tr-TR')} ₺`;
}
