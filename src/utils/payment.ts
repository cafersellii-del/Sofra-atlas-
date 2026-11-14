import type { CardBrand, PaymentReceipt, WalletProvider } from '../types/food';

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

export function detectCardBrand(cardNumber: string): CardBrand {
  const digits = digitsOnly(cardNumber);
  if (/^(9792|65)/.test(digits)) return 'Troy';
  if (/^3[47]/.test(digits)) return 'Amex';
  if (/^(5[1-5]|222[1-9]|22[3-9]\d|2[3-6]\d{2}|27[01]\d|2720)/.test(digits)) {
    return 'Mastercard';
  }
  return 'Visa';
}

export function formatCardNumberInput(value: string): string {
  const digits = digitsOnly(value).slice(0, 16);
  const brand = detectCardBrand(digits);
  if (brand === 'Amex') {
    const p1 = digits.slice(0, 4);
    const p2 = digits.slice(4, 10);
    const p3 = digits.slice(10, 15);
    return [p1, p2, p3].filter(Boolean).join(' ');
  }
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
}

export function formatExpiryInput(value: string): string {
  const digits = digitsOnly(value).slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}`;
}

export function luhnCheck(cardNumber: string): boolean {
  const digits = digitsOnly(cardNumber);
  if (!/^\d{13,19}$/.test(digits)) return false;
  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = Number(digits[i]);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

export function isExpiryValid(expiry: string): boolean {
  const match = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(expiry.trim());
  if (!match) return false;
  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  if (year < currentYear) return false;
  if (year === currentYear && month < currentMonth) return false;
  return true;
}

export interface TestCardPreset {
  id: string;
  label: string;
  brand: CardBrand;
  number: string;
  expiry: string;
  cvc: string;
  holder: string;
}

// Standard Luhn-valid test card numbers for interactive sandbox testing
export const TEST_CARD_PRESETS: TestCardPreset[] = [
  {
    id: 'troy',
    label: 'TROY Test Kartı',
    brand: 'Troy',
    number: '9792 0000 0000 0001',
    expiry: '12/29',
    cvc: '123',
    holder: 'DENİZ YILMAZ',
  },
  {
    id: 'visa',
    label: 'Visa Test Kartı',
    brand: 'Visa',
    number: '4242 4242 4242 4242',
    expiry: '11/28',
    cvc: '424',
    holder: 'DENİZ YILMAZ',
  },
  {
    id: 'mc',
    label: 'Mastercard Test Kartı',
    brand: 'Mastercard',
    number: '5555 5555 5555 4444',
    expiry: '08/29',
    cvc: '888',
    holder: 'DENİZ YILMAZ',
  },
];

export interface InitiatePaymentResponse {
  status: 'paid' | 'requires_3ds';
  requires3DS: boolean;
  sessionId?: string;
  bankName?: string;
  gatewayLabel: string;
  cardBrand: CardBrand | '';
  last4: string;
  maskedCard: string;
  amountTry: number;
  demoOtpHint?: string;
  transactionId?: string;
  authCode?: string;
  paidAt?: string;
}

export async function initiateOnlinePayment(payload: {
  mode: 'card' | 'saved_card' | 'digital_wallet';
  amountTry: number;
  restaurantName: string;
  customerName: string;
  cardNumber?: string;
  holderName?: string;
  expiry?: string;
  cvc?: string;
  savedCardId?: string;
  brand?: CardBrand;
  last4?: string;
  use3DS?: boolean;
  walletProvider?: WalletProvider;
}): Promise<InitiatePaymentResponse> {
  const res = await fetch('/api/payments/initiate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = (await res.json()) as InitiatePaymentResponse & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || 'Ödeme başlatılamadı.');
  }
  return data;
}

export async function confirm3DSPayment(
  sessionId: string,
  otpCode: string
): Promise<PaymentReceipt> {
  const res = await fetch('/api/payments/confirm-3ds', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, otpCode }),
  });
  const data = (await res.json()) as PaymentReceipt & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || '3D Secure doğrulaması tamamlanamadı.');
  }
  return data;
}

export async function refundOnlinePayment(
  transactionId: string,
  amountTry: number
): Promise<{ refundId: string; refundedAt: string }> {
  const res = await fetch('/api/payments/refund', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transactionId, amountTry }),
  });
  const data = (await res.json()) as {
    refundId: string;
    refundedAt: string;
    error?: string;
  };
  if (!res.ok) {
    throw new Error(data.error || 'İade işlemi gerçekleştirilemedi.');
  }
  return { refundId: data.refundId, refundedAt: data.refundedAt };
}
