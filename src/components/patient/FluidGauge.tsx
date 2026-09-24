'use client';

import React from 'react';
import {Droplet} from 'lucide-react';

interface FluidGaugeProps {
    netFluid: number;
    limit: number;
    percentage: number;
}

export default function FluidGauge({netFluid, limit, percentage}: FluidGaugeProps) {
    const clampedPercent = Math.max(0, Math.min(percentage, 100));
    const isOver = netFluid > limit;

    const colorConfig = isOver
        ? {text: 'text-red-600', ring: '#ef4444', bg: 'bg-red-50'}
        : percentage > 75
            ? {text: 'text-amber-500', ring: '#f59e0b', bg: 'bg-amber-50'}
            : {text: 'text-blue-600', ring: '#2563eb', bg: 'bg-blue-50'};

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col items-center">
            <h3 className="text-gray-700 font-semibold mb-4 text-sm tracking-wide">Batas Cairan Hari Ini</h3>

            <div className="relative w-48 h-48 flex items-center justify-center">
                <div
                    className="absolute inset-0 rounded-full transition-all duration-700"
                    style={{
                        background: `conic-gradient(${colorConfig.ring} ${clampedPercent}%, #f3f4f6 ${clampedPercent}%)`,
                        padding: '12px',
                    }}
                >
                    <div
                        className="w-full h-full bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
                        <Droplet className={`w-8 h-8 ${colorConfig.text} mb-1 animate-pulse`}/>
                        <span className="text-3xl font-extrabold text-gray-900 tracking-tight">{netFluid}</span>
                        <span className="text-xs text-gray-400 font-medium mt-0.5">dari {limit} mL</span>
                    </div>
                </div>
            </div>

            <p className={`mt-5 text-sm font-bold ${colorConfig.text}`}>
                {isOver
                    ? `Melebihi batas (${netFluid - limit} mL)`
                    : `Sisa kuota: ${limit - netFluid} mL`}
            </p>
        </div>
    );
}