'use client';

import React, {useCallback, useEffect, useState} from 'react';
import Link from 'next/link';
import {createClient} from '@/lib/supabase/client';
import {evaluateFluidBalance, evaluateIDWG} from '@/lib/calculations';
import {
    AlertTriangle,
    Bot,
    CalendarDays,
    CheckCircle2,
    ChevronRight,
    Clock,
    Droplet,
    RefreshCw,
    Scale,
    Sparkles,
} from 'lucide-react';

export default function PatientHomePage() {
    const supabase = createClient();
    const [loading, setLoading] = useState(true);

    const [patientData, setPatientData] = useState<any>(null);
    const [nextSchedule, setNextSchedule] = useState<any>(null);
    const [fluidStatus, setFluidStatus] = useState<any>(null);
    const [idwgStatus, setIdwgStatus] = useState<any>(null);
    const [adviceList, setAdviceList] = useState<any[]>([]);

    const loadDashboardData = useCallback(async () => {
        setLoading(true);
        const {data: {user}} = await supabase.auth.getUser();
        if (!user) return;

        // 1. Ambil Profil & Data Pasien
        const {data: profile} = await supabase
            .from('profiles')
            .select('patient_id, patients ( id, name, rm, dry_weight, fluid_limit )')
            .eq('id', user.id)
            .single();

        if (!profile?.patient_id) return;
        const patient = (profile as any).patients;
        setPatientData(patient);

        const today = new Date().toISOString().split('T')[0];

        // 2. Ambil Jadwal Terdekat
        const {data: schedData} = await supabase
            .from('schedules')
            .select('date, shift, bed')
            .eq('patient_id', patient.id)
            .gte('date', today)
            .order('date', {ascending: true})
            .limit(1)
            .maybeSingle();

        setNextSchedule(schedData);

        // 3. Evaluasi Cairan Hari Ini
        const {data: fluids} = await supabase
            .from('fluid_logs')
            .select('type, amount, logged_at')
            .eq('patient_id', patient.id)
            .gte('logged_at', `${today}T00:00:00Z`);

        let intake = 0;
        let output = 0;
        (fluids || []).forEach((f) => {
            if (f.type === 'intake') intake += f.amount;
            else output += f.amount;
        });

        const fEval = evaluateFluidBalance(intake, output, patient.fluid_limit || 1000);
        setFluidStatus(fEval);

        // 4. Evaluasi IDWG dari Berat Badan Terakhir
        const {data: weights} = await supabase
            .from('weight_logs')
            .select('weight, logged_at')
            .eq('patient_id', patient.id)
            .order('logged_at', {ascending: false})
            .limit(1);

        if (weights && weights.length > 0 && patient.dry_weight) {
            const wEval = evaluateIDWG(weights[0].weight, patient.dry_weight);
            setIdwgStatus(wEval);
        }

        // 5. Ambil Catatan Saran & Pesan dari Perawat
        const {data: advices} = await supabase
            .from('advices')
            .select('messages, date')
            .eq('patient_id', patient.id)
            .order('date', {ascending: false})
            .limit(1)
            .maybeSingle();

        if (advices?.messages) {
            setAdviceList(advices.messages);
        }

        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        loadDashboardData();
    }, [loadDashboardData]);

    if (loading) {
        return (
            <div className="h-64 flex flex-col items-center justify-center text-blue-600 gap-2">
                <RefreshCw className="w-8 h-8 animate-spin"/>
                <span className="text-xs font-semibold">Menganalisis status harian...</span>
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-in fade-in duration-200">
            {/* JADWAL CUCI DARAH BERIKUTNYA */}
            <div
                className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex items-center justify-between">
                <div>
                    <div
                        className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-blue-600">
                        <Clock className="w-3.5 h-3.5"/>
                        <span>Sesi Cuci Darah Berikutnya</span>
                    </div>
                    <p className="text-base font-extrabold text-gray-900 mt-1">
                        {nextSchedule
                            ? `${new Date(nextSchedule.date).toLocaleDateString('id-ID', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'short',
                            })} (Shift ${nextSchedule.shift})`
                            : 'Belum ada jadwal terdekat'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                        {nextSchedule ? `Alokasi Bed: ${nextSchedule.bed}` : 'Hubungi unit perawat untuk konfirmasi'}
                    </p>
                </div>
                <div
                    className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <CalendarDays className="w-6 h-6"/>
                </div>
            </div>

            {/* 2 KARTU STATUS: BERAT BADAN & BATAS CAIRAN */}
            <div className="grid grid-cols-2 gap-3">
                {/* Kartu BB & IDWG */}
                <Link
                    href="/patient/berat"
                    className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 hover:border-blue-300 transition active:scale-95 flex flex-col justify-between"
                >
                    <div>
                        <div
                            className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                            <Scale className="w-5 h-5"/>
                        </div>
                        <p className="text-xs font-bold text-gray-500">Berat Badan</p>
                        <p className="text-base font-extrabold text-gray-900 mt-0.5">
                            {idwgStatus ? `+${idwgStatus.idwgKg} kg` : 'Pantau BB'}
                        </p>
                        <span
                            className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                idwgStatus?.status === 'danger'
                                    ? 'bg-red-100 text-red-700'
                                    : idwgStatus?.status === 'warning'
                                        ? 'bg-amber-100 text-amber-700'
                                        : 'bg-green-100 text-green-700'
                            }`}
                        >
              {idwgStatus ? `IDWG: ${idwgStatus.idwgPercent}%` : 'Belum isi hari ini'}
            </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-blue-600">
                        <span>Catat BB</span>
                        <ChevronRight className="w-3.5 h-3.5"/>
                    </div>
                </Link>

                {/* Kartu Cairan */}
                <Link
                    href="/patient/cairan"
                    className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 hover:border-blue-300 transition active:scale-95 flex flex-col justify-between"
                >
                    <div>
                        <div
                            className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-3 ${
                                fluidStatus?.status === 'danger'
                                    ? 'bg-red-50 text-red-600'
                                    : fluidStatus?.status === 'warning'
                                        ? 'bg-amber-50 text-amber-600'
                                        : 'bg-teal-50 text-teal-600'
                            }`}
                        >
                            <Droplet className="w-5 h-5"/>
                        </div>
                        <p className="text-xs font-bold text-gray-500">Batas Minum</p>
                        <p className="text-base font-extrabold text-gray-900 mt-0.5">
                            {fluidStatus?.netFluid || 0} mL
                        </p>
                        <span
                            className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                fluidStatus?.status === 'danger'
                                    ? 'bg-red-100 text-red-700'
                                    : fluidStatus?.status === 'warning'
                                        ? 'bg-amber-100 text-amber-700'
                                        : 'bg-green-100 text-green-700'
                            }`}
                        >
              {fluidStatus?.percentage || 0}% kuota
            </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-blue-600">
                        <span>Catat Minum</span>
                        <ChevronRight className="w-3.5 h-3.5"/>
                    </div>
                </Link>
            </div>

            {/* KARTU SMART ADVICE (SARAN MEDIS & PERINGATAN KLINIS) */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-3">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                    <Sparkles className="w-4 h-4 text-blue-600"/>
                    <h3 className="font-bold text-xs uppercase tracking-wider text-gray-700">
                        Saran & Pantauan SMART-HD
                    </h3>
                </div>

                {/* Peringatan Otomatis jika Cairan / IDWG Tinggi */}
                {fluidStatus?.status === 'danger' && (
                    <div
                        className="p-3.5 bg-red-50 border-l-4 border-red-500 rounded-2xl text-xs text-red-800 flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5"/>
                        <div>
                            <p className="font-bold">Batas Cairan Terlampaui!</p>
                            <p className="mt-0.5 text-[11px]">
                                Hindari minum berlebih untuk mencegah sesak napas dan kenaikan tensi darah secara
                                mendadak.
                            </p>
                        </div>
                    </div>
                )}

                {idwgStatus?.status === 'danger' && (
                    <div
                        className="p-3.5 bg-red-50 border-l-4 border-red-500 rounded-2xl text-xs text-red-800 flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5"/>
                        <div>
                            <p className="font-bold">Kenaikan Berat Badan Kritis (&gt;6%)</p>
                            <p className="mt-0.5 text-[11px]">
                                Penumpukan cairan tinggi. Batasi asupan kuah dan garam hingga jadwal HD berikutnya.
                            </p>
                        </div>
                    </div>
                )}

                {/* Pesan & Edukasi dari Tim Medis */}
                {adviceList.length > 0 ? (
                    adviceList.map((adv, idx) => (
                        <div
                            key={idx}
                            className="p-3.5 bg-blue-50/70 border-l-4 border-blue-500 rounded-2xl text-xs text-blue-900 flex items-start gap-2.5"
                        >
                            <Bot className="w-4 h-4 text-blue-600 shrink-0 mt-0.5"/>
                            <div>
                                <p className="font-bold">Instruksi Edukasi:</p>
                                <p className="mt-0.5 text-[11px] leading-relaxed">{adv}</p>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="p-4 bg-green-50/70 rounded-2xl text-xs text-green-800 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0"/>
                        <span>Kondisi Anda terpantau seimbang hari ini. Pertahankan kepatuhan batas cairan!</span>
                    </div>
                )}
            </div>
        </div>
    );
}