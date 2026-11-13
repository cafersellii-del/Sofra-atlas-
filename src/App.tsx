import { useEffect, useMemo, useState } from 'react';
import { CartDrawer } from './components/CartDrawer';
import { CraftsmanshipSection } from './components/CraftsmanshipSection';
import { DishDetailModal } from './components/DishDetailModal';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { MenuCatalog } from './components/MenuCatalog';
import { OrdersPanel } from './components/OrdersPanel';
import { DISHES, INITIAL_ORDERS } from './data/catalog';
import type {
  CartItem,
  CityId,
  CuisineCategory,
  CurrencyMode,
  Dish,
  DishExtra,
  DishPortion,
  Order,
  OrderStatus,
} from './types/food';

const STATUS_SEQUENCE: OrderStatus[] = [
  'received',
  'preparing',
  'on_the_way',
  'delivered',
];

function getNextStatus(current: OrderStatus): OrderStatus {
  const idx = STATUS_SEQUENCE.indexOf(current);
  if (idx === -1 || idx >= STATUS_SEQUENCE.length - 1) return 'delivered';
  return STATUS_SEQUENCE[idx + 1];
}

export default function App() {
  const [selectedCity, setSelectedCity] = useState<CityId>('all');
  const [selectedCategory, setSelectedCategory] =
    useState<CuisineCategory>('Tümü');
  const [currencyMode, setCurrencyMode] = useState<CurrencyMode>('TRY');
  const [vegetarianOnly, setVegetarianOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [activeDish, setActiveDish] = useState<Dish | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isOrdersOpen, setIsOrdersOpen] = useState(false);

  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('sofra_atlas_cart');
      return saved ? (JSON.parse(saved) as CartItem[]) : [];
    } catch {
      return [];
    }
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const saved = localStorage.getItem('sofra_atlas_orders');
      return saved ? (JSON.parse(saved) as Order[]) : INITIAL_ORDERS;
    } catch {
      return INITIAL_ORDERS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('sofra_atlas_cart', JSON.stringify(cartItems));
    } catch {
      // Ignore storage quota errors
    }
  }, [cartItems]);

  useEffect(() => {
    try {
      localStorage.setItem('sofra_atlas_orders', JSON.stringify(orders));
    } catch {
      // Ignore storage quota errors
    }
  }, [orders]);

  // Automatic progression for active in-flight orders
  useEffect(() => {
    const hasActive = orders.some((o) => o.status !== 'delivered');
    if (!hasActive) return;

    const timer = window.setInterval(() => {
      setOrders((prev) =>
        prev.map((order) => {
          if (order.status === 'delivered') return order;
          return { ...order, status: getNextStatus(order.status) };
        })
      );
    }, 10000);

    return () => window.clearInterval(timer);
  }, [orders]);

  const filteredDishes = useMemo(() => {
    const q = searchQuery.trim().toLocaleLowerCase('tr');
    return DISHES.filter((dish) => {
      if (selectedCity !== 'all' && dish.cityId !== selectedCity) return false;
      if (selectedCategory !== 'Tümü' && dish.category !== selectedCategory)
        return false;
      if (vegetarianOnly && !dish.isVegetarian) return false;
      if (q) {
        const haystack = [
          dish.name,
          dish.restaurantName,
          dish.cityName,
          dish.district,
          dish.description,
          ...dish.ingredients,
        ]
          .join(' ')
          .toLocaleLowerCase('tr');
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [selectedCity, selectedCategory, vegetarianOnly, searchQuery]);

  const addToCart = ({
    dish,
    portion,
    extras,
    note,
    quantity,
  }: {
    dish: Dish;
    portion: DishPortion;
    extras: DishExtra[];
    note: string;
    quantity: number;
  }) => {
    const extrasKey = extras
      .map((e) => e.id)
      .sort()
      .join(',');
    const cartItemId = `${dish.id}__${portion.id}__${extrasKey}__${note}`;
    const extrasSum = extras.reduce((sum, ex) => sum + ex.priceTry, 0);
    const unitPriceTry = dish.priceTry + portion.priceDeltaTry + extrasSum;

    setCartItems((prev) => {
      const existing = prev.find((item) => item.cartItemId === cartItemId);
      if (existing) {
        return prev.map((item) =>
          item.cartItemId === cartItemId
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [
        ...prev,
        {
          cartItemId,
          dish,
          portion,
          extras,
          note,
          quantity,
          unitPriceTry,
        },
      ];
    });
  };

  const handleQuickAdd = (dish: Dish) => {
    const defaultPortion = dish.portions[0];
    if (!defaultPortion) return;
    addToCart({
      dish,
      portion: defaultPortion,
      extras: [],
      note: '',
      quantity: 1,
    });
  };

  const handleUpdateCartQuantity = (cartItemId: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) =>
          item.cartItemId === cartItemId
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const handleRemoveCartItem = (cartItemId: string) => {
    setCartItems((prev) =>
      prev.filter((item) => item.cartItemId !== cartItemId)
    );
  };

  const handlePlaceOrder = (order: Order) => {
    setOrders((prev) => [order, ...prev]);
    setCartItems([]);
    setIsCartOpen(false);
    setIsOrdersOpen(true);
  };

  const handleAdvanceOrderStatus = (orderId: string) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId
          ? { ...order, status: getNextStatus(order.status) }
          : order
      )
    );
  };

  const handleExploreMenu = () => {
    const el = document.getElementById('menu-katalog');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleResetFilters = () => {
    setSelectedCity('all');
    setSelectedCategory('Tümü');
    setVegetarianOnly(false);
    setSearchQuery('');
  };

  const totalCartCount = cartItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  );
  const activeOrderCount = orders.filter(
    (o) => o.status !== 'delivered'
  ).length;

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F7] text-[#141413]">
      <Header
        cartCount={totalCartCount}
        activeOrderCount={activeOrderCount}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenOrders={() => setIsOrdersOpen(true)}
      />

      <main className="flex-1">
        <Hero
          selectedCity={selectedCity}
          onSelectCity={setSelectedCity}
          onExploreMenu={handleExploreMenu}
        />

        <MenuCatalog
          dishes={filteredDishes}
          selectedCity={selectedCity}
          onSelectCity={setSelectedCity}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          currencyMode={currencyMode}
          onChangeCurrencyMode={setCurrencyMode}
          vegetarianOnly={vegetarianOnly}
          onToggleVegetarian={() => setVegetarianOnly((v) => !v)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSelectDish={setActiveDish}
          onQuickAdd={handleQuickAdd}
          onResetFilters={handleResetFilters}
        />

        <CraftsmanshipSection />
      </main>

      <Footer
        onSelectCity={setSelectedCity}
        onOpenOrders={() => setIsOrdersOpen(true)}
      />

      <DishDetailModal
        dish={activeDish}
        currencyMode={currencyMode}
        onClose={() => setActiveDish(null)}
        onAddToCart={addToCart}
      />

      <CartDrawer
        isOpen={isCartOpen}
        items={cartItems}
        currencyMode={currencyMode}
        selectedCity={selectedCity}
        onClose={() => setIsCartOpen(false)}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onPlaceOrder={handlePlaceOrder}
      />

      <OrdersPanel
        isOpen={isOrdersOpen}
        orders={orders}
        currencyMode={currencyMode}
        onClose={() => setIsOrdersOpen(false)}
        onAdvanceStatus={handleAdvanceOrderStatus}
      />
    </div>
  );
}
