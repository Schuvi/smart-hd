'use client';

import React, {useCallback, useEffect, useState} from 'react';
import {createClient} from '@/lib/supabase/client';
import {AlertTriangle, CheckCircle2, Loader2, MessageSquareHeart, Send,} from 'lucide-react';

interface Complaint {
    id: string;
    symptoms: string[];
    severity: number;
    description: string;
    reply: string | null;
    status: string;
    created_at: string;
}

const availableSymptoms = [
    {id: 'sesak', label: 'Sesak Napas', critical: true},
    {id: 'nyeri_dada', label: 'Nyeri Dada', critical: true},
    {id: 'akses_berdarah', label: 'Akses HD Berdarah', critical: true},
    {id: 'bengkak', label: 'Bengkak (Kaki/Muka)'},
    {id: 'mual', label: 'Mual / Muntah'},
    {id: 'pusing', label: 'Pusing / Lemas'},
];

export default function PatientKeluhanPage() {
    const supabase = createClient();

    const [patientId, setPatientId] = useState<string>('');
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
    const [severity, setSeverity] = useState<number>(5);
    const [description, setDescription] = useState<string>('');

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3000);
    };

    const loadComplaints = useCallback(async () => {
        setLoading(true);
        const {data: {user}} = await supabase.auth.getUser();
        if (!user) return;

        const {data: profile} = await supabase
            .from('profiles')
            .select('patient_id')
            .eq('id', user.id)
            .single();

        if (profile?.patient_id) {
            setPatientId(profile.patient_id);
            const {data} = await supabase
                .from('complaints')
                .select('*')
                .eq('patient_id', profile.patient_id)
                .order('created_at', {ascending: false});

            if (data) setComplaints(data as Complaint[]);
        }
        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        loadComplaints();
    }, [loadComplaints]);

    const toggleSymptom = (symId: string) => {
        setSelectedSymptoms((prev) =>
            prev.includes(symId) ? prev.filter((s) => s !== symId) : [...prev, symId]
        );
    };

    // Deteksi Gejala Kritis untuk Memberi Peringatan Red-Flag
    const isRedFlag =
        (selectedSymptoms.includes('sesak') && severity >= 7) ||
        selectedSymptoms.includes('nyeri_dada') ||
        selectedSymptoms.includes('akses_berdarah');

    const handleSubmitComplaint = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!patientId || (selectedSymptoms.length === 0 && !description.trim())) {
            showToast('Pilih setidaknya satu gejala atau ketik deskripsi');
            return;
        }
        setSubmitting(true);

        const {error} = await supabase.from('complaints').insert([
            {
                patient_id: patientId,
                symptoms: selectedSymptoms,
                severity,
                description: description.trim(),
                status: 'Baru',
            },
        ]);

        // Jika Red Flag, buat alert darurat langsung di tabel alerts untuk perawat
        if (isRedFlag) {
            await supabase.from('alerts').insert([
                {
                    patient_id: patientId,
                    type: 'red_flag',
                    level: 'danger',
                    msg: `RED FLAG: Gejala bahaya (${selectedSymptoms.join(', ')}) skala ${severity}/10`,
                },
            ]);
        }

        setSubmitting(false);
        if (!error) {
            showToast('Keluhan berhasil dikirim ke perawat jaga');
            setSelectedSymptoms([]);
            setSeverity(5);
            setDescription('');
            loadComplaints();
        }
    };

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

            {/* FORM INPUT KELUHAN */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-4">
                <div className="flex items-center gap-2 text-blue-700">
                    <MessageSquareHeart className="w-4 h-4"/>
                    <h3 className="font-bold text-xs uppercase tracking-wider">Konsultasikan Keluhan</h3>
                </div>

                {/* Peringatan Darurat Dinamis (Red Flag Warning) */}
                {isRedFlag && (
                    <div
                        className="p-3.5 bg-red-100 border-l-4 border-red-600 rounded-2xl text-xs text-red-900 flex items-start gap-2.5 animate-pulse">
                        <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5"/>
                        <div>
                            <p className="font-extrabold text-red-950">PERINGATAN DARURAT (RED FLAG)</p>
                            <p className="mt-0.5 text-[11px] leading-relaxed">
                                Gejala yang Anda pilih tergolong berbahaya. Segera hubungi keluarga atau langsung
                                menuju <strong>IGD Rumah Sakit terdekat!</strong>
                            </p>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmitComplaint} className="space-y-4">
                    {/* Pilihan Gejala */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-2">
                            Pilih Gejala yang Dirasakan:
                        </label>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            {availableSymptoms.map((sym) => {
                                const isSelected = selectedSymptoms.includes(sym.id);
                                return (
                                    <button
                                        type="button"
                                        key={sym.id}
                                        onClick={() => toggleSymptom(sym.id)}
                                        className={`p-2.5 rounded-xl border text-left font-semibold transition-all ${
                                            isSelected
                                                ? sym.critical
                                                    ? 'bg-red-50 border-red-400 text-red-700'
                                                    : 'bg-blue-50 border-blue-400 text-blue-700'
                                                : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                                        }`}
                                    >
                                        {sym.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Slider Skala Keparahan */}
                    <div>
                        <div className="flex justify-between items-center text-xs font-semibold text-gray-700 mb-1">
                            <span>Tingkat Keparahan / Mengganggu:</span>
                            <span className="font-mono font-bold text-blue-600">{severity} / 10</span>
                        </div>
                        <input
                            type="range"
                            min={1}
                            max={10}
                            value={severity}
                            onChange={(e) => setSeverity(parseInt(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                        <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                            <span>Ringan (1)</span>
                            <span>Sedang (5)</span>
                            <span>Berat (10)</span>
                        </div>
                    </div>

                    {/* Deskripsi Tambahan */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Ceritakan Keluhan Lebih Detail:
                        </label>
                        <textarea
                            rows={3}
                            placeholder="Jelaskan sejak kapan keluhan terasa atau aktivitas pemicunya..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-xs transition active:scale-95 flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/10"
                    >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4"/>}
                        <span>Kirimkan Keluhan ke Petugas</span>
                    </button>
                </form>
            </div>

            {/* RIWAYAT KONSULTASI & BALASAN PERAWAT */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-3">
                <h3 className="font-bold text-xs uppercase tracking-wider text-gray-700 border-b border-gray-100 pb-3">
                    Riwayat Konsultasi & Tanggapan Perawat
                </h3>

                <div className="space-y-3">
                    {loading ? (
                        <div className="p-4 text-center text-xs text-gray-400">Memuat riwayat...</div>
                    ) : complaints.length === 0 ? (
                        <div className="p-4 text-center text-xs text-gray-400">Belum ada keluhan yang tercatat.</div>
                    ) : (
                        complaints.map((c) => (
                            <div
                                key={c.id}
                                className={`p-3.5 rounded-2xl border text-xs space-y-2 ${
                                    c.status === 'Baru' ? 'bg-amber-50/50 border-amber-200' : 'bg-gray-50 border-gray-200'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-400 font-mono">
                    {new Date(c.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                    })}
                  </span>
                                    <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                            c.status === 'Baru' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                                        }`}
                                    >
                    {c.status}
                  </span>
                                </div>

                                <p className="font-semibold text-gray-800">
                                    Gejala: {c.symptoms.length > 0 ? c.symptoms.join(', ') : 'Tidak ada gejala spesifik'} (Skala: {c.severity}/10)
                                </p>

                                {c.description && (
                                    <p className="text-gray-600 text-[11px] italic bg-white/70 p-2 rounded-xl">
                                        &quot;{c.description}&quot;
                                    </p>
                                )}

                                {/* Balasan dari Perawat */}
                                {c.reply ? (
                                    <div
                                        className="mt-2 p-2.5 bg-blue-50 border-l-4 border-blue-500 rounded-xl text-blue-900 text-[11px]">
                                        <p className="font-bold text-blue-950">Tanggapan Perawat:</p>
                                        <p className="mt-0.5 leading-relaxed">{c.reply}</p>
                                    </div>
                                ) : (
                                    <p className="text-[10px] text-amber-600 italic">
                                        Menunggu telaah dan balasan dari perawat jaga...
                                    </p>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}