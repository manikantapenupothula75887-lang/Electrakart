/**
 * ElectraKart Authentication Service
 * Clean boundary separating Demo Role Switching from Production JWT/OAuth authentication.
 */

import { UserRole, User } from '../types';

export interface AuthSession {
  token: string;
  refreshToken?: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: UserRole;
    city: string;
    pincode: string;
  };
  expiresAt: string;
}

export interface IAuthService {
  login(emailOrPhone: string, password?: string, role?: UserRole): Promise<AuthSession>;
  logout(): Promise<void>;
  getCurrentSession(): AuthSession | null;
  switchRoleDemo(role: UserRole): Promise<AuthSession>;
  isAuthenticated(): boolean;
}

/**
 * Demo Implementation for Phase 1
 * Backed by localStorage and instant reviewer role switching.
 */
class DemoAuthService implements IAuthService {
  private readonly STORAGE_KEY = 'electrakart_auth_session';

  async login(emailOrPhone: string, _password?: string, role: UserRole = 'CUSTOMER'): Promise<AuthSession> {
    const session: AuthSession = {
      token: `demo-jwt-${role.toLowerCase()}-${Date.now()}`,
      user: {
        id: `usr-${role.toLowerCase()}-1`,
        email: emailOrPhone,
        fullName:
          role === 'RETAILER'
            ? 'Vijayawada Electricals (Murali Krishna)'
            : role === 'DISTRIBUTOR'
            ? 'ABC Central Hub (Venkat Rao)'
            : role === 'ADMIN'
            ? 'Super Admin Console'
            : 'Anil Kumar Reddy',
        role,
        city: 'Vijayawada',
        pincode: '520002',
      },
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));
    localStorage.setItem('electrakart_role', role);
    return session;
  }

  async logout(): Promise<void> {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.setItem('electrakart_role', 'CUSTOMER');
  }

  getCurrentSession(): AuthSession | null {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (!saved) return null;
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  }

  async switchRoleDemo(role: UserRole): Promise<AuthSession> {
    let email = 'anil.reddy@gmail.com';
    if (role === 'RETAILER') email = 'murali.vjaelec@gmail.com';
    if (role === 'DISTRIBUTOR') email = 'dispatch@abcdistributors.in';
    if (role === 'ADMIN') email = 'admin@electrakart.in';

    return this.login(email, 'password123', role);
  }

  isAuthenticated(): boolean {
    return !!this.getCurrentSession();
  }
}

export const authService: IAuthService = new DemoAuthService();
