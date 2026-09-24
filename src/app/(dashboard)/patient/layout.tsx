'use client';

import React, {useEffect, useState} from 'react';
import Link from 'next/link';
import {usePathname, useRouter} from 'next/navigation';
import {createClient} from '@/lib/supabase/client';
import {Droplet, Home, Loader2, LogOut, MessageSquareHeart, Scale, User,} from 'lucide-react';

interface PatientProfile {
    name: string;
    patient_id: string;
    patients: {
        rm: string;
        dry_weight: number;
        fluid_limit: number;
    };
}

const navMenus = [
    {href: '/patient', label: 'Beranda', icon: Home},
    {href: '/patient/berat', label: 'BB', icon: Scale},
    {href: '/patient/cairan', label: 'Cairan', icon: Droplet},
    {href: '/patient/keluhan', label: 'Keluhan', icon: MessageSquareHeart},
];

export default function PatientLayout({children}: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();

    const [profile, setProfile] = useState<PatientProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadProfile() {
            const {data: {user}} = await supabase.auth.getUser();
            if (user) {
                const {data} = await supabase
                    .from('profiles')
                    .select('name, patient_id, patients ( rm, dry_weight, fluid_limit )')
                    .eq('id', user.id)
                    .single();

                if (data) setProfile(data as unknown as PatientProfile);
            }
            setLoading(false);
        }

        loadProfile();
    }, [supabase]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
        router.refresh();
    };

    return (
        <div className="min-h-[100dvh] bg-gray-50 flex flex-col justify-between font-sans">
            {/* HEADER ATAS (STICKY) */}
            <header
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3.5 shadow-md sticky top-0 z-30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div
                        className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shadow-inner">
                        <User className="w-5 h-5"/>
                    </div>
                    <div>
                        <h1 className="font-bold text-sm leading-tight truncate max-w-[200px] sm:max-w-xs">
                            {loading ? 'Memuat profil...' : profile?.name || 'Pasien Mandiri'}
                        </h1>
                        <p className="text-[11px] text-blue-100 font-mono">
                            RM: {profile?.patients?.rm || '-'}
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleLogout}
                    title="Keluar Akun"
                    className="p-2 rounded-xl text-blue-100 hover:text-white hover:bg-white/10 transition active:scale-95"
                >
                    <LogOut className="w-5 h-5"/>
                </button>
            </header>

            {/* KONTEN UTAMA */}
            <main className="flex-1 w-full max-w-lg mx-auto p-4 pb-24 md:pb-6">
                {loading ? (
                    <div className="h-64 flex flex-col items-center justify-center text-blue-600 gap-2">
                        <Loader2 className="w-8 h-8 animate-spin"/>
                        <span className="text-xs font-semibold">Menyiapkan portal pasien...</span>
                    </div>
                ) : (
                    children
                )}
            </main>

            {/* NAVIGASI BAWAH (MOBILE BOTTOM BAR) */}
            <nav
                className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 px-4 py-2 flex justify-around items-center md:relative md:max-w-lg md:mx-auto md:border-none md:rounded-3xl md:mb-4 md:shadow-lg shadow-[0_-4px_16px_rgba(0,0,0,0.04)]">
                {navMenus.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex flex-col items-center py-1 px-3 rounded-2xl transition-all duration-200 ${
                                isActive
                                    ? 'text-blue-600 font-bold scale-105'
                                    : 'text-gray-400 hover:text-blue-500 font-medium'
                            }`}
                        >
                            <div
                                className={`p-1.5 rounded-xl transition-colors ${
                                    isActive ? 'bg-blue-50 text-blue-600' : 'bg-transparent'
                                }`}
                            >
                                <Icon className="w-5 h-5"/>
                            </div>
                            <span className="text-[10px] mt-0.5">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}