'use client';

import React, {useEffect, useState} from 'react';
import Link from 'next/link';
import {usePathname, useRouter} from 'next/navigation';
import {createClient} from '@/lib/supabase/client';
import {
    Activity,
    BarChart3,
    Bell,
    Calendar,
    FlaskConical,
    HeartPulse,
    Home,
    LogOut,
    Menu,
    MessageSquareMore,
    Smartphone,
    UserCheck,
    Users,
    X,
} from 'lucide-react';

interface NurseLayoutProps {
    children: React.ReactNode;
}

const navItems = [
    {href: '/nurse', label: 'Beranda', icon: Home},
    {href: '/nurse/pasien', label: 'Pasien', icon: Users},
    {href: '/nurse/sesi-hd', label: 'Sesi HD', icon: Activity},
    {href: '/nurse/pemantauan', label: 'Pantau Rumah', icon: Smartphone},
    {href: '/nurse/keluhan', label: 'Keluhan', icon: MessageSquareMore},
    {href: '/nurse/jadwal', label: 'Jadwal', icon: Calendar},
    {href: '/nurse/lab', label: 'Hasil Lab', icon: FlaskConical},
    {href: '/nurse/statistik', label: 'Statistik', icon: BarChart3},
];

export default function NurseLayout({children}: NurseLayoutProps) {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [nurseProfile, setNurseProfile] = useState<{ name: string } | null>(null);
    const [unreadAlertCount, setUnreadAlertCount] = useState<number>(0);

    // Ambil profil perawat & hitung notifikasi aktif
    useEffect(() => {
        async function loadNurseData() {
            const {data: {user}} = await supabase.auth.getUser();
            if (user) {
                const {data: profile} = await supabase
                    .from('profiles')
                    .select('name')
                    .eq('id', user.id)
                    .single();
                if (profile) setNurseProfile(profile);
            }

            // Hitung Alert belum dibaca
            const {count: alertCount} = await supabase
                .from('alerts')
                .select('*', {count: 'exact', head: true})
                .eq('is_read', false);

            // Hitung Keluhan Baru
            const {count: complaintCount} = await supabase
                .from('complaints')
                .select('*', {count: 'exact', head: true})
                .eq('status', 'Baru');

            setUnreadAlertCount((alertCount || 0) + (complaintCount || 0));
        }

        loadNurseData();
    }, [supabase, pathname]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
        router.refresh();
    };

    return (
        <div className="flex h-[100dvh] bg-gray-100 overflow-hidden font-sans">
            {/* SIDEBAR DESKTOP */}
            <aside className="hidden md:flex flex-col w-64 bg-teal-900 text-white shrink-0 z-30 shadow-xl">
                {/* Header Logo */}
                <div className="p-5 border-b border-teal-800/80 flex items-center gap-3">
                    <div
                        className="w-10 h-10 rounded-xl bg-teal-700/60 flex items-center justify-center text-teal-300 shadow-inner">
                        <HeartPulse className="w-6 h-6 animate-pulse"/>
                    </div>
                    <div>
                        <h1 className="font-extrabold text-lg tracking-wider text-white">SMART-HD</h1>
                        <p className="text-[10px] text-teal-300 font-medium">Portal Tenaga Medis</p>
                    </div>
                </div>

                {/* Profil Singkat */}
                <div className="px-5 py-4 bg-teal-950/40 border-b border-teal-800/50 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-teal-800 flex items-center justify-center text-teal-300">
                        <UserCheck className="w-5 h-5"/>
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-[11px] text-teal-300">Selamat bertugas,</p>
                        <p className="text-xs font-bold text-white truncate">
                            {nurseProfile?.name || 'Petugas Perawat'}
                        </p>
                    </div>
                </div>

                {/* Menu Navigasi */}
                <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 scrollbar-thin scrollbar-thumb-teal-800">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                                    isActive
                                        ? 'bg-teal-700 text-white shadow-sm shadow-teal-950/20 translate-x-1'
                                        : 'text-teal-100/80 hover:bg-teal-800/60 hover:text-white'
                                }`}
                            >
                                <Icon className={`w-4 h-4 ${isActive ? 'text-teal-300' : 'text-teal-400'}`}/>
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Tombol Logout */}
                <div className="p-4 border-t border-teal-800/60">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-teal-200 hover:bg-red-600/80 hover:text-white transition-colors"
                    >
                        <LogOut className="w-4 h-4"/>
                        <span>Keluar Sistem</span>
                    </button>
                </div>
            </aside>

            {/* MOBILE DRAWER OVERLAY */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm animate-in fade-in"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* MOBILE SIDEBAR (DRAWER) */}
            <div
                className={`fixed top-0 bottom-0 left-0 w-72 bg-teal-950 text-white z-50 flex flex-col transform transition-transform duration-300 md:hidden ${
                    isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <div className="p-4 border-b border-teal-800 flex justify-between items-center">
                    <div className="flex items-center gap-2.5">
                        <HeartPulse className="w-6 h-6 text-teal-400"/>
                        <span className="font-extrabold text-base">SMART-HD Perawat</span>
                    </div>
                    <button
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="p-1 rounded-lg text-teal-300 hover:bg-teal-800"
                    >
                        <X className="w-5 h-5"/>
                    </button>
                </div>

                <nav className="flex-1 overflow-y-auto p-4 space-y-2">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold ${
                                    isActive ? 'bg-teal-700 text-white' : 'text-teal-200 hover:bg-teal-800'
                                }`}
                            >
                                <Icon className="w-5 h-5"/>
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-teal-800">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm"
                    >
                        <LogOut className="w-4 h-4"/> Keluar
                    </button>
                </div>
            </div>

            {/* KONTEN UTAMA */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* TOP BAR */}
                <header
                    className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3.5 flex items-center justify-between z-10 shrink-0">
                    <div className="flex items-center gap-3">
                        {/* Tombol Hamburger Mobile */}
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="p-2 -ml-2 rounded-xl text-gray-600 hover:bg-gray-100 md:hidden"
                        >
                            <Menu className="w-5 h-5"/>
                        </button>
                        <h2 className="text-base sm:text-lg font-bold text-gray-800 capitalize">
                            {navItems.find((i) => i.href === pathname)?.label || 'Dashboard Tenaga Medis'}
                        </h2>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Lonceng Notifikasi */}
                        <Link
                            href="/nurse/pemantauan"
                            className="relative p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition"
                        >
                            <Bell className="w-5 h-5"/>
                            {unreadAlertCount > 0 && (
                                <span
                                    className="absolute top-1 right-1 min-w-4 h-4 px-1 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-pulse">
                  {unreadAlertCount}
                </span>
                            )}
                        </Link>
                    </div>
                </header>

                {/* BODY HALAMAN */}
                <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50/70">
                    {children}
                </main>
            </div>
        </div>
    );
}