import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Truck, Clock, Award, Phone, Mail, MapPin, ExternalLink } from 'lucide-react';
import { ElectraKartLogo } from '../common/ElectraKartLogo';

export const CustomerFooter: React.FC = () => {
  return (
    <footer className="no-print bg-slate-950 text-slate-400 border-t border-slate-800 text-xs mt-16 pb-20 sm:pb-8">
      {/* Guarantees Strip */}
      <div className="border-b border-slate-800/80 bg-slate-900/50 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-white font-bold text-sm">100% Genuine ISI / BIS</h4>
              <p className="text-[11px] text-slate-400">Direct from certified distributors</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-white font-bold text-sm">30–60 Min Rapid Dispatch</h4>
              <p className="text-[11px] text-slate-400">Fulfillments from verified stores near you</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-white font-bold text-sm">Locked Price Guarantee</h4>
              <p className="text-[11px] text-slate-400">48-hr price lock on every quotation</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-white font-bold text-sm">Consolidated Delivery</h4>
              <p className="text-[11px] text-slate-400">Multiple stores, one unified tracking</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 md:grid-cols-5 gap-8">
        {/* Brand Column */}
        <div className="md:col-span-2 space-y-4">
          <ElectraKartLogo variant="light" size="lg" />
          <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
            ElectraKart is India's premier B2B/B2C electrical fulfillment technology platform connecting
            homeowners, commercial contractors, electricians, verified retailers, and regional master distributors.
          </p>
          <div className="space-y-2 pt-2 text-xs">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Auto Nagar Logistics Zone, Vijayawada, Andhra Pradesh - 520007</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Partner Toll Free: 1800 209 8844 (9 AM - 8 PM IST)</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-amber-400 shrink-0" />
              <span>orders@electrakart.in | support@electrakart.in</span>
            </div>
          </div>
        </div>

        {/* Customer Quick Links */}
        <div>
          <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-4">Customer Links</h4>
          <ul className="space-y-2.5">
            <li>
              <Link to="/customer/shop" className="hover:text-amber-400 transition-colors">
                Shop All Electricals
              </Link>
            </li>
            <li>
              <Link to="/customer/estimate" className="hover:text-amber-400 transition-colors font-semibold text-amber-300">
                Upload Contractor Estimate
              </Link>
            </li>
            <li>
              <Link to="/customer/orders" className="hover:text-amber-400 transition-colors">
                Track Live Order
              </Link>
            </li>
            <li>
              <Link to="/customer/search?q=6-9+switch" className="hover:text-amber-400 transition-colors">
                Smart Clarification Search
              </Link>
            </li>
            <li>
              <Link to="/customer/account" className="hover:text-amber-400 transition-colors">
                Contractor Trade Account
              </Link>
            </li>
          </ul>
        </div>

        {/* Partner Portals */}
        <div>
          <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-4">Partner Ecosystem</h4>
          <ul className="space-y-2.5">
            <li>
              <Link to="/partner/register" className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1">
                <span>Become an ElectraKart Partner</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </li>
            <li>
              <Link to="/retailer" className="hover:text-amber-400 transition-colors">
                Retailer Store Dashboard
              </Link>
            </li>
            <li>
              <Link to="/retailer/inventory" className="hover:text-amber-400 transition-colors">
                Retailer Bulk Stock Upload
              </Link>
            </li>
            <li>
              <Link to="/distributor" className="hover:text-amber-400 transition-colors">
                Distributor Warehouse Hub
              </Link>
            </li>
            <li>
              <Link to="/admin" className="hover:text-amber-400 transition-colors">
                Master Admin Portal
              </Link>
            </li>
            <li>
              <Link to="/login" className="hover:text-amber-400 transition-colors">
                Role Login
              </Link>
            </li>
          </ul>
        </div>

        {/* Active Hubs */}
        <div>
          <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-4">Fulfillment Hubs</h4>
          <div className="flex flex-wrap gap-1.5">
            {[
              'Vijayawada',
              'Guntur',
              'Visakhapatnam',
              'Hyderabad',
              'Bengaluru',
              'Chennai',
              'Mumbai',
              'Delhi NCR',
              'Pune',
            ].map((city) => (
              <span
                key={city}
                className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-300"
              >
                {city}
              </span>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800">
            <span className="text-[11px] text-slate-400 block font-medium">GST Compliant Platform</span>
            <span className="text-[10px] text-slate-500 font-mono">CIN: U31900AP2026PTC081294</span>
          </div>
        </div>
      </div>

      {/* Copyright row */}
      <div className="border-t border-slate-800/80 pt-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
          <p>© {new Date().getFullYear()} ElectraKart Technologies Private Limited. All Rights Reserved.</p>
          <div className="flex items-center gap-4">
            <span>Privacy Policy</span>
            <span>Terms of Trade</span>
            <span>Electrician Safety Code</span>
            <span>e-Way Bill Integration</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
