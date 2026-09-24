'use client';

import React, {useCallback, useEffect, useState} from 'react';
import {createClient} from '@/lib/supabase/client';
import {AlertCircle, Calendar, CheckCircle2, Clock, Loader2, Plus, User, X,} from 'lucide-react';

interface Schedule {
    id: string;
    patient_id: string;
    date: string;
    shift: 'Pagi' | 'Siang' | 'Sore';
    bed: string;
    status: string;
    patients: {
        id: string;
        name: string;
        rm: string;
    };
}

interface PatientOption {
    id: string;
    name: string;
    rm: string;
}

export default function NurseJadwalPage() {
    const supabase = createClient();

    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [patients, setPatients] = useState<PatientOption[]>([]);
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [selectedShift, setSelectedShift] = useState<string>('All');
    const [loading, setLoading] = useState(true);

    // Modal
    const [modalOpen, setModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    // Form State
    const [formPatientId, setFormPatientId] = useState('');
    const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
    const [formShift, setFormShift] = useState<'Pagi' | 'Siang' | 'Sore'>('Pagi');
    const [formBed, setFormBed] = useState('Mesin 1');

    const showToast = (text: string, type: 'success' | 'error' = 'success') => {
        setToastMessage({text, type});
        setTimeout(() => setToastMessage(null), 3500);
    };

    const loadData = useCallback(async () => {
        setLoading(true);

        // Ambil daftar jadwal
        let query = supabase
            .from('schedules')
            .select('id, patient_id, date, shift, bed, status, patients ( id, name, rm )')
            .order('date', {ascending: false});

        if (selectedDate) {
            query = query.eq('date', selectedDate);
        }
        if (selectedShift !== 'All') {
            query = query.eq('shift', selectedShift);
        }

        const {data: schedData} = await query;
        if (schedData) setSchedules(schedData as unknown as Schedule[]);

        // Ambil daftar pasien untuk dropdown select
        const {data: patData} = await supabase
            .from('patients')
            .select('id, name, rm')
            .order('name');
        if (patData) setPatients(patData);

        setLoading(false);
    }, [supabase, selectedDate, selectedShift]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleCreateSchedule = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        const {error} = await supabase.from('schedules').insert([
            {
                patient_id: formPatientId,
                date: formDate,
                shift: formShift,
                bed: formBed,
                status: 'Terjadwal',
            },
        ]);

        setSubmitting(false);
        if (error) {
            showToast(`Gagal menjadwalkan: ${error.message}`, 'error');
        } else {
            showToast('Jadwal hemodialisis baru berhasil dibuat');
            setModalOpen(false);
            loadData();
        }
    };

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

            {/* Header & Filter Controls */}
            <div
                className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
                        <Calendar className="w-6 h-6 text-teal-600"/> Penjadwalan Hemodialisis
                    </h1>
                    <p className="text-xs text-gray-500 mt-0.5">Atur alokasi shift dan mesin pasien HD</p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Filter Tanggal */}
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-teal-500"
                    />

                    {/* Filter Shift */}
                    <div className="relative">
                        <select
                            value={selectedShift}
                            onChange={(e) => setSelectedShift(e.target.value)}
                            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-teal-500 pr-8"
                        >
                            <option value="All">Semua Shift</option>
                            <option value="Pagi">Shift Pagi</option>
                            <option value="Siang">Shift Siang</option>
                            <option value="Sore">Shift Sore</option>
                        </select>
                    </div>

                    {/* Tombol Buat Jadwal */}
                    <button
                        onClick={() => setModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-900/10 transition"
                    >
                        <Plus className="w-4 h-4"/>
                        <span>Tambah Jadwal</span>
                    </button>
                </div>
            </div>

            {/* Tabel Jadwal */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="p-12 flex flex-col items-center justify-center text-teal-600 gap-2">
                        <Loader2 className="w-8 h-8 animate-spin"/>
                        <span className="text-xs font-semibold">Memuat jadwal...</span>
                    </div>
                ) : schedules.length === 0 ? (
                    <div className="p-12 text-center text-gray-400 text-xs">
                        Tidak ada jadwal cuci darah pada tanggal dan shift yang dipilih.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                            <tr className="bg-gray-50/80 text-[11px] font-bold text-gray-500 uppercase border-b border-gray-100">
                                <th className="py-3.5 px-5">Tanggal</th>
                                <th className="py-3.5 px-4">Shift</th>
                                <th className="py-3.5 px-4">Pasien</th>
                                <th className="py-3.5 px-4">Mesin / Bed</th>
                                <th className="py-3.5 px-4">Status</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-xs">
                            {schedules.map((s) => {
                                const statusColors: Record<string, string> = {
                                    Terjadwal: 'bg-blue-100 text-blue-800',
                                    Berlangsung: 'bg-teal-100 text-teal-800',
                                    Selesai: 'bg-green-100 text-green-800',
                                };

                                return (
                                    <tr key={s.id} className="hover:bg-gray-50/60 transition">
                                        <td className="py-3.5 px-5 font-medium text-gray-700">{s.date}</td>
                                        <td className="py-3.5 px-4 font-bold text-gray-800">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-teal-600"/>
                            {s.shift}
                        </span>
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="w-6 h-6 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 font-bold text-[10px]">
                                                    <User className="w-3.5 h-3.5"/>
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900">{s.patients?.name}</p>
                                                    <p className="text-[10px] text-gray-400">RM: {s.patients?.rm}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-4 font-mono font-semibold text-gray-700">{s.bed}</td>
                                        <td className="py-3.5 px-4">
                        <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${statusColors[s.status] || 'bg-gray-100 text-gray-700'}`}>
                          {s.status}
                        </span>
                                        </td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* MODAL INPUT JADWAL */}
            {modalOpen && (
                <div
                    className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="bg-teal-700 text-white p-5 flex justify-between items-center">
                            <h3 className="font-bold text-sm flex items-center gap-2">
                                <Calendar className="w-4 h-4"/> Tambah Jadwal HD Pasien
                            </h3>
                            <button onClick={() => setModalOpen(false)} className="text-teal-200 hover:text-white">
                                <X className="w-5 h-5"/>
                            </button>
                        </div>

                        <form onSubmit={handleCreateSchedule} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Pilih Pasien</label>
                                <select
                                    required
                                    value={formPatientId}
                                    onChange={(e) => setFormPatientId(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-gray-50 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-500"
                                >
                                    <option value="">-- Pilih Nama Pasien --</option>
                                    {patients.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name} ({p.rm})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Tanggal
                                    Tindakan</label>
                                <input
                                    type="date"
                                    required
                                    value={formDate}
                                    onChange={(e) => setFormDate(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-gray-50 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Shift</label>
                                    <select
                                        value={formShift}
                                        onChange={(e) => setFormShift(e.target.value as any)}
                                        className="w-full px-3.5 py-2.5 bg-gray-50 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-500"
                                    >
                                        <option value="Pagi">Pagi (07:00)</option>
                                        <option value="Siang">Siang (12:00)</option>
                                        <option value="Sore">Sore (17:00)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Nomor Mesin /
                                        Bed</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Contoh: Mesin 3"
                                        value={formBed}
                                        onChange={(e) => setFormBed(e.target.value)}
                                        className="w-full px-3.5 py-2.5 bg-gray-50 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-500"
                                    />
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
                                    <span>Simpan Jadwal</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}