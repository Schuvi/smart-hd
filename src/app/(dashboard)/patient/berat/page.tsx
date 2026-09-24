'use client';

import React, {useCallback, useEffect, useState} from 'react';
import {createClient} from '@/lib/supabase/client';
import {evaluateIDWG} from '@/lib/calculations';
import {CheckCircle2, Loader2, Plus, Scale, TrendingUp,} from 'lucide-react';

interface WeightLog {
    id: string;
    weight: number;
    logged_at: string;
}

export default function PatientBeratPage() {
    const supabase = createClient();

    const [dryWeight, setDryWeight] = useState<number>(0);
    const [patientId, setPatientId] = useState<string>('');
    const [logs, setLogs] = useState<WeightLog[]>([]);
    const [newWeight, setNewWeight] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3000);
    };

    const loadWeightData = useCallback(async () => {
        setLoading(true);
        const {data: {user}} = await supabase.auth.getUser();
        if (!user) return;

        const {data: profile} = await supabase
            .from('profiles')
            .select('patient_id, patients ( dry_weight )')
            .eq('id', user.id)
            .single();

        if (profile?.patient_id) {
            setPatientId(profile.patient_id);
            const dw = (profile as any).patients?.dry_weight || 50;
            setDryWeight(dw);

            const {data: weightLogs} = await supabase
                .from('weight_logs')
                .select('*')
                .eq('patient_id', profile.patient_id)
                .order('logged_at', {ascending: false})
                .limit(7);

            if (weightLogs) setLogs(weightLogs);
        }
        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        loadWeightData();
    }, [loadWeightData]);

    const handleSubmitWeight = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!patientId || !newWeight) return;
        setSubmitting(true);

        const weightVal = parseFloat(newWeight);
        const {error} = await supabase.from('weight_logs').insert([
            {
                patient_id: patientId,
                weight: weightVal,
                logged_at: new Date().toISOString(),
            },
        ]);

        setSubmitting(false);
        if (!error) {
            showToast('Berat badan hari ini berhasil dicatat');
            setNewWeight('');
            loadWeightData();
        }
    };

    const latestWeight = logs[0]?.weight;
    const idwg = latestWeight && dryWeight ? evaluateIDWG(latestWeight, dryWeight) : null;

    return (
        <div className="space-y-4 animate-in fade-in duration-200">
            {/* Toast Feedback */}
            {toastMessage && (
                <div
                    className="fixed top-16 right-4 left-4 z-50 p-3.5 bg-blue-600 text-white text-xs font-bold rounded-2xl shadow-xl flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0"/>
                    <span>{toastMessage}</span>
                </div>
            )}

            {/* KARTU BB KERING ACUAN */}
            <div
                className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-3xl p-6 shadow-md relative overflow-hidden">
                <Scale className="w-28 h-28 absolute -right-6 -bottom-6 text-white/10 pointer-events-none"/>
                <p className="text-xs font-medium text-blue-100">Berat Badan Kering Acuan</p>
                <div className="flex items-baseline gap-2 mt-1">
                    <h2 className="text-4xl font-black tracking-tight">{dryWeight}</h2>
                    <span className="text-base font-semibold text-blue-200">kg</span>
                </div>
                <p className="text-[11px] text-blue-200 mt-2">
                    Ditetapkan oleh dokter/perawat pada sesi dialisis terakhir.
                </p>
            </div>

            {/* FORM PENCATATAN BB */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-3">
                <h3 className="font-bold text-xs uppercase tracking-wider text-gray-700">
                    Catat Berat Badan Hari Ini
                </h3>

                <form onSubmit={handleSubmitWeight} className="flex gap-2">
                    <input
                        type="number"
                        step="0.1"
                        required
                        placeholder="Contoh: 55.4"
                        value={newWeight}
                        onChange={(e) => setNewWeight(e.target.value)}
                        className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-base font-bold outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                    />
                    <button
                        type="submit"
                        disabled={submitting}
                        className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-sm transition active:scale-95 flex items-center justify-center gap-1.5"
                    >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Plus className="w-4 h-4"/>}
                        <span>Simpan</span>
                    </button>
                </form>

                {/* Indikator Status IDWG Kenaikan Cairan */}
                {idwg && (
                    <div
                        className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs ${
                            idwg.status === 'danger'
                                ? 'bg-red-50 border-red-200 text-red-800'
                                : idwg.status === 'warning'
                                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                                    : 'bg-green-50 border-green-200 text-green-800'
                        }`}
                    >
                        <div>
                            <p className="font-bold">Estimasi IDWG Terkini</p>
                            <p className="text-[11px] mt-0.5">
                                Kenaikan: +{idwg.idwgKg} kg ({idwg.idwgPercent}%)
                            </p>
                        </div>
                        <span className="font-black text-xs px-2.5 py-1 rounded-full uppercase bg-white/70 shadow-xs">
              {idwg.status === 'danger' ? 'Bahaya' : idwg.status === 'warning' ? 'Waspada' : 'Aman'}
            </span>
                    </div>
                )}
            </div>

            {/* RIWAYAT PENGUKURAN BB (7 HARI TERAKHIR) */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-3">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-blue-600"/>
                        <h3 className="font-bold text-xs uppercase tracking-wider text-gray-700">
                            Riwayat 7 Hari Terakhir
                        </h3>
                    </div>
                </div>

                <div className="divide-y divide-gray-100">
                    {loading ? (
                        <div className="p-4 text-center text-xs text-gray-400">Memuat riwayat...</div>
                    ) : logs.length === 0 ? (
                        <div className="p-4 text-center text-xs text-gray-400">Belum ada catatan berat badan.</div>
                    ) : (
                        logs.map((log) => {
                            const diff = (log.weight - dryWeight).toFixed(1);
                            return (
                                <div key={log.id} className="py-2.5 flex items-center justify-between text-xs">
                                    <div>
                                        <p className="font-bold text-gray-800">{log.weight} kg</p>
                                        <p className="text-[10px] text-gray-400">
                                            {new Date(log.logged_at).toLocaleDateString('id-ID', {
                                                day: 'numeric',
                                                month: 'short',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </p>
                                    </div>
                                    <span
                                        className={`font-mono text-xs font-bold ${
                                            parseFloat(diff) > 2 ? 'text-red-600' : 'text-blue-600'
                                        }`}
                                    >
                    {parseFloat(diff) >= 0 ? `+${diff}` : diff} kg
                  </span>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}