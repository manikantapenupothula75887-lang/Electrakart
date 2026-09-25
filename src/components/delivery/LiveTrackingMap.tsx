import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Truck,
  Navigation,
  Clock,
  Store,
  Warehouse,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Maximize2,
  CheckCircle2,
} from 'lucide-react';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface LiveTrackingMapProps {
  pickup: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    type?: 'RETAILER' | 'DISTRIBUTOR';
  };
  drop: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
  };
  telemetry?: {
    latitude: number;
    longitude: number;
    distanceRemainingKm?: number;
    etaMinutes?: number;
    heading?: number;
    speed?: number;
    recordedAt?: string;
    isStale?: boolean;
  };
  rider?: {
    name?: string;
    phone?: string;
    vehicleNumber?: string;
  };
  status: string;
  className?: string;
}

export const LiveTrackingMap: React.FC<LiveTrackingMapProps> = ({
  pickup,
  drop,
  telemetry,
  rider,
  status,
  className = '',
}) => {
  const [secondsAgo, setSecondsAgo] = useState(0);

  // Track elapsed seconds since last telemetry update
  useEffect(() => {
    setSecondsAgo(0);
    const timer = setInterval(() => {
      setSecondsAgo((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [telemetry?.recordedAt, telemetry?.latitude, telemetry?.longitude]);

  // Compute normalized bounding box coordinates for vector SVG canvas
  const minLat = Math.min(pickup.latitude, drop.latitude, telemetry?.latitude || pickup.latitude) - 0.005;
  const maxLat = Math.max(pickup.latitude, drop.latitude, telemetry?.latitude || drop.latitude) + 0.005;
  const minLon = Math.min(pickup.longitude, drop.longitude, telemetry?.longitude || pickup.longitude) - 0.005;
  const maxLon = Math.max(pickup.longitude, drop.longitude, telemetry?.longitude || drop.longitude) + 0.005;

  const latSpan = Math.max(0.005, maxLat - minLat);
  const lonSpan = Math.max(0.005, maxLon - minLon);

  // Map geographic coordinates to SVG 0-100% space
  const project = (lat: number, lon: number) => {
    const x = ((lon - minLon) / lonSpan) * 80 + 10; // 10% padding
    const y = ((maxLat - lat) / latSpan) * 70 + 15; // Invert Y (SVG top-down)
    return { x: Math.max(5, Math.min(95, x)), y: Math.max(10, Math.min(90, y)) };
  };

  const pPos = project(pickup.latitude, pickup.longitude);
  const dPos = project(drop.latitude, drop.longitude);
  const curPos = telemetry ? project(telemetry.latitude, telemetry.longitude) : pPos;

  const isCompleted = status === 'DELIVERED';
  const isStale = telemetry?.isStale || secondsAgo > 65;

  return (
    <div className={`relative overflow-hidden rounded-3xl bg-slate-950 border border-slate-800 shadow-2xl text-white ${className}`}>
      {/* Top Telemetry & Status HUD Header */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-700/60 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shrink-0 shadow-md shadow-amber-500/20">
              <Truck className="w-5 h-5" />
            </div>
            {!isCompleted && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                {isCompleted ? 'Package Delivered' : status.replace('_', ' ')}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                LIVE GPS
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-300 font-medium mt-0.5">
              <span>{rider?.name || 'Assigned Logistics Pilot'}</span>
              {rider?.vehicleNumber && (
                <span className="text-slate-400 font-mono text-[11px]">&bull; {rider.vehicleNumber}</span>
              )}
            </div>
          </div>
        </div>

        {/* ETA & Distance Remaining */}
        <div className="flex items-center gap-3 text-right">
          {!isCompleted && telemetry?.distanceRemainingKm !== undefined ? (
            <div>
              <div className="flex items-center gap-1.5 justify-end text-emerald-400 font-black text-sm sm:text-base font-mono">
                <Clock className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span>~{telemetry.etaMinutes ?? 12} mins</span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono block">
                {telemetry.distanceRemainingKm} km remaining
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-emerald-400 text-xs font-bold font-mono">
              <CheckCircle2 className="w-4 h-4" />
              <span>Journey Completed</span>
            </div>
          )}
        </div>
      </div>

      {/* Vector Interactive Map Canvas */}
      <div className="relative w-full h-[380px] sm:h-[440px] bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 select-none">
        {/* Subtle Map Grid Lines & Radar concentric circles */}
        <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="mapGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#64748b" strokeWidth="0.8" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#mapGrid)" />
        </svg>

        {/* Real Dynamic Transit Route Polyline */}
        <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none">
          {/* Background Track Line */}
          <line
            x1={`${pPos.x}%`}
            y1={`${pPos.y}%`}
            x2={`${dPos.x}%`}
            y2={`${dPos.y}%`}
            stroke="#334155"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray="6 6"
          />

          {/* Active Traversed Route */}
          <line
            x1={`${pPos.x}%`}
            y1={`${pPos.y}%`}
            x2={`${curPos.x}%`}
            y2={`${curPos.y}%`}
            stroke="#f59e0b"
            strokeWidth="4"
            strokeLinecap="round"
          />

          {/* Remaining Path to Destination */}
          <line
            x1={`${curPos.x}%`}
            y1={`${curPos.y}%`}
            x2={`${dPos.x}%`}
            y2={`${dPos.y}%`}
            stroke="#10b981"
            strokeWidth="3"
            strokeDasharray="4 4"
            strokeOpacity="0.8"
          />
        </svg>

        {/* Pickup Pin Marker */}
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center group cursor-pointer transition-all duration-300"
          style={{ left: `${pPos.x}%`, top: `${pPos.y}%` }}
        >
          <div className="p-2 rounded-xl bg-slate-800 border-2 border-amber-500 text-amber-400 shadow-lg shadow-amber-500/20 group-hover:scale-110 transition-transform">
            {pickup.type === 'DISTRIBUTOR' ? <Warehouse className="w-4 h-4" /> : <Store className="w-4 h-4" />}
          </div>
          <span className="mt-1 px-2 py-0.5 rounded bg-slate-900/90 text-[10px] font-bold text-amber-300 border border-slate-700 whitespace-nowrap shadow-md">
            {pickup.name}
          </span>
        </div>

        {/* Drop Destination Pin Marker */}
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center group cursor-pointer transition-all duration-300"
          style={{ left: `${dPos.x}%`, top: `${dPos.y}%` }}
        >
          <div className="p-2 rounded-xl bg-emerald-600 border-2 border-white text-white shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform">
            <MapPin className="w-4 h-4" />
          </div>
          <span className="mt-1 px-2 py-0.5 rounded bg-slate-900/90 text-[10px] font-bold text-emerald-300 border border-slate-700 whitespace-nowrap shadow-md">
            Destination: {drop.name}
          </span>
        </div>

        {/* Live Moving Pilot Marker (Smooth transition on GPS updates) */}
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center cursor-pointer transition-all duration-700 ease-out"
          style={{ left: `${curPos.x}%`, top: `${curPos.y}%` }}
        >
          {/* Radar Waves around Rider */}
          {!isCompleted && (
            <div className="absolute -inset-3 rounded-full bg-amber-500/20 animate-ping pointer-events-none" />
          )}

          <div className="relative p-2.5 rounded-full bg-amber-500 text-slate-950 shadow-xl shadow-amber-500/50 ring-4 ring-amber-400/30 font-black">
            <Navigation
              className="w-5 h-5 transition-transform duration-500"
              style={{ transform: `rotate(${telemetry?.heading ?? 45}deg)` }}
            />
          </div>

          <div className="mt-1.5 px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-lg flex items-center gap-1">
            <span>Pilot</span>
            {telemetry?.speed !== undefined && telemetry.speed > 0 && (
              <span className="font-mono text-[9px] font-bold">({Math.round(telemetry.speed)} km/h)</span>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Telemetry Health & Status Bar */}
      <div className="p-4 bg-slate-900/95 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                isCompleted
                  ? 'bg-emerald-400'
                  : isStale
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-emerald-400 animate-ping'
              }`}
            />
            <span className="text-slate-300 font-medium">
              {isCompleted
                ? 'Delivery finalized at destination.'
                : isStale
                ? 'Location update delayed (carrier syncing)'
                : `Updated ${secondsAgo}s ago`}
            </span>
          </div>

          {isStale && (
            <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 font-bold">
              <AlertTriangle className="w-3 h-3" />
              <span>Delay</span>
            </span>
          )}
        </div>

        {/* Destination Coordinate Stamp */}
        <div className="flex items-center gap-4 text-slate-400 font-mono text-[11px]">
          <span>
            Drop GPS: {drop.latitude.toFixed(4)}° N, {drop.longitude.toFixed(4)}° E
          </span>
          {rider?.phone && (
            <a
              href={`tel:${rider.phone}`}
              className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold font-sans transition-colors"
            >
              Call Pilot
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
