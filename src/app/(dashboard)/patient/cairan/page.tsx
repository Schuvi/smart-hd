'use client';

import React, {useCallback, useEffect, useState} from 'react';
import {createClient} from '@/lib/supabase/client';
import {evaluateFluidBalance} from '@/lib/calculations';
import FluidGauge from '@/components/patient/FluidGauge';
import {ArrowDownLeft, ArrowUpRight, CheckCircle2, Coffee, GlassWater,} from 'lucide-react';

interface FluidLog {
    id: string;
    type: 'intake' | 'output';
    amount: number;
    note: string;
    logged_at: string;
}

export default function PatientCairanPage() {
    const supabase = createClient();

    const [patientId, setPatientId] = useState<string>('');
    const [fluidLimit, setFluidLimit] = useState<number>(1000);
    const [todayLogs, setTodayLogs] = useState<FluidLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // Form State Intake
    const [intakeNote, setIntakeNote] = useState('');
    const [intakeAmount, setIntakeAmount] = useState('');

    // Form State Output
    const [outputNote, setOutputNote] = useState('Urine');
    const [outputAmount, setOutputAmount] = useState('');

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3000);
    };

    const loadFluidData = useCallback(async () => {
        setLoading(true);
        const {data: {user}} = await supabase.auth.getUser();
        if (!user) return;

        const {data: profile} = await supabase
            .from('profiles')
            .select('patient_id, patients ( fluid_limit )')
            .eq('id', user.id)
            .single();

        if (profile?.patient_id) {
            setPatientId(profile.patient_id);
            const fl = (profile as any).patients?.fluid_limit || 1000;
            setFluidLimit(fl);

            const today = new Date().toISOString().split('T')[0];
            const {data: logs} = await supabase
                .from('fluid_logs')
                .select('*')
                .eq('patient_id', profile.patient_id)
                .gte('logged_at', `${today}T00:00:00Z`)
                .order('logged_at', {ascending: false});

            if (logs) setTodayLogs(logs as FluidLog[]);
        }
        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        loadFluidData();
    }, [loadFluidData]);

    // Simpan Catatan Cairan Manual
    const handleSaveFluid = async (type: 'intake' | 'output', amount: number, note: string) => {
        if (!patientId || isNaN(amount) || amount <= 0) return;
        setSubmitting(true);

        const {error} = await supabase.from('fluid_logs').insert([
            {
                patient_id: patientId,
                type,
                amount,
                note: note.trim() || (type === 'intake' ? 'Air Putih' : 'Urine'),
                logged_at: new Date().toISOString(),
            },
        ]);

        setSubmitting(false);
        if (!error) {
            showToast(`Data cairan ${type === 'intake' ? 'masuk' : 'keluar'} disimpan`);
            if (type === 'intake') {
                setIntakeNote('');
                setIntakeAmount('');
            } else {
                setOutputAmount('');
            }
            loadFluidData();
        }
    };

    // Hitung Keseimbangan Cairan Harian
    let totalIntake = 0;
    let totalOutput = 0;
    todayLogs.forEach((l) => {
        if (l.type === 'intake') totalIntake += l.amount;
        else totalOutput += l.amount;
    });

    const fluidBalance = evaluateFluidBalance(totalIntake, totalOutput, fluidLimit);

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

            {/* GAUGE RINGKASAN CAIRAN HARIAN */}
            <FluidGauge
                netFluid={fluidBalance.netFluid}
                limit={fluidLimit}
                percentage={fluidBalance.percentage}
            />

            {/* FORM INPUT CAIRAN MASUK (INTAKE) */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-blue-100 space-y-3">
                <div className="flex items-center gap-2 text-blue-700">
                    <ArrowDownLeft className="w-4 h-4"/>
                    <h3 className="font-bold text-xs uppercase tracking-wider">Catat Minum (Cairan Masuk)</h3>
                </div>

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSaveFluid('intake', parseInt(intakeAmount), intakeNote);
                    }}
                    className="space-y-2.5"
                >
                    <input
                        type="text"
                        required
                        placeholder="Cth: Air putih, teh, kuah sup..."
                        value={intakeNote}
                        onChange={(e) => setIntakeNote(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex gap-2">
                        <input
                            type="number"
                            required
                            placeholder="Jumlah (mL)"
                            value={intakeAmount}
                            onChange={(e) => setIntakeAmount(e.target.value)}
                            className="flex-1 px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition active:scale-95"
                        >
                            Simpan
                        </button>
                    </div>
                </form>

                {/* Tombol Cepat (Quick Add Buttons) */}
                <div className="flex gap-2 pt-1 overflow-x-auto no-scrollbar">
                    <button
                        type="button"
                        onClick={() => handleSaveFluid('intake', 100, 'Air Putih')}
                        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-[11px] font-bold transition"
                    >
                        <GlassWater className="w-3.5 h-3.5"/> +100 mL Air
                    </button>
                    <button
                        type="button"
                        onClick={() => handleSaveFluid('intake', 200, 'Teh / Kopi')}
                        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-[11px] font-bold transition"
                    >
                        <Coffee className="w-3.5 h-3.5"/> +200 mL Teh/Kopi
                    </button>
                </div>
            </div>

            {/* FORM INPUT CAIRAN KELUAR (OUTPUT) */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-amber-100 space-y-3">
                <div className="flex items-center gap-2 text-amber-700">
                    <ArrowUpRight className="w-4 h-4"/>
                    <h3 className="font-bold text-xs uppercase tracking-wider">Catat Cairan Keluar (Urine)</h3>
                </div>

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSaveFluid('output', parseInt(outputAmount), outputNote);
                    }}
                    className="flex gap-2"
                >
                    <input
                        type="number"
                        required
                        placeholder="Jumlah urine/keluar (mL)"
                        value={outputAmount}
                        onChange={(e) => setOutputAmount(e.target.value)}
                        className="flex-1 px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <button
                        type="submit"
                        disabled={submitting}
                        className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs transition active:scale-95"
                    >
                        Simpan
                    </button>
                </form>
            </div>

            {/* RIWAYAT HARI INI */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-3">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-gray-700">Riwayat Hari Ini</h3>
                    <span className="text-[11px] text-gray-400">Total Output: {totalOutput} mL</span>
                </div>

                <div className="space-y-2 max-h-52 overflow-y-auto">
                    {loading ? (
                        <div className="p-4 text-center text-xs text-gray-400">Memuat...</div>
                    ) : todayLogs.length === 0 ? (
                        <div className="p-4 text-center text-xs text-gray-400">Belum ada catatan hari ini.</div>
                    ) : (
                        todayLogs.map((log) => {
                            const isIntake = log.type === 'intake';
                            return (
                                <div
                                    key={log.id}
                                    className={`p-3 rounded-2xl flex items-center justify-between text-xs border ${
                                        isIntake ? 'bg-blue-50/50 border-blue-100' : 'bg-amber-50/50 border-amber-100'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <div
                                            className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs ${
                                                isIntake ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'
                                            }`}
                                        >
                                            {isIntake ? <ArrowDownLeft className="w-3.5 h-3.5"/> :
                                                <ArrowUpRight className="w-3.5 h-3.5"/>}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-800">{log.note}</p>
                                            <p className="text-[10px] text-gray-400">
                                                {new Date(log.logged_at).toLocaleTimeString('id-ID', {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                    <span
                                        className={`font-bold font-mono ${isIntake ? 'text-blue-600' : 'text-amber-600'}`}>
                    {isIntake ? `+${log.amount}` : `-${log.amount}`} mL
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