"use client";
import React, {useEffect, useState} from 'react';
import {createClient} from '@/lib/supabase/client';
import {Activity, BarChart2, Settings, Users} from 'lucide-react';
import {Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip} from 'recharts';

interface Patient {
    id: string;
    dry_weight: number | null;
}

interface HDSession {
    id: string;
    patient_id: string;
    date: string;
    status: string;
    pre_hd: { weight?: number } | null;
}

export default function StatistikPerawat() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalPasien: 0,
        sesiBulanIni: 0,
        idwgData: [
            {name: 'Aman (<4%)', value: 0, color: '#10b981'},    // emerald-500
            {name: 'Hati-hati (4-6%)', value: 0, color: '#f59e0b'}, // amber-500
            {name: 'Bahaya (>6%)', value: 0, color: '#ef4444'}     // red-500
        ]
    });

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            try {
                // Fetch data pasien dan sesi HD dari Supabase
                const [patientsRes, sessionsRes] = await Promise.all([
                    createClient().from('patients').select('id, dry_weight'),
                    createClient().from('hd_sessions').select('id, patient_id, date, status, pre_hd')
                ]);

                const patients: Patient[] = patientsRes.data || [];
                const sessions: HDSession[] = sessionsRes.data || [];

                // 1. Kalkulasi Data Cepat (Sama seperti logika Smart HD)
                const totalPasien = patients.length;

                const currentMonth = new Date().getMonth();
                const currentYear = new Date().getFullYear();

                const sesiBulanIni = sessions.filter(s => {
                    const sessionDate = new Date(s.date);
                    return sessionDate.getMonth() === currentMonth && sessionDate.getFullYear() === currentYear;
                }).length;

                // 2. Kalkulasi Kepatuhan IDWG dari sesi terakhir tiap pasien
                let green = 0, yellow = 0, red = 0;

                patients.forEach(p => {
                    // Cari sesi pasien yang sudah 'Selesai'
                    const pSessions = sessions.filter(s => s.patient_id === p.id && s.status === 'Selesai');

                    // Urutkan dari yang terbaru
                    pSessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                    if (pSessions.length > 0 && p.dry_weight) {
                        const lastSession = pSessions[0];
                        // Parsing JSONB pre_hd
                        const preW = lastSession.pre_hd?.weight;

                        if (preW) {
                            const idwgPerc = ((preW - p.dry_weight) / p.dry_weight) * 100;
                            if (idwgPerc >= 6) red++;
                            else if (idwgPerc >= 4) yellow++;
                            else green++;
                        }
                    }
                });

                setStats({
                    totalPasien,
                    sesiBulanIni,
                    idwgData: [
                        {name: 'Aman (<4%)', value: green, color: '#10b981'},
                        {name: 'Hati-hati (4-6%)', value: yellow, color: '#f59e0b'},
                        {name: 'Bahaya (>6%)', value: red, color: '#ef4444'}
                    ]
                });

            } catch (error) {
                console.error("Error fetching statistics:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    // Tooltip Kustom untuk Recharts
    const CustomTooltip = ({active, payload}: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border border-gray-200 shadow-lg rounded-lg text-sm">
                    <p className="font-bold text-gray-700">{payload[0].name}</p>
                    <p className="text-gray-600">Total: <span
                        className="font-bold text-teal-600">{payload[0].value} Pasien</span></p>
                </div>
            );
        }
        return null;
    };

    if (loading) return <div className="p-8 text-center text-teal-600 flex justify-center items-center"><BarChart2
        className="animate-spin w-8 h-8"/></div>;

    // Cek apakah ada data grafik untuk dirender (mencegah error jika data kosong)
    const hasChartData = stats.idwgData.some(d => d.value > 0);

    return (
        <div className="space-y-6 animate-in fade-in duration-300 pb-8 p-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <BarChart2 className="text-teal-600 w-7 h-7"/> Statistik Unit Hemodialisis
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Total Pasien Card */}
                <div
                    className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-teal-500 flex items-center justify-between transition-transform hover:scale-[1.01]">
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Total Pasien Aktif</p>
                        <h3 className="text-3xl font-bold text-gray-800 mt-1">{stats.totalPasien}</h3>
                    </div>
                    <div className="w-14 h-14 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center">
                        <Users className="w-7 h-7"/>
                    </div>
                </div>

                {/* Total Sesi Card */}
                <div
                    className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500 flex items-center justify-between transition-transform hover:scale-[1.01]">
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Total Sesi HD (Bulan Ini)</p>
                        <h3 className="text-3xl font-bold text-gray-800 mt-1">{stats.sesiBulanIni}</h3>
                    </div>
                    <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                        <Activity className="w-7 h-7"/>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Grafik IDWG (Pie Chart Donat) */}
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 flex flex-col">
                    <h3 className="text-lg font-bold text-gray-700 mb-4 text-center">Distribusi Status IDWG Pasien</h3>
                    <div className="relative h-64 w-full flex-1">
                        {hasChartData ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stats.idwgData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={70}
                                        outerRadius={90}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {stats.idwgData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color}/>
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip/>}/>
                                    <Legend verticalAlign="bottom" height={36} iconType="circle"/>
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-sm text-gray-400 italic">
                                Belum ada data sesi pasien selesai
                            </div>
                        )}
                    </div>
                    <p className="text-xs text-gray-500 text-center mt-4">Diambil dari data pre-HD terakhir
                        masing-masing pasien.</p>
                </div>

                {/* Modul Laporan Lanjutan */}
                <div
                    className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 flex flex-col items-center justify-center text-center">
                    <Settings className="w-16 h-16 text-gray-300 mb-4 animate-[spin_10s_linear_infinite]"/>
                    <h3 className="text-lg font-bold text-gray-700 mb-2">Modul Laporan Lanjutan</h3>
                    <p className="text-sm text-gray-500 mb-6 max-w-sm">
                        Grafik tren komplikasi intradialitik dan kecukupan target UF bulanan akan tersedia pada
                        pembaruan mendatang.
                    </p>
                    <button disabled
                            className="bg-gray-100 text-gray-500 px-5 py-2.5 rounded-lg text-sm font-semibold cursor-not-allowed">
                        Cetak Rekap (Segera)
                    </button>
                </div>
            </div>
        </div>
    );
}