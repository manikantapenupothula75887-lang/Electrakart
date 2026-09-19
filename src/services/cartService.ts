/**
 * ElectraKart Cart Service
 * Supports multi-store product grouping and cart session persistence.
 */

import { CartItem, Product, NearbyStoreStock } from '../types';

export interface ICartService {
  getCart(): CartItem[];
  addItem(cart: CartItem[], product: Product, quantity?: number, selectedStore?: NearbyStoreStock): CartItem[];
  removeItem(cart: CartItem[], sku: string): CartItem[];
  updateQuantity(cart: CartItem[], sku: string, quantity: number): CartItem[];
  clearCart(): CartItem[];
}

class DemoCartService implements ICartService {
  getCart(): CartItem[] {
    const saved = localStorage.getItem('electrakart_cart');
    return saved ? JSON.parse(saved) : [];
  }

  addItem(
    cart: CartItem[],
    product: Product,
    quantity = 1,
    selectedStore?: NearbyStoreStock
  ): CartItem[] {
    const defaultStore: NearbyStoreStock = selectedStore || {
      partnerId: 'partner-vja-elec-1',
      storeName: 'Vijayawada Electricals & Hardware',
      partnerType: 'RETAILER',
      city: 'Vijayawada',
      distanceKm: 2.5,
      deliveryEtaMin: 40,
      stockCount: 14,
      price: product.sellingPrice,
      rating: 4.9,
      address: 'Besant Road, Governorpet, Vijayawada',
    };

    const existingIdx = cart.findIndex((item) => item.product.sku === product.sku);
    let updated: CartItem[];

    if (existingIdx > -1) {
      updated = [...cart];
      updated[existingIdx].quantity += quantity;
    } else {
      updated = [...cart, { product, quantity, selectedStore: defaultStore }];
    }

    localStorage.setItem('electrakart_cart', JSON.stringify(updated));
    return updated;
  }

  removeItem(cart: CartItem[], sku: string): CartItem[] {
    const updated = cart.filter((item) => item.product.sku !== sku);
    localStorage.setItem('electrakart_cart', JSON.stringify(updated));
    return updated;
  }

  updateQuantity(cart: CartItem[], sku: string, quantity: number): CartItem[] {
    if (quantity <= 0) {
      return this.removeItem(cart, sku);
    }
    const updated = cart.map((item) => (item.product.sku === sku ? { ...item, quantity } : item));
    localStorage.setItem('electrakart_cart', JSON.stringify(updated));
    return updated;
  }

  clearCart(): CartItem[] {
    localStorage.removeItem('electrakart_cart');
    return [];
  }
}

export const cartService: ICartService = new DemoCartService();
