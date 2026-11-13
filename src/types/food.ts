export type CityId =
  | 'all'
  | 'istanbul'
  | 'tokyo'
  | 'napoli'
  | 'paris'
  | 'bangkok'
  | 'newyork';

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

export type PaymentMethod = 'card' | 'cash_on_delivery';

export interface CityHub {
  id: Exclude<CityId, 'all'>;
  name: string;
  country: string;
  districtLabel: string;
  neighborhoods: string[];
  currencyCode: string;
  currencySymbol: string;
  rateToTry: number;
  avgDelivery: string;
  freeDeliveryThresholdTry: number;
  deliveryFeeTry: number;
  kitchenCount: number;
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

export interface Order {
  id: string;
  createdAt: string;
  cityId: Exclude<CityId, 'all'>;
  cityName: string;
  neighborhood: string;
  address: string;
  customerName: string;
  customerPhone: string;
  paymentMethod: PaymentMethod;
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
