'use client';

import React, {useState} from 'react';
import {useRouter} from 'next/navigation';
import {createClient} from '@/lib/supabase/client';
import {
    AlertCircle,
    ArrowLeft,
    ChevronRight,
    Eye,
    EyeOff,
    HeartPulse,
    Loader2,
    Lock,
    ShieldCheck,
    Stethoscope,
    User,
} from 'lucide-react';

type Role = 'nurse' | 'patient';

export default function LoginPage() {
    const router = useRouter();
    const supabase = createClient();

    // State Manajemen Form
    const [step, setStep] = useState<'select-role' | 'form'>('select-role');
    const [role, setRole] = useState<Role>('nurse');
    const [identifier, setIdentifier] = useState(''); // Email atau No. RM / Username
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Konfigurasi Tema Dinamis berdasarkan Peran
    const isNurse = role === 'nurse';
    const theme = {
        primaryBg: isNurse ? 'bg-teal-600 hover:bg-teal-700' : 'bg-blue-600 hover:bg-blue-700',
        ringFocus: isNurse ? 'focus:ring-teal-500 focus:border-teal-500' : 'focus:ring-blue-500 focus:border-blue-500',
        lightBg: isNurse ? 'bg-teal-50' : 'bg-blue-50',
        borderActive: isNurse ? 'border-teal-500' : 'border-blue-500',
        textColor: isNurse ? 'text-teal-600' : 'text-blue-600',
    };

    const handleSelectRole = (selectedRole: Role) => {
        setRole(selectedRole);
        setStep('form');
        setErrorMessage(null);
    };

    const handleBackToSelectRole = () => {
        setStep('select-role');
        setErrorMessage(null);
    };

    // Quick-fill untuk pengujian demo
    const fillDemoAccount = (demoRole: Role, demoId: string, demoPass: string) => {
        setRole(demoRole);
        setIdentifier(demoId);
        setPassword(demoPass);
        setStep('form');
        setErrorMessage(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMessage(null);

        try {
            // Normalisasi format identifier (Jika input No. RM atau username tanpa domain email)
            const emailToAuth = identifier.includes('@')
                ? identifier.trim()
                : `${identifier.trim().toLowerCase()}@smarthd.local`;

            // 1. Autentikasi dengan Supabase Auth
            const {data: authData, error: authError} = await supabase.auth.signInWithPassword({
                email: emailToAuth,
                password: password,
            });

            if (authError || !authData.user) {
                throw new Error(
                    authError?.message === 'Invalid login credentials'
                        ? 'Username, No. RM, atau kata sandi tidak valid.'
                        : authError?.message || 'Gagal masuk ke sistem.'
                );
            }

            // 2. Verifikasi kesesuaian Role di tabel public.profiles
            const {data: profile, error: profileError} = await supabase
                .from('profiles')
                .select('role')
                .eq('id', authData.user.id)
                .single();

            if (profileError || !profile) {
                await supabase.auth.signOut();
                throw new Error('Profil pengguna tidak ditemukan.');
            }

            if (profile.role !== role) {
                await supabase.auth.signOut();
                throw new Error(
                    `Akun ini terdaftar sebagai ${profile.role === 'nurse' ? 'Perawat' : 'Pasien'}, bukan ${
                        role === 'nurse' ? 'Perawat' : 'Pasien'
                    }. Silakan ganti pilihan peran.`
                );
            }

            // 3. Arahkan ke dashboard yang sesuai
            router.push(role === 'nurse' ? '/nurse' : '/patient');
            router.refresh();
        } catch (err: any) {
            setErrorMessage(err.message || 'Terjadi kesalahan sistem saat autentikasi.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div
            className="min-h-[100dvh] w-full flex items-center justify-center bg-gradient-to-br from-teal-600 via-teal-700 to-blue-800 p-4 sm:p-6">
            <div
                className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden transition-all duration-300">

                {/* Header Branding */}
                <div className="bg-gray-50/80 p-6 text-center border-b border-gray-100">
                    <div
                        className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-100 text-teal-600 mb-3 shadow-inner">
                        <HeartPulse className="w-8 h-8 animate-pulse"/>
                    </div>
                    <h1 className="text-2xl font-black tracking-tight text-gray-900">SMART-HD</h1>
                    <p className="text-xs text-gray-500 mt-1 font-medium">
                        Sistem Pemantauan Hemodialisis Terintegrasi
                    </p>
                </div>

                {/* Card Body */}
                <div className="p-6 sm:p-8">
                    {/* TAHAP 1: PEMILIHAN PERAN */}
                    {step === 'select-role' && (
                        <div className="space-y-4 animate-in fade-in duration-200">
                            <div className="text-center mb-6">
                                <h2 className="text-lg font-bold text-gray-800">Pilih Peran Masuk</h2>
                                <p className="text-xs text-gray-500 mt-0.5">Tentukan jenis akses akun Anda di sistem</p>
                            </div>

                            {/* Opsi Perawat */}
                            <button
                                type="button"
                                onClick={() => handleSelectRole('nurse')}
                                className="w-full group flex items-center justify-between p-4 border-2 border-gray-100 rounded-2xl hover:border-teal-500 hover:bg-teal-50/60 transition-all duration-200 active:scale-[0.98]"
                            >
                                <div className="flex items-center gap-4 text-left">
                                    <div
                                        className="w-12 h-12 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center transition-transform group-hover:scale-105">
                                        <Stethoscope className="w-6 h-6"/>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-sm">Petugas / Perawat</h3>
                                        <p className="text-xs text-gray-500 mt-0.5">Akses unit klinis, sesi HD &
                                            jadwal</p>
                                    </div>
                                </div>
                                <ChevronRight
                                    className="w-5 h-5 text-gray-400 group-hover:text-teal-600 transition-colors"/>
                            </button>

                            {/* Opsi Pasien */}
                            <button
                                type="button"
                                onClick={() => handleSelectRole('patient')}
                                className="w-full group flex items-center justify-between p-4 border-2 border-gray-100 rounded-2xl hover:border-blue-500 hover:bg-blue-50/60 transition-all duration-200 active:scale-[0.98]"
                            >
                                <div className="flex items-center gap-4 text-left">
                                    <div
                                        className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center transition-transform group-hover:scale-105">
                                        <User className="w-6 h-6"/>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-sm">Pasien Mandiri</h3>
                                        <p className="text-xs text-gray-500 mt-0.5">Pantau BB harian, cairan &
                                            keluhan</p>
                                    </div>
                                </div>
                                <ChevronRight
                                    className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors"/>
                            </button>

                            {/* Box Info Demo */}
                            <div className="mt-8 p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700 mb-2">
                                    <ShieldCheck className="w-4 h-4 text-teal-600"/>
                                    <span>Akses Cepat Pengujian (Demo):</span>
                                </div>
                                <div className="flex flex-wrap gap-2 text-xs">
                                    <button
                                        type="button"
                                        onClick={() => fillDemoAccount('nurse', 'perawat1@smarthd.local', 'perawat123')}
                                        className="px-2.5 py-1.5 bg-teal-100 text-teal-800 rounded-lg font-medium hover:bg-teal-200 transition"
                                    >
                                        Perawat Demo
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => fillDemoAccount('patient', 'pasien1@smarthd.local', 'pasien123')}
                                        className="px-2.5 py-1.5 bg-blue-100 text-blue-800 rounded-lg font-medium hover:bg-blue-200 transition"
                                    >
                                        Pasien 1 (Budi)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => fillDemoAccount('patient', 'pasien2@smarthd.local', 'pasien123')}
                                        className="px-2.5 py-1.5 bg-blue-100 text-blue-800 rounded-lg font-medium hover:bg-blue-200 transition"
                                    >
                                        Pasien 2 (Siti)
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAHAP 2: FORM LOGIN */}
                    {step === 'form' && (
                        <div className="animate-in fade-in duration-200">
                            <div className="flex items-center justify-between mb-6">
                                <button
                                    type="button"
                                    onClick={handleBackToSelectRole}
                                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition"
                                >
                                    <ArrowLeft className="w-4 h-4"/> Ganti Peran
                                </button>
                                <span
                                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                                        isNurse ? 'bg-teal-100 text-teal-800' : 'bg-blue-100 text-blue-800'
                                    }`}
                                >
                  {isNurse ? 'Akses Perawat' : 'Akses Pasien'}
                </span>
                            </div>

                            {/* Alert Notifikasi Error */}
                            {errorMessage && (
                                <div
                                    className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2 animate-shake">
                                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5"/>
                                    <span>{errorMessage}</span>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                        {isNurse ? 'Username atau Email Perawat' : 'No. Rekam Medis (RM) atau Email'}
                                    </label>
                                    <div className="relative">
                                        <div
                                            className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                                            <User className="w-4 h-4"/>
                                        </div>
                                        <input
                                            type="text"
                                            required
                                            value={identifier}
                                            onChange={(e) => setIdentifier(e.target.value)}
                                            placeholder={isNurse ? 'Contoh: perawat1' : 'Contoh: RM-001 atau pasien1'}
                                            className={`w-full pl-10 pr-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm text-gray-900 outline-none transition ${theme.ringFocus}`}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                        Kata Sandi
                                    </label>
                                    <div className="relative">
                                        <div
                                            className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                                            <Lock className="w-4 h-4"/>
                                        </div>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className={`w-full pl-10 pr-11 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm text-gray-900 outline-none transition ${theme.ringFocus}`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                                        </button>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className={`w-full mt-2 py-3 px-4 text-white text-sm font-bold rounded-xl shadow-lg transition-all duration-150 flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-70 ${theme.primaryBg}`}
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin"/>
                                            <span>Memverifikasi...</span>
                                        </>
                                    ) : (
                                        <span>Masuk ke SMART-HD</span>
                                    )}
                                </button>
                            </form>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 text-center border-t border-gray-100 text-[11px] text-gray-400">
                    Unit Hemodialisis Terpadu &copy; 2026 SMART-HD
                </div>
            </div>
        </div>
    );
}