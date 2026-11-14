export type ContinentId =
  | 'Avrupa'
  | 'Asya'
  | 'Kuzey Amerika'
  | 'Güney Amerika'
  | 'Afrika'
  | 'Okyanusya';

export type CityId = 'all' | string;

export type CuisineCategory =
  | 'Tümü'
  | 'Anadolu & Akdeniz'
  | 'Uzak Doğu'
  | 'Avrupa Klasikleri'
  | 'Sokak Lezzetleri'
  | 'Tatlı & Pastane';

export type CurrencyMode = 'TRY' | 'LOCAL';

export type OrderStatus =
  | 'received'
  | 'preparing'
  | 'on_the_way'
  | 'delivered';

export type PaymentMethod = 'card' | 'digital_wallet' | 'cash_on_delivery';

export type PaymentStatus = 'paid' | 'pending_cod' | 'refunded';

export type CardBrand = 'Troy' | 'Visa' | 'Mastercard' | 'Amex';

export type WalletProvider =
  | 'sofracuzdan'
  | 'apple_google_pay'
  | 'aninda_havale';

export type RestaurantSortOption =
  | 'recommended'
  | 'rating'
  | 'fastest'
  | 'min_basket';

export interface CityHub {
  id: Exclude<CityId, 'all'>;
  name: string;
  country: string;
  countryCode: string;
  continent: ContinentId;
  districtLabel: string;
  neighborhoods: string[];
  currencyCode: string;
  currencySymbol: string;
  rateToTry: number;
  avgDelivery: string;
  freeDeliveryThresholdTry: number;
  deliveryFeeTry: number;
  kitchenCount: number;
  center: { lat: number; lng: number };
  isFlagship?: boolean;
}

export interface DishPortion {
  id: string;
  label: string;
  priceDeltaTry: number;
}

export interface DishExtra {
  id: string;
  label: string;
  priceTry: number;
}

export interface Dish {
  id: string;
  cityId: Exclude<CityId, 'all'>;
  cityName: string;
  district: string;
  restaurantName: string;
  name: string;
  category: Exclude<CuisineCategory, 'Tümü'>;
  description: string;
  story: string;
  ingredients: string[];
  priceTry: number;
  prepMinutes: string;
  rating: number;
  reviewCount: number;
  calories: number;
  isVegetarian: boolean;
  isSpicy: boolean;
  isChefSignature: boolean;
  image: string;
  portions: DishPortion[];
  extras: DishExtra[];
  isPartnerDish?: boolean;
}

export interface RestaurantStorefront {
  id: string;
  name: string;
  cityId: Exclude<CityId, 'all'>;
  cityName: string;
  district: string;
  cuisineCategory: Exclude<CuisineCategory, 'Tümü'>;
  avgDeliveryMinutes: string;
  estimatedMinutesNumeric: number;
  minBasketTry: number;
  deliveryFeeTry: number;
  freeDeliveryThresholdTry: number;
  rating: number;
  reviewCount: number;
  coverImage: string;
  tagline: string;
  hasCampaign: boolean;
  isPartner: boolean;
  dishes: Dish[];
}

export type RestaurantStatus = 'active' | 'paused';

export interface RestaurantProfile {
  id: string;
  ownerId: string;
  name: string;
  cityId: Exclude<CityId, 'all'>;
  cityName: string;
  district: string;
  cuisineCategory: Exclude<CuisineCategory, 'Tümü'>;
  avgPrepMinutes: string;
  tagline: string;
  status: RestaurantStatus;
}

export interface RestaurantPrivateContact {
  ownerId: string;
  contactEmail: string;
  contactPhone: string;
  streetAddress: string;
  taxId: string;
}

export interface PartnerDishRecord {
  id: string;
  ownerId: string;
  restaurantId: string;
  restaurantName: string;
  cityId: Exclude<CityId, 'all'>;
  cityName: string;
  district: string;
  name: string;
  category: Exclude<CuisineCategory, 'Tümü'>;
  description: string;
  story: string;
  ingredients: string[];
  priceTry: number;
  prepMinutes: string;
  calories: number;
  isVegetarian: boolean;
  isSpicy: boolean;
  isChefSignature: boolean;
  imagePreset: string;
  isPublished: boolean;
}

export interface AdminUserRecord {
  id: string;
  uid: string;
  email: string;
  note: string;
}

export interface CartItem {
  cartItemId: string;
  dish: Dish;
  portion: DishPortion;
  extras: DishExtra[];
  note: string;
  quantity: number;
  unitPriceTry: number;
}

export interface SavedCardRecord {
  id: string;
  ownerId: string;
  label: string;
  holderName: string;
  brand: CardBrand;
  last4: string;
  expiry: string;
}

export interface PaymentReceipt {
  transactionId: string;
  authCode: string;
  gatewayLabel: string;
  paidAt: string;
  cardBrand: CardBrand | '';
  last4: string;
  maskedCard: string;
  refundId?: string;
}

export interface Order {
  id: string;
  firestoreId?: string;
  ownerId?: string;
  createdAt: string;
  cityId: Exclude<CityId, 'all'>;
  cityName: string;
  neighborhood: string;
  address: string;
  customerName: string;
  customerPhone: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentDetails?: PaymentReceipt;
  deliveryPreferences?: string[];
  items: {
    dishName: string;
    restaurantName: string;
    portionLabel: string;
    extrasLabels: string[];
    quantity: number;
    lineTotalTry: number;
  }[];
  subtotalTry: number;
  discountTry: number;
  deliveryFeeTry: number;
  totalTry: number;
  status: OrderStatus;
  estimatedArrival: string;
  courierName: string;
}
