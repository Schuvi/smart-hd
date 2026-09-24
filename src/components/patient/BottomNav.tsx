'use client';

import React from 'react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {GlassWater, Home, MessageSquareHeart, Weight} from 'lucide-react';

const menus = [
    {href: '/patient', label: 'Beranda', icon: Home},
    {href: '/patient/berat', label: 'BB', icon: Weight},
    {href: '/patient/cairan', label: 'Cairan', icon: GlassWater},
    {href: '/patient/keluhan', label: 'Keluhan', icon: MessageSquareHeart},
];

export default function BottomNav() {
    const pathname = usePathname();

    return (
        <nav
            className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 px-4 py-2 flex justify-around items-center md:hidden shadow-[0_-2px_10px_rgba(0,0,0,0.04)]">
            {menus.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`flex flex-col items-center py-1 px-3 transition-colors ${
                            isActive ? 'text-blue-600 font-bold' : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        <Icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''} transition-transform`}/>
                        <span className="text-[10px] mt-1">{item.label}</span>
                    </Link>
                );
            })}
        </nav>
    );
}