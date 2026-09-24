'use client';

import React, {useCallback, useEffect, useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {createClient} from '@/lib/supabase/client';
import {
    Activity,
    AlertTriangle,
    ArrowRight,
    CalendarDays,
    Check,
    CheckCircle2,
    Clock,
    MessageSquareDot,
    RefreshCw,
    User,
} from 'lucide-react';

interface ScheduleItem {
    id: string;
    shift: string;
    bed: string;
    status: string;
    patients: {
        id: string;
        name: string;
        rm: string;
        dry_weight: number;
    };
}

interface AlertItem {
    id: string;
    patient_id: string;
    type: string;
    level: string;
    msg: string;
    created_at: string;
    patients: {
        name: string;
        rm: string;
    };
}

export default function NurseDashboardPage() {
    const router = useRouter();
    const supabase = createClient();

    const [loading, setLoading] = useState(true);
    const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
    const [alerts, setAlerts] = useState<AlertItem[]>([]);
    const [metrics, setMetrics] = useState({
        scheduledToday: 0,
        ongoingSessions: 0,
        activeAlerts: 0,
        newComplaints: 0,
    });

    const loadDashboardData = useCallback(async () => {
        setLoading(true);
        const today = new Date().toISOString().split('T')[0];

        // 1. Ambil Jadwal Hari Ini
        const {data: scheduleData} = await supabase
            .from('schedules')
            .select('id, shift, bed, status, patients ( id, name, rm, dry_weight )')
            .eq('date', today);

        // 2. Ambil Alert Kritis yang belum dibaca
        const {data: alertData} = await supabase
            .from('alerts')
            .select('id, patient_id, type, level, msg, created_at, patients ( name, rm )')
            .eq('is_read', false)
            .order('created_at', {ascending: false});

        // 3. Hitung Keluhan Baru
        const {count: complaintCount} = await supabase
            .from('complaints')
            .select('*', {count: 'exact', head: true})
            .eq('status', 'Baru');

        const mappedSchedules = (scheduleData as unknown as ScheduleItem[]) || [];
        const mappedAlerts = (alertData as unknown as AlertItem[]) || [];

        setSchedules(mappedSchedules);
        setAlerts(mappedAlerts);

        setMetrics({
            scheduledToday: mappedSchedules.length,
            ongoingSessions: mappedSchedules.filter((s) => s.status === 'Berlangsung').length,
            activeAlerts: mappedAlerts.length,
            newComplaints: complaintCount || 0,
        });

        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        loadDashboardData();
    }, [loadDashboardData]);

    // Selesaikan / Dismiss Alert
    const handleDismissAlert = async (alertId: string) => {
        const {error} = await supabase
            .from('alerts')
            .update({is_read: true})
            .eq('id', alertId);

        if (!error) {
            setAlerts((prev) => prev.filter((a) => a.id !== alertId));
            setMetrics((prev) => ({...prev, activeAlerts: Math.max(0, prev.activeAlerts - 1)}));
        }
    };

    // Navigasi atau buat sesi HD jika perawat menekan "Buka Sesi"
    const handleOpenSession = async (schedule: ScheduleItem) => {
        // Periksa apakah sesi sudah dibuat untuk jadwal ini
        const {data: existingSession} = await supabase
            .from('hd_sessions')
            .select('id')
            .eq('schedule_id', schedule.id)
            .single();

        if (existingSession) {
            router.push(`/nurse/sesi-hd?id=${existingSession.id}`);
        } else {
            // Buat sesi baru
            const {data: newSession, error} = await supabase
                .from('hd_sessions')
                .insert({
                    schedule_id: schedule.id,
                    patient_id: schedule.patients.id,
                    date: new Date().toISOString().split('T')[0],
                    shift: schedule.shift,
                    bed: schedule.bed,
                    status: 'Pre-HD',
                })
                .select('id')
                .single();

            if (!error && newSession) {
                await supabase
                    .from('schedules')
                    .update({status: 'Berlangsung'})
                    .eq('id', schedule.id);

                router.push(`/nurse/sesi-hd?id=${newSession.id}`);
            }
        }
    };

    if (loading) {
        return (
            <div className="h-64 flex flex-col items-center justify-center gap-3 text-teal-700">
                <RefreshCw className="w-8 h-8 animate-spin"/>
                <span className="text-xs font-semibold tracking-wide">Memuat data klinik...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* 4 KARTU METRIK KPI */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
                {/* Jadwal Hari Ini */}
                <div
                    className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border-l-4 border-blue-500 flex items-center justify-between">
                    <div>
                        <p className="text-[11px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider">
                            Terjadwal Hari Ini
                        </p>
                        <p className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">
                            {metrics.scheduledToday}
                        </p>
                    </div>
                    <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <CalendarDays className="w-6 h-6"/>
                    </div>
                </div>

                {/* Sesi Berlangsung */}
                <div
                    className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border-l-4 border-teal-500 flex items-center justify-between">
                    <div>
                        <p className="text-[11px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider">
                            Sesi Berlangsung
                        </p>
                        <p className="text-2xl sm:text-3xl font-black text-teal-700 mt-1">
                            {metrics.ongoingSessions}
                        </p>
                    </div>
                    <div className="w-11 h-11 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
                        <Activity className="w-6 h-6"/>
                    </div>
                </div>

                {/* Alert Pasien */}
                <Link
                    href="/nurse/pemantauan"
                    className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border-l-4 border-red-500 flex items-center justify-between hover:bg-red-50/40 transition group cursor-pointer"
                >
                    <div>
                        <p className="text-[11px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider group-hover:text-red-700 transition">
                            Alert Pasien
                        </p>
                        <p className="text-2xl sm:text-3xl font-black text-red-600 mt-1">
                            {metrics.activeAlerts}
                        </p>
                    </div>
                    <div className="w-11 h-11 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6"/>
                    </div>
                </Link>

                {/* Keluhan Baru */}
                <Link
                    href="/nurse/keluhan"
                    className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border-l-4 border-amber-500 flex items-center justify-between hover:bg-amber-50/40 transition group cursor-pointer"
                >
                    <div>
                        <p className="text-[11px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider group-hover:text-amber-700 transition">
                            Keluhan Baru
                        </p>
                        <p className="text-2xl sm:text-3xl font-black text-amber-600 mt-1">
                            {metrics.newComplaints}
                        </p>
                    </div>
                    <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                        <MessageSquareDot className="w-6 h-6"/>
                    </div>
                </Link>
            </div>

            {/* GRID 2 KOLOM: TABEL JADWAL & DAFTAR PRIORITAS ALERT */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* KOLOM KIRI (2/3): JADWAL TINDAKAN HARI INI */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200/80 overflow-hidden">
                    <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <Clock className="w-5 h-5 text-teal-600"/>
                            <h3 className="font-bold text-gray-800 text-sm sm:text-base">
                                Jadwal Hemodialisis Hari Ini
                            </h3>
                        </div>
                        <Link
                            href="/nurse/jadwal"
                            className="text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1"
                        >
                            Lihat Kalender <ArrowRight className="w-3.5 h-3.5"/>
                        </Link>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                            <tr className="bg-gray-50/80 text-[11px] font-bold text-gray-500 uppercase border-b border-gray-200/60">
                                <th className="py-3 px-4">Pasien</th>
                                <th className="py-3 px-3">Shift</th>
                                <th className="py-3 px-3">Mesin / Bed</th>
                                <th className="py-3 px-3">Status</th>
                                <th className="py-3 px-4 text-right">Tindakan</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-xs">
                            {schedules.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-gray-400">
                                        Tidak ada pasien yang terjadwal untuk hari ini.
                                    </td>
                                </tr>
                            ) : (
                                schedules.map((item) => {
                                    const statusBadge =
                                        item.status === 'Berlangsung'
                                            ? 'bg-teal-100 text-teal-800'
                                            : item.status === 'Selesai'
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-blue-100 text-blue-800';

                                    return (
                                        <tr key={item.id} className="hover:bg-gray-50/60 transition">
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-2.5">
                                                    <div
                                                        className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-[10px]">
                                                        <User className="w-4 h-4"/>
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900">{item.patients?.name}</p>
                                                        <p className="text-[10px] text-gray-400">RM: {item.patients?.rm}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-3 font-medium text-gray-700">{item.shift}</td>
                                            <td className="py-3 px-3 text-gray-600 font-mono text-[11px]">{item.bed}</td>
                                            <td className="py-3 px-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${statusBadge}`}>
                            {item.status}
                          </span>
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <button
                                                    onClick={() => handleOpenSession(item)}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-teal-50 text-teal-700 hover:bg-teal-600 hover:text-white rounded-lg font-bold text-[11px] transition shadow-xs"
                                                >
                                                    <span>Buka Sesi</span>
                                                    <ArrowRight className="w-3 h-3"/>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* KOLOM KANAN (1/3): DAFTAR PRIORITAS (ALERTS KLINIS) */}
                <div className="bg-white rounded-2xl shadow-sm border border-red-200/80 flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-red-100 bg-red-50/40 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-red-600"/>
                            <h3 className="font-bold text-red-900 text-sm">Daftar Prioritas Alert</h3>
                        </div>
                        <span className="px-2 py-0.5 bg-red-200 text-red-800 rounded-full text-[10px] font-black">
              {alerts.length}
            </span>
                    </div>

                    <div className="p-4 flex-1 overflow-y-auto space-y-3 max-h-[460px] divide-y divide-gray-100">
                        {alerts.length === 0 ? (
                            <div className="h-44 flex flex-col items-center justify-center text-center text-gray-400">
                                <CheckCircle2 className="w-8 h-8 text-green-500 mb-1"/>
                                <p className="text-xs font-semibold text-gray-600">Semua pasien terpantau stabil</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">Tidak ada peringatan kritis baru.</p>
                            </div>
                        ) : (
                            alerts.map((item) => (
                                <div key={item.id} className="pt-3 first:pt-0">
                                    <div className="p-3 bg-red-50/70 border-l-4 border-red-500 rounded-xl space-y-2">
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs font-bold text-gray-900">
                                                {item.patients?.name}{' '}
                                                <span
                                                    className="text-[10px] text-gray-400 font-normal">({item.patients?.rm})</span>
                                            </p>
                                            <span
                                                className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-red-200 text-red-800 rounded">
                        {item.level}
                      </span>
                                        </div>

                                        <p className="text-xs text-red-800 font-medium leading-relaxed">
                                            {item.msg}
                                        </p>

                                        <div
                                            className="flex items-center justify-between pt-1 text-[10px] text-gray-400">
                                            <span>{new Date(item.created_at).toLocaleTimeString('id-ID', {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}</span>
                                            <button
                                                onClick={() => handleDismissAlert(item.id)}
                                                className="inline-flex items-center gap-1 font-bold text-teal-700 hover:text-teal-900 transition"
                                            >
                                                <Check className="w-3 h-3"/> Tandai Selesai
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}