import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  User,
  Store,
  Warehouse,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Lock,
  Mail,
  Zap,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { UserRole } from '../../types';
import { ElectraKartLogo } from '../../components/common/ElectraKartLogo';

export const LoginPage: React.FC = () => {
  const { setUserRole } = useStore();
  const [selectedRole, setSelectedRole] = useState<UserRole>('CUSTOMER');
  const [email, setEmail] = useState('anil.reddy@gmail.com');
  const [password, setPassword] = useState('password123');
  const navigate = useNavigate();

  const handleRoleTabChange = (role: UserRole) => {
    setSelectedRole(role);
    if (role === 'CUSTOMER') {
      setEmail('anil.reddy@gmail.com');
    } else if (role === 'RETAILER') {
      setEmail('murali.vjaelec@gmail.com');
    } else if (role === 'DISTRIBUTOR') {
      setEmail('dispatch@abcdistributors.in');
    } else if (role === 'ADMIN') {
      setEmail('admin@electrakart.in');
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUserRole(selectedRole);

    if (selectedRole === 'CUSTOMER') {
      navigate('/');
    } else if (selectedRole === 'RETAILER') {
      navigate('/retailer');
    } else if (selectedRole === 'DISTRIBUTOR') {
      navigate('/distributor');
    } else if (selectedRole === 'ADMIN') {
      navigate('/admin');
    }
  };

  const handleQuickDemoLogin = (role: UserRole) => {
    setUserRole(role);
    if (role === 'CUSTOMER') navigate('/');
    else if (role === 'RETAILER') navigate('/retailer');
    else if (role === 'DISTRIBUTOR') navigate('/distributor');
    else if (role === 'ADMIN') navigate('/admin');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-4">
        <div className="flex justify-center">
          <ElectraKartLogo variant="light" size="lg" />
        </div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-white">
          Sign In to ElectraKart Ecosystem
        </h2>
        <p className="text-xs text-slate-400">
          Role-Based Access: Customer, Retailer, Distributor, and Super Admin
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-2xl rounded-3xl border border-slate-200 space-y-6">
          {/* Persona Selection Tabs */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
              Select Your Portal Role:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { role: 'CUSTOMER' as UserRole, label: 'Customer', icon: <User className="w-3.5 h-3.5" /> },
                { role: 'RETAILER' as UserRole, label: 'Retailer', icon: <Store className="w-3.5 h-3.5" /> },
                { role: 'DISTRIBUTOR' as UserRole, label: 'Distributor', icon: <Warehouse className="w-3.5 h-3.5" /> },
                { role: 'ADMIN' as UserRole, label: 'Admin', icon: <ShieldAlert className="w-3.5 h-3.5" /> },
              ].map((tab) => (
                <button
                  key={tab.role}
                  type="button"
                  onClick={() => handleRoleTabChange(tab.role)}
                  className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 border ${
                    selectedRole === tab.role
                      ? 'bg-slate-900 text-amber-400 border-slate-900 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Standard Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Email / Mobile Number</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 font-medium"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Password</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 font-medium font-mono"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 text-slate-950 font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 hover:scale-102"
            >
              <span>Login to {selectedRole} Portal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* 1-Click Demo Evaluation Buttons */}
          <div className="pt-4 border-t border-slate-100 space-y-2.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block text-center">
              Instant 1-Click Reviewer Access:
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('CUSTOMER')}
                className="p-2.5 rounded-xl bg-slate-100 hover:bg-amber-100 text-slate-800 font-bold text-left transition-colors"
              >
                👤 Customer (Vijayawada)
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('RETAILER')}
                className="p-2.5 rounded-xl bg-slate-100 hover:bg-blue-100 text-slate-800 font-bold text-left transition-colors"
              >
                🏪 Retailer (Besant Rd)
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('DISTRIBUTOR')}
                className="p-2.5 rounded-xl bg-slate-100 hover:bg-indigo-100 text-slate-800 font-bold text-left transition-colors"
              >
                🏭 Distributor (Auto Nagar)
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('ADMIN')}
                className="p-2.5 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-800 font-bold text-left transition-colors"
              >
                🛡️ Master Super Admin
              </button>
            </div>
          </div>
        </div>

        <div className="text-center mt-6 text-xs text-slate-400">
          Want to become an authorized retail or wholesale dealer?{' '}
          <Link to="/partner/register" className="text-amber-400 font-bold hover:underline">
            Register as an ElectraKart Partner
          </Link>
        </div>
      </div>
    </div>
  );
};
