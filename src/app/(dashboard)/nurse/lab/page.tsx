'use client';

import React, {useCallback, useEffect, useState} from 'react';
import {createClient} from '@/lib/supabase/client';
import {calculateURR} from '@/lib/calculations';
import {AlertCircle, ArrowLeft, CheckCircle2, ChevronRight, FlaskConical, Loader2, Plus, User, X,} from 'lucide-react';

interface Patient {
    id: string;
    name: string;
    rm: string;
}

interface LabResult {
    id: string;
    patient_id: string;
    date: string;
    hb: number | null;
    k: number | null;
    ureum_pre: number | null;
    ureum_post: number | null;
    creatinine: number | null;
    created_at: string;
}

export default function NurseLabPage() {
    const supabase = createClient();

    const [patients, setPatients] = useState<Patient[]>([]);
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
    const [labs, setLabs] = useState<LabResult[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal
    const [modalOpen, setModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    // Form State Lab
    const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
    const [formHb, setFormHb] = useState('');
    const [formK, setFormK] = useState('');
    const [formUreumPre, setFormUreumPre] = useState('');
    const [formUreumPost, setFormUreumPost] = useState('');
    const [formCreatinine, setFormCreatinine] = useState('');

    const showToast = (text: string, type: 'success' | 'error' = 'success') => {
        setToastMessage({text, type});
        setTimeout(() => setToastMessage(null), 3500);
    };

    // Muat Daftar Pasien
    useEffect(() => {
        async function loadPatients() {
            setLoading(true);
            const {data} = await supabase.from('patients').select('id, name, rm').order('name');
            if (data) setPatients(data);
            setLoading(false);
        }

        loadPatients();
    }, [supabase]);

    // Muat Riwayat Lab saat pasien dipilih
    const loadPatientLabs = useCallback(async (patientId: string) => {
        setLoading(true);
        const {data} = await supabase
            .from('lab_results')
            .select('*')
            .eq('patient_id', patientId)
            .order('date', {ascending: false});

        if (data) setLabs(data);
        setLoading(false);
    }, [supabase]);

    const handleSelectPatient = (patientId: string | null) => {
        setSelectedPatientId(patientId);
        if (patientId) {
            loadPatientLabs(patientId);
        } else {
            setLabs([]);
        }
    };

    const handleSaveLab = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPatientId) return;
        setSubmitting(true);

        const payload = {
            patient_id: selectedPatientId,
            date: formDate,
            hb: formHb ? parseFloat(formHb) : null,
            k: formK ? parseFloat(formK) : null,
            ureum_pre: formUreumPre ? parseFloat(formUreumPre) : null,
            ureum_post: formUreumPost ? parseFloat(formUreumPost) : null,
            creatinine: formCreatinine ? parseFloat(formCreatinine) : null,
        };

        const {error} = await supabase.from('lab_results').insert([payload]);

        setSubmitting(false);
        if (error) {
            showToast(`Gagal menyimpan: ${error.message}`, 'error');
        } else {
            showToast('Hasil laboratorium berhasil disimpan');
            setModalOpen(false);
            // Reset Form
            setFormHb('');
            setFormK('');
            setFormUreumPre('');
            setFormUreumPost('');
            setFormCreatinine('');
            loadPatientLabs(selectedPatientId);
        }
    };

    const activePatient = patients.find((p) => p.id === selectedPatientId);

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Toast Feedback */}
            {toastMessage && (
                <div
                    className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold text-white transition-all ${
                        toastMessage.type === 'success' ? 'bg-teal-600' : 'bg-red-600'
                    }`}
                >
                    {toastMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4"/> :
                        <AlertCircle className="w-4 h-4"/>}
                    <span>{toastMessage.text}</span>
                </div>
            )}

            {/* Header */}
            <div
                className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
                        <FlaskConical className="w-6 h-6 text-teal-600"/> Hasil Laboratorium Pasien
                    </h1>
                    <p className="text-xs text-gray-500 mt-0.5">Pemantauan adekuasi dialisis (URR), elektrolit, dan
                        hematologi</p>
                </div>

                {selectedPatientId && (
                    <button
                        onClick={() => setModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-900/10 transition"
                    >
                        <Plus className="w-4 h-4"/>
                        <span>Input Hasil Lab</span>
                    </button>
                )}
            </div>

            {/* TAMPILAN 1: GRID PILIH PASIEN */}
            {!selectedPatientId ? (
                <div>
                    <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Pilih Pasien untuk
                        Membuka Riwayat:</h2>
                    {loading ? (
                        <div className="p-12 flex justify-center text-teal-600">
                            <Loader2 className="w-8 h-8 animate-spin"/>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {patients.map((p) => (
                                <div
                                    key={p.id}
                                    onClick={() => handleSelectPatient(p.id)}
                                    className="bg-white p-4 rounded-2xl border border-gray-100 hover:border-teal-500 hover:shadow-md transition cursor-pointer flex items-center justify-between group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                                            <User className="w-5 h-5"/>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900 text-xs sm:text-sm group-hover:text-teal-700 transition">
                                                {p.name}
                                            </h3>
                                            <p className="text-[11px] text-gray-400 font-mono">RM: {p.rm}</p>
                                        </div>
                                    </div>
                                    <ChevronRight
                                        className="w-5 h-5 text-gray-400 group-hover:text-teal-600 transition"/>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                /* TAMPILAN 2: RIWAYAT LAB PASIEN YANG DIPILIH */
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-teal-50/40">
                        <button
                            onClick={() => handleSelectPatient(null)}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-teal-800 transition"
                        >
                            <ArrowLeft className="w-4 h-4"/> Kembali ke Daftar Pasien
                        </button>
                        <div className="text-right">
                            <p className="text-xs font-bold text-teal-900">{activePatient?.name}</p>
                            <p className="text-[10px] text-teal-700 font-mono">RM: {activePatient?.rm}</p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="p-12 flex justify-center text-teal-600">
                            <Loader2 className="w-8 h-8 animate-spin"/>
                        </div>
                    ) : labs.length === 0 ? (
                        <div className="p-12 text-center text-gray-400 text-xs">
                            Belum ada data pemeriksaan laboratorium untuk pasien ini.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                <tr className="bg-gray-50/80 text-[11px] font-bold text-gray-500 uppercase border-b border-gray-100">
                                    <th className="py-3.5 px-5">Tanggal</th>
                                    <th className="py-3.5 px-4">Hemoglobin (g/dL)</th>
                                    <th className="py-3.5 px-4">Ureum Pre / Post</th>
                                    <th className="py-3.5 px-4">URR Adekuasi (%)</th>
                                    <th className="py-3.5 px-4">Kalium (mmol/L)</th>
                                    <th className="py-3.5 px-5">Kreatinin (mg/dL)</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-xs">
                                {labs.map((item) => {
                                    const urr = item.ureum_pre && item.ureum_post ? calculateURR(item.ureum_pre, item.ureum_post) : null;
                                    const isAdequate = urr !== null && urr >= 65;
                                    const isKHigh = item.k !== null && item.k > 5.5;

                                    return (
                                        <tr key={item.id} className="hover:bg-gray-50/60 transition">
                                            <td className="py-3.5 px-5 font-medium text-gray-700">{item.date}</td>
                                            <td className="py-3.5 px-4 font-bold">
                          <span
                              className={
                                  item.hb && (item.hb < 10 || item.hb > 12) ? 'text-amber-600' : 'text-gray-900'
                              }
                          >
                            {item.hb || '-'}
                          </span>
                                            </td>
                                            <td className="py-3.5 px-4 text-gray-600 font-mono">
                                                {item.ureum_pre || '-'}{' '}
                                                <span className="text-gray-400">/</span>{' '}
                                                {item.ureum_post || '-'}
                                            </td>
                                            <td className="py-3.5 px-4 font-bold">
                                                {urr !== null ? (
                                                    <span
                                                        className={`px-2 py-0.5 rounded-full text-[10px] ${
                                                            isAdequate ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                        }`}
                                                    >
                              {urr}% {isAdequate ? '(Target Tercapai)' : '(Belum Adekuat)'}
                            </span>
                                                ) : (
                                                    '-'
                                                )}
                                            </td>
                                            <td className="py-3.5 px-4 font-bold">
                          <span className={isKHigh ? 'text-red-600 animate-pulse' : 'text-gray-900'}>
                            {item.k || '-'}
                          </span>
                                            </td>
                                            <td className="py-3.5 px-5 text-gray-700">{item.creatinine || '-'}</td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* MODAL INPUT HASIL LAB */}
            {modalOpen && (
                <div
                    className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
                        <div className="bg-teal-700 text-white p-5 flex justify-between items-center">
                            <h3 className="font-bold text-sm flex items-center gap-2">
                                <FlaskConical className="w-4 h-4"/> Input Hasil Lab Baru ({activePatient?.name})
                            </h3>
                            <button onClick={() => setModalOpen(false)} className="text-teal-200 hover:text-white">
                                <X className="w-5 h-5"/>
                            </button>
                        </div>

                        <form onSubmit={handleSaveLab} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Tanggal
                                    Pemeriksaan</label>
                                <input
                                    type="date"
                                    required
                                    value={formDate}
                                    onChange={(e) => setFormDate(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-gray-50 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-500"
                                />
                            </div>

                            <div className="p-3.5 bg-gray-50 border rounded-2xl space-y-3">
                                <p className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">Hematologi &
                                    Elektrolit</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">Hemoglobin (g/dL)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            placeholder="Normal: 10 - 12"
                                            value={formHb}
                                            onChange={(e) => setFormHb(e.target.value)}
                                            className="w-full px-3 py-2 bg-white border rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">Kalium (mmol/L)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            placeholder="Normal: 3.5 - 5.5"
                                            value={formK}
                                            onChange={(e) => setFormK(e.target.value)}
                                            className="w-full px-3 py-2 bg-white border rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="p-3.5 bg-blue-50/60 border border-blue-100 rounded-2xl space-y-3">
                                <p className="text-[11px] font-bold text-blue-900 uppercase tracking-wider">Adekuasi
                                    Dialisis & Ginjal</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">Ureum Pre-HD (mg/dL)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            placeholder="Contoh: 120"
                                            value={formUreumPre}
                                            onChange={(e) => setFormUreumPre(e.target.value)}
                                            className="w-full px-3 py-2 bg-white border rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">Ureum Post-HD
                                            (mg/dL)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            placeholder="Contoh: 35"
                                            value={formUreumPost}
                                            onChange={(e) => setFormUreumPost(e.target.value)}
                                            className="w-full px-3 py-2 bg-white border rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-500"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs text-gray-600 mb-1">Kreatinin Darah
                                            (mg/dL)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            placeholder="Contoh: 8.5"
                                            value={formCreatinine}
                                            onChange={(e) => setFormCreatinine(e.target.value)}
                                            className="w-full px-3 py-2 bg-white border rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-3 flex justify-end gap-2 border-t">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="px-4 py-2 border rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-5 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700 transition flex items-center gap-1.5"
                                >
                                    {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin"/>}
                                    <span>Simpan Hasil Lab</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}