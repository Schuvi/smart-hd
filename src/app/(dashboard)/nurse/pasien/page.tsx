'use client';

import React, {useCallback, useEffect, useState} from 'react';
import {createClient} from '@/lib/supabase/client';
import {
    AlertCircle,
    Calendar,
    CheckCircle2,
    Droplets,
    Edit2,
    KeyRound,
    Loader2,
    Plus,
    Scale,
    Search,
    Users,
    X,
} from 'lucide-react';
import {createPatientAuth, updatePatientAuth} from "@/app/actions/auth";
import {updatePatientData} from "@/app/actions/patient";

interface Patient {
    id: string;
    rm: string;
    name: string;
    dry_weight: number;
    fluid_limit: number;
    schedule_pattern: string | null;
    created_at: string;
}

export default function NursePasienPage() {
    const supabase = createClient();

    const [patients, setPatients] = useState<Patient[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);

    // Modal States
    const [patientModalOpen, setPatientModalOpen] = useState(false);
    const [accountModalOpen, setAccountModalOpen] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    // Form State Pasien terintegrasi dengan Akun
    const [formData, setFormData] = useState({
        rm: '',
        name: '',
        dry_weight: '',
        fluid_limit: '1000',
        schedule_pattern: '',
        username: '',
        password: '',
    });

    // Form State untuk Reset Akun Pasien
    const [accountData, setAccountData] = useState({
        username: '',
        password: '',
    });

    const showToast = (text: string, type: 'success' | 'error' = 'success') => {
        setToastMessage({text, type});
        setTimeout(() => setToastMessage(null), 3500);
    };

    const loadPatients = useCallback(async () => {
        setLoading(true);
        const {data, error} = await supabase
            .from('patients')
            .select('*')
            .order('name', {ascending: true});

        if (!error && data) {
            setPatients(data);
        }
        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        loadPatients();
    }, [loadPatients]);

    const handleOpenPatientModal = (patient?: Patient) => {
        if (patient) {
            setSelectedPatient(patient);
            setFormData({
                rm: patient.rm,
                name: patient.name,
                dry_weight: patient.dry_weight.toString(),
                fluid_limit: patient.fluid_limit.toString(),
                schedule_pattern: patient.schedule_pattern || '',
                username: '',
                password: '',
            });
        } else {
            setSelectedPatient(null);
            setFormData({
                rm: '',
                name: '',
                dry_weight: '',
                fluid_limit: '1000',
                schedule_pattern: '',
                username: '',
                password: '',
            });
        }
        setPatientModalOpen(true);
    };

    const handleSavePatient = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        const payload = {
            rm: formData.rm.trim(),
            name: formData.name.trim(),
            dry_weight: parseFloat(formData.dry_weight),
            fluid_limit: parseInt(formData.fluid_limit),
            schedule_pattern: formData.schedule_pattern.trim() || null,
            updated_at: new Date().toISOString(),
        };

        if (selectedPatient) {
            const result = await updatePatientData(selectedPatient.id, payload);

            if (!result.success) {
                showToast(`Gagal memperbarui: ${result.error}`, 'error');
            } else {
                showToast('Profil pasien & akun berhasil diperbarui');
                setPatientModalOpen(false);
                loadPatients();
            }
        } else {
            try {
                // 1. Insert ke tabel patients
                const {data: newPatient, error: patientError} = await supabase
                    .from('patients')
                    .insert([payload])
                    .select()
                    .single();

                if (patientError) throw new Error(`Gagal menyimpan data medis: ${patientError.message}`);

                // 2. Buat akun pasien melalui Server Action (Mencegah auto-login & menembus RLS)
                const email = `${formData.username.trim().toLowerCase()}@smarthd.com`;
                const authResult = await createPatientAuth(
                    email,
                    formData.password,
                    payload.name,
                    newPatient.id
                );

                if (!authResult.success) {
                    throw new Error(`Pasien tersimpan, namun gagal membuat akun login: ${authResult.error}`);
                }

                showToast('Pasien baru beserta akun dan profil berhasil didaftarkan');
                setPatientModalOpen(false);
                loadPatients();
            } catch (err: any) {
                showToast(err.message, 'error');
            }
        }
        setSubmitting(false);
    };
    const handleOpenAccountModal = (patient: Patient) => {
        setSelectedPatient(patient);
        setAccountData({
            username: patient.rm.toLowerCase().replace(/[^a-z0-9]/g, '') || `pasien_${patient.id.slice(0, 4)}`,
            password: '',
        });
        setAccountModalOpen(true);
    };

    const handleSaveAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPatient) return;
        setSubmitting(true);

        try {
            const {error} = await updatePatientAuth(selectedPatient.id, accountData.password, accountData.username)

            if (error) throw error;

            showToast(`Akun pasien ${selectedPatient.name} berhasil diperbarui`);
            setAccountModalOpen(false);
        } catch (err: any) {
            console.log(err)
            showToast(err.message || 'Gagal membuat akun pasien', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const filteredPatients = patients.filter(
        (p) =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.rm.toLowerCase().includes(searchQuery.toLowerCase())
    );

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

            {/* Header & Filter Bar */}
            <div
                className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-black text-black flex items-center gap-2">
                        <Users className="w-6 h-6 text-teal-600"/> Master Data Pasien
                    </h1>
                    <p className="text-xs text-black font-medium mt-0.5">Kelola informasi klinis, jadwal rutin, dan
                        akses pasien</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-black"/>
                        <input
                            type="text"
                            placeholder="Cari nama atau No. RM..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs text-black font-semibold outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
                        />
                    </div>

                    <button
                        onClick={() => handleOpenPatientModal()}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-900/10 transition"
                    >
                        <Plus className="w-4 h-4"/>
                        <span>Pasien Baru</span>
                    </button>
                </div>
            </div>

            {/* Tabel Pasien */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="p-12 flex flex-col items-center justify-center text-teal-600 gap-2">
                        <Loader2 className="w-8 h-8 animate-spin"/>
                        <span className="text-xs font-bold text-black">Memuat daftar pasien...</span>
                    </div>
                ) : filteredPatients.length === 0 ? (
                    <div className="p-12 text-center font-bold text-black text-sm">
                        Tidak ditemukan data pasien yang sesuai dengan kata kunci.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                            <tr className="bg-gray-100 text-xs font-extrabold text-black uppercase border-b border-gray-300">
                                <th className="py-3.5 px-5">No. RM</th>
                                <th className="py-3.5 px-4">Nama Pasien</th>
                                <th className="py-3.5 px-4">Jadwal Rutin</th>
                                <th className="py-3.5 px-4">BB Kering Acuan</th>
                                <th className="py-3.5 px-4">Batas Cairan</th>
                                <th className="py-3.5 px-5 text-right">Aksi</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 text-xs">
                            {filteredPatients.map((p) => (
                                <tr key={p.id} className="hover:bg-gray-50 transition">
                                    <td className="py-3.5 px-5 font-mono font-extrabold text-teal-800">{p.rm}</td>
                                    <td className="py-3.5 px-4 font-bold text-black">{p.name}</td>
                                    <td className="py-3.5 px-4 text-black font-semibold">
                                            <span
                                                className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-gray-200 border border-gray-300 rounded-md text-[11px] font-bold">
                                                <Calendar className="w-3 h-3 text-black"/>
                                                {p.schedule_pattern || 'Belum diatur'}
                                            </span>
                                    </td>
                                    <td className="py-3.5 px-4 font-bold text-black">
                                            <span className="inline-flex items-center gap-1">
                                                <Scale className="w-3.5 h-3.5 text-blue-600"/>
                                                {p.dry_weight} kg
                                            </span>
                                    </td>
                                    <td className="py-3.5 px-4 font-bold text-black">
                                            <span className="inline-flex items-center gap-1">
                                                <Droplets className="w-3.5 h-3.5 text-teal-600"/>
                                                {p.fluid_limit} mL
                                            </span>
                                    </td>
                                    <td className="py-3.5 px-5 text-right space-x-2">
                                        <button
                                            onClick={() => handleOpenPatientModal(p)}
                                            className="p-1.5 text-blue-700 hover:bg-blue-100 rounded-lg transition"
                                            title="Edit Profil"
                                        >
                                            <Edit2 className="w-4 h-4"/>
                                        </button>
                                        <button
                                            onClick={() => handleOpenAccountModal(p)}
                                            className="p-1.5 text-teal-700 hover:bg-teal-100 rounded-lg transition"
                                            title="Atur Ulang Sandi/Akun"
                                        >
                                            <KeyRound className="w-4 h-4"/>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* MODAL 1: TAMBAH / EDIT PROFIL PASIEN */}
            {patientModalOpen && (
                <div
                    className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="bg-teal-700 text-white p-5 flex justify-between items-center">
                            <h3 className="font-bold text-sm flex items-center gap-2">
                                <Users className="w-4 h-4"/>
                                {selectedPatient ? 'Edit Data Pasien' : 'Pendaftaran Pasien Baru'}
                            </h3>
                            <button onClick={() => setPatientModalOpen(false)}
                                    className="text-teal-100 hover:text-white">
                                <X className="w-5 h-5"/>
                            </button>
                        </div>

                        <form onSubmit={handleSavePatient} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-extrabold text-black mb-1">No. Rekam Medis
                                    (RM)</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Contoh: RM-001"
                                    value={formData.rm}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (!selectedPatient) {
                                            setFormData({
                                                ...formData,
                                                rm: val,
                                                username: val.toLowerCase().replace(/[^a-z0-9]/g, '')
                                            });
                                        } else {
                                            setFormData({...formData, rm: val});
                                        }
                                    }}
                                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs text-black outline-none focus:ring-2 focus:ring-teal-500 font-mono font-bold"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-extrabold text-black mb-1">Nama Lengkap
                                    Pasien</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Contoh: Bpk. Budi Santoso"
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs text-black font-semibold outline-none focus:ring-2 focus:ring-teal-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-extrabold text-black mb-1">BB Kering
                                        (kg)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        required
                                        placeholder="60.0"
                                        value={formData.dry_weight}
                                        onChange={(e) => setFormData({...formData, dry_weight: e.target.value})}
                                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs text-black font-semibold outline-none focus:ring-2 focus:ring-teal-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-extrabold text-black mb-1">Batas Cairan
                                        (mL)</label>
                                    <input
                                        type="number"
                                        required
                                        placeholder="1000"
                                        value={formData.fluid_limit}
                                        onChange={(e) => setFormData({...formData, fluid_limit: e.target.value})}
                                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs text-black font-semibold outline-none focus:ring-2 focus:ring-teal-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-extrabold text-black mb-1">Pola Jadwal
                                    Rutin</label>
                                <input
                                    type="text"
                                    placeholder="Contoh: Selasa - Jumat"
                                    value={formData.schedule_pattern}
                                    onChange={(e) => setFormData({...formData, schedule_pattern: e.target.value})}
                                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs text-black font-semibold outline-none focus:ring-2 focus:ring-teal-500"
                                />
                            </div>

                            {!selectedPatient && (
                                <div className="pt-3 mt-3 border-t border-gray-300">
                                    <h4 className="text-xs font-extrabold text-teal-800 mb-3 flex items-center gap-2">
                                        <KeyRound className="w-4 h-4"/> Pengaturan Akses Login Mandiri Pasien
                                    </h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-extrabold text-black mb-1">Username
                                                Login</label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="Sesuai RM"
                                                value={formData.username}
                                                onChange={(e) => setFormData({...formData, username: e.target.value})}
                                                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs text-black font-mono font-bold outline-none focus:ring-2 focus:ring-teal-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-extrabold text-black mb-1">Kata
                                                Sandi</label>
                                            <input
                                                type="password"
                                                required
                                                minLength={6}
                                                placeholder="Minimal 6 huruf/angka"
                                                value={formData.password}
                                                onChange={(e) => setFormData({...formData, password: e.target.value})}
                                                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs text-black font-semibold outline-none focus:ring-2 focus:ring-teal-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="pt-3 flex justify-end gap-2 border-t border-gray-300">
                                <button
                                    type="button"
                                    onClick={() => setPatientModalOpen(false)}
                                    className="px-4 py-2 border border-gray-400 rounded-xl text-xs font-extrabold text-black hover:bg-gray-100"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-5 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700 transition flex items-center gap-1.5"
                                >
                                    {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin"/>}
                                    <span>{selectedPatient ? 'Simpan Profil' : 'Daftar & Buat Akun'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL 2: ATUR AKUN LOGIN PASIEN LAMA */}
            {accountModalOpen && selectedPatient && (
                <div
                    className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="bg-teal-700 text-white p-5 flex justify-between items-center">
                            <h3 className="font-bold text-sm flex items-center gap-2">
                                <KeyRound className="w-4 h-4"/> Akses Login Pasien
                            </h3>
                            <button onClick={() => setAccountModalOpen(false)}
                                    className="text-teal-200 hover:text-white">
                                <X className="w-5 h-5"/>
                            </button>
                        </div>

                        <form onSubmit={handleSaveAccount} className="p-6 space-y-4">
                            <div
                                className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs font-bold text-blue-900">
                                Atur atau reset username & kata sandi pasien
                                untuk <strong>{selectedPatient.name}</strong>.
                            </div>

                            <div>
                                <label className="block text-xs font-extrabold text-black mb-1">Username / ID
                                    Pasien</label>
                                <input
                                    type="text"
                                    required
                                    value={accountData.username}
                                    onChange={(e) => setAccountData({...accountData, username: e.target.value})}
                                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs text-black font-mono font-bold outline-none focus:ring-2 focus:ring-teal-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-extrabold text-black mb-1">Kata Sandi Baru
                                    Pasien</label>
                                <input
                                    type="password"
                                    required
                                    minLength={6}
                                    placeholder="Minimal 6 karakter"
                                    value={accountData.password}
                                    onChange={(e) => setAccountData({...accountData, password: e.target.value})}
                                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs text-black font-semibold outline-none focus:ring-2 focus:ring-teal-500"
                                />
                            </div>

                            <div className="pt-3 flex justify-end gap-2 border-t border-gray-300">
                                <button
                                    type="button"
                                    onClick={() => setAccountModalOpen(false)}
                                    className="px-4 py-2 border border-gray-400 rounded-xl text-xs font-extrabold text-black hover:bg-gray-100"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-5 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700 transition flex items-center gap-1.5"
                                >
                                    {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin"/>}
                                    <span>Simpan Akun Baru</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}