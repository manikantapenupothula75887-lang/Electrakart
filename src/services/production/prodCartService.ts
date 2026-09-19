/**
 * ElectraKart Production Cart Service
 * Manages customer multi-store cart operations.
 */

import { ICartService } from '../cartService';
import { CartItem, Product, NearbyStoreStock } from '../../types';

export class ProductionCartService implements ICartService {
  private readonly STORAGE_KEY = 'electrakart_cart';

  getCart(): CartItem[] {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  }

  saveCart(cart: CartItem[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cart));
  }

  addItem(cart: CartItem[], product: Product, quantity = 1, store?: NearbyStoreStock): CartItem[] {
    return this.addToCart(cart, product, quantity, store);
  }

  addToCart(cart: CartItem[], product: Product, quantity = 1, store?: NearbyStoreStock): CartItem[] {
    const fallbackStore: NearbyStoreStock = store || {
      partnerId: 'partner-vja-elec-1',
      storeName: 'Vijayawada Electricals & Hardware',
      partnerType: 'RETAILER',
      city: 'Vijayawada',
      distanceKm: 2.5,
      deliveryEtaMin: 45,
      stockCount: 14,
      price: product.sellingPrice,
      rating: 4.9,
      address: 'Besant Road, Governorpet, Vijayawada',
    };

    const existingIdx = cart.findIndex((item) => item.product.sku === product.sku);
    let updated: CartItem[];

    if (existingIdx > -1) {
      updated = [...cart];
      updated[existingIdx] = {
        ...updated[existingIdx],
        quantity: updated[existingIdx].quantity + quantity,
      };
    } else {
      updated = [
        ...cart,
        {
          product,
          quantity,
          selectedStore: fallbackStore,
        },
      ];
    }

    this.saveCart(updated);
    return updated;
  }

  removeItem(cart: CartItem[], sku: string): CartItem[] {
    const updated = cart.filter((item) => item.product.sku !== sku);
    this.saveCart(updated);
    return updated;
  }

  removeFromCart(cart: CartItem[], sku: string): CartItem[] {
    return this.removeItem(cart, sku);
  }

  updateQuantity(cart: CartItem[], sku: string, quantity: number): CartItem[] {
    if (quantity <= 0) {
      return this.removeItem(cart, sku);
    }
    const updated = cart.map((item) => (item.product.sku === sku ? { ...item, quantity } : item));
    this.saveCart(updated);
    return updated;
  }

  clearCart(): CartItem[] {
    localStorage.removeItem(this.STORAGE_KEY);
    return [];
  }
}

export const prodCartService = new ProductionCartService();
