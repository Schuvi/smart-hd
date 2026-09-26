'use client';

import React, {useCallback, useEffect, useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {createClient} from '@/lib/supabase/client';
import {AlertCircle, CheckCircle2, Loader2, Printer} from 'lucide-react';

export default function SesiHDWorkflowPage() {
    const searchParams = useSearchParams();
    const sessionId = searchParams.get('id');
    const supabase = createClient();

    const [session, setSession] = useState<any>(null);
    const [patient, setPatient] = useState<any>(null);
    const [lastPostWeight, setLastPostWeight] = useState<number | null>(null);
    const [pageLoading, setPageLoading] = useState(true);

    const [activeTab, setActiveTab] = useState<'Pre' | 'Post'>('Pre');
    const [loading, setLoading] = useState(false);

    const [preWeight, setPreWeight] = useState('');
    const [targetUF, setTargetUF] = useState('');
    const [tdSys, setTdSys] = useState('');
    const [tdDia, setTdDia] = useState('');
    const [nadi, setNadi] = useState('');
    const [thrill, setThrill] = useState(false);
    const [bruit, setBruit] = useState(false);
    const [merah, setMerah] = useState(false);
    const [bengkak, setBengkak] = useState(false);
    const [notes, setNotes] = useState('');

    const [postWeight, setPostWeight] = useState('');
    const [actualUF, setActualUF] = useState('');
    const [postTd, setPostTd] = useState('');
    const [postNadi, setPostNadi] = useState('');
    const [medication, setMedication] = useState('');
    const [bleeding, setBleeding] = useState(false);
    const [postNotes, setPostNotes] = useState('');

    const loadSessionData = useCallback(async () => {
        if (!sessionId) {
            setPageLoading(false);
            return;
        }
        setPageLoading(true);

        // 1. Ambil Sesi Saat Ini
        const {data: sessionData, error: sessionError} = await supabase
            .from('hd_sessions')
            .select('*')
            .eq('id', sessionId)
            .single();

        if (sessionData && !sessionError) {
            setSession(sessionData);

            // 2. Ambil Profil Pasien
            const {data: patientData} = await supabase
                .from('patients')
                .select('*')
                .eq('id', sessionData.patient_id)
                .single();

            if (patientData) setPatient(patientData);

            // 3. Cari BB Post-HD sesi sebelumnya untuk perbandingan
            const {data: pastSessions} = await supabase
                .from('hd_sessions')
                .select('post_hd')
                .eq('patient_id', sessionData.patient_id)
                .eq('status', 'Selesai')
                .neq('id', sessionId)
                .order('created_at', {ascending: false})
                .limit(1);

            if (pastSessions && pastSessions.length > 0) {
                setLastPostWeight(pastSessions[0].post_hd?.weight || null);
            }
        }
        setPageLoading(false);
    }, [sessionId, supabase]);

    useEffect(() => {
        loadSessionData();
    }, [loadSessionData]);

    useEffect(() => {
        if (session) {
            if (session.pre_hd) {
                setPreWeight(session.pre_hd.weight || '');
                setTargetUF(session.pre_hd.targetUF || '');
                setTdSys(session.pre_hd.tdSys || '');
                setTdDia(session.pre_hd.tdDia || '');
                setNadi(session.pre_hd.nadi || '');
                setThrill(session.pre_hd.thrill || false);
                setBruit(session.pre_hd.bruit || false);
                setMerah(session.pre_hd.merah || false);
                setBengkak(session.pre_hd.bengkak || false);
                setNotes(session.pre_hd.notes || '');
            }
            if (session.post_hd) {
                setPostWeight(session.post_hd.weight || '');
                setActualUF(session.post_hd.uf || '');
                setPostTd(session.post_hd.td || '');
                setPostNadi(session.post_hd.nadi || '');
                setMedication(session.post_hd.medication || '');
                setBleeding(session.post_hd.bleeding || false);
                setPostNotes(session.post_hd.notes || '');
            }
            // Langsung set tab ke Post jika bukan Terjadwal atau Pre-HD
            if (session.status === 'Pre-HD' || session.status === 'Terjadwal') {
                setActiveTab('Pre');
            } else {
                setActiveTab('Post');
            }
        }
    }, [session]);

    if (pageLoading) {
        return <div className="p-12 text-center flex justify-center text-teal-600"><Loader2
            className="w-8 h-8 animate-spin"/></div>;
    }

    if (!sessionId || !session) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
                <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3"/>
                <h3 className="text-base font-bold text-black">Sesi Tidak Ditemukan</h3>
                <p className="text-xs text-black font-medium mt-1">Sesi tidak valid atau tidak ada ID pada URL. Silakan
                    kembali ke Beranda.</p>
            </div>
        );
    }

    // Kalkulasi Diff BB untuk Visualisasi
    const preWeightNum = parseFloat(preWeight);
    const diffDry = !isNaN(preWeightNum) && patient?.dry_weight ? (preWeightNum - patient.dry_weight) : null;
    const diffLast = !isNaN(preWeightNum) && lastPostWeight ? (preWeightNum - lastPostWeight) : null;

    const handlePreWeightChange = (val: string) => {
        setPreWeight(val);
        const w = parseFloat(val);
        if (patient?.dry_weight && !isNaN(w) && w > patient.dry_weight) {
            const uf = (w - patient.dry_weight) + 0.3; // + 300ml priming/wash-in
            setTargetUF(uf.toFixed(1));
        } else {
            setTargetUF('');
        }
    };

    const submitPreHD = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const preData = {
            weight: preWeight,
            targetUF,
            tdSys,
            tdDia,
            nadi,
            thrill,
            bruit,
            merah,
            bengkak,
            notes,
            timestamp: new Date().toISOString()
        };
        const {error} = await supabase.from('hd_sessions').update({
            pre_hd: preData,
            status: 'Post-HD',
            updated_at: new Date().toISOString()
        }).eq('id', session.id);

        setLoading(false);
        if (!error) {
            setActiveTab('Post');
            loadSessionData();
        } else {
            alert(`Gagal menyimpan Pre-HD: ${error.message}`);
        }
    };

    const submitPostHD = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const postData = {
            weight: postWeight,
            uf: actualUF,
            td: postTd,
            nadi: postNadi,
            medication,
            bleeding,
            notes: postNotes,
            timestamp: new Date().toISOString()
        };

        try {
            await supabase.from('hd_sessions').update({
                post_hd: postData,
                status: 'Selesai',
                updated_at: new Date().toISOString()
            }).eq('id', session.id);

            // Perbarui otomatis BB Kering profil pasien
            await supabase.from('patients').update({
                dry_weight: parseFloat(postWeight),
                updated_at: new Date().toISOString()
            }).eq('id', patient.id);

            if (session.schedule_id) {
                await supabase.from('schedules').update({status: 'Selesai'}).eq('id', session.schedule_id);
            }
            setLoading(false);
            alert('Sesi Hemodialisis selesai. Data BB Kering pasien terupdate.');
            loadSessionData();
        } catch (err: any) {
            setLoading(false);
            alert(`Gagal menyelesaikan sesi: ${err.message}`);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden max-w-5xl mx-auto">
            {/* Header Informasi Pasien */}
            <div
                className="bg-teal-50 border-b border-teal-100 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                    <h3 className="font-extrabold text-black text-sm">Pasien: {patient?.name || 'Unknown'} <span
                        className="font-mono text-xs text-teal-800">({patient?.rm})</span></h3>
                    <p className="text-xs text-black font-semibold mt-0.5">BB Kering
                        Acuan: {patient?.dry_weight || '-'} kg | Shift: {session.shift} | Mesin: {session.bed}</p>
                </div>
                <span
                    className="px-3 py-1 bg-teal-600 text-white font-bold text-xs rounded-full uppercase tracking-wider">
                    {session.status}
                </span>
            </div>

            {/* Navigasi Tab (Sekarang hanya 2 Fase) */}
            <div className="flex border-b border-gray-200 bg-gray-50">
                {(['Pre', 'Post'] as const).map((tab) => (
                    <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-3 text-xs font-extrabold text-center border-b-2 transition-all ${
                            activeTab === tab
                                ? 'border-teal-600 text-teal-800 bg-white shadow-xs'
                                : 'border-transparent text-black hover:bg-gray-100'
                        }`}
                    >
                        {tab === 'Pre' ? '1. Pengkajian Pre-HD' : '2. Evaluasi Post-HD'}
                    </button>
                ))}
            </div>

            <div className="p-4 md:p-6">
                {/* -------------------- TAB 1: PRE-HD -------------------- */}
                {activeTab === 'Pre' && (
                    <form onSubmit={submitPreHD} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Card 1: Analisis Berat Badan */}
                            <div className="border border-blue-200 rounded-xl p-5 bg-blue-50/30">
                                <h3 className="font-bold text-gray-700 mb-3 border-b border-blue-100 pb-2 flex items-center gap-2">
                                    Analisis Berat Badan
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">BB Kering Acuan:</span>
                                        <span className="font-bold text-gray-800">{patient?.dry_weight || '-'} kg</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">BB Post-HD Lalu:</span>
                                        <span className="font-bold text-gray-800">{lastPostWeight || '-'} kg</span>
                                    </div>
                                    <div
                                        className="flex justify-between text-sm mt-3 pt-3 border-t border-blue-100 bg-white p-2 rounded-lg">
                                        <span className="text-gray-600 font-medium">Selisih BB Kering:</span>
                                        <span className="font-bold text-blue-600">
                                            {diffDry !== null ? `${diffDry > 0 ? '+' : ''}${diffDry.toFixed(1)} kg` : '-'}
                                        </span>
                                    </div>
                                    <div
                                        className="flex justify-between text-sm bg-white p-2 rounded-lg mt-2 shadow-sm">
                                        <span className="text-gray-600 font-medium">Selisih BB Post-HD Lalu:</span>
                                        <span className="font-bold text-amber-600">
                                            {diffLast !== null ? `${diffLast > 0 ? '+' : ''}${diffLast.toFixed(1)} kg` : '-'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Card 2: Penilaian Awal */}
                            <div className="border border-gray-200 rounded-xl p-5">
                                <h3 className="font-bold text-gray-700 mb-3 border-b pb-2">Penilaian Awal</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-extrabold text-black mb-1">BB Pre-HD
                                            (kg)</label>
                                        <input type="number" step="0.1" required value={preWeight}
                                               onChange={(e) => handlePreWeightChange(e.target.value)}
                                               className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs text-black font-semibold outline-none focus:ring-2 focus:ring-teal-500"/>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-extrabold text-black mb-1">Target UF
                                            (L)</label>
                                        <input type="number" step="0.1" required value={targetUF}
                                               onChange={(e) => setTargetUF(e.target.value)}
                                               className="w-full px-3.5 py-2.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-black font-extrabold outline-none focus:ring-2 focus:ring-teal-500"/>
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-xs font-extrabold text-black mb-1">Tekanan Darah
                                            Awal</label>
                                        <div className="flex gap-2 items-center">
                                            <input type="number" placeholder="Sys" required value={tdSys}
                                                   onChange={(e) => setTdSys(e.target.value)}
                                                   className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs text-black font-semibold outline-none"/>
                                            <span className="font-bold text-black">/</span>
                                            <input type="number" placeholder="Dia" required value={tdDia}
                                                   onChange={(e) => setTdDia(e.target.value)}
                                                   className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs text-black font-semibold outline-none"/>
                                        </div>
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-xs font-extrabold text-black mb-1">Nadi
                                            (x/mnt)</label>
                                        <input type="number" required value={nadi}
                                               onChange={(e) => setNadi(e.target.value)}
                                               className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs text-black font-semibold outline-none"/>
                                    </div>
                                </div>
                            </div>

                            {/* Card 3: Akses Vaskular */}
                            <div className="border border-gray-200 rounded-xl p-5 md:col-span-2">
                                <h3 className="font-bold text-gray-700 mb-3 border-b pb-2">Akses Vaskular</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <label
                                        className="flex items-center gap-2 text-xs font-extrabold text-black cursor-pointer">
                                        <input type="checkbox" checked={thrill}
                                               onChange={(e) => setThrill(e.target.checked)}
                                               className="w-4 h-4 text-teal-600 rounded"/> Thrill (+)
                                    </label>
                                    <label
                                        className="flex items-center gap-2 text-xs font-extrabold text-black cursor-pointer">
                                        <input type="checkbox" checked={bruit}
                                               onChange={(e) => setBruit(e.target.checked)}
                                               className="w-4 h-4 text-teal-600 rounded"/> Bruit (+)
                                    </label>
                                    <label
                                        className="flex items-center gap-2 text-xs font-extrabold text-black cursor-pointer">
                                        <input type="checkbox" checked={merah}
                                               onChange={(e) => setMerah(e.target.checked)}
                                               className="w-4 h-4 text-teal-600 rounded"/> Kemerahan
                                    </label>
                                    <label
                                        className="flex items-center gap-2 text-xs font-extrabold text-black cursor-pointer">
                                        <input type="checkbox" checked={bengkak}
                                               onChange={(e) => setBengkak(e.target.checked)}
                                               className="w-4 h-4 text-teal-600 rounded"/> Bengkak
                                    </label>
                                </div>
                                <div className="mt-4">
                                    <label className="block text-xs font-extrabold text-black mb-1">Catatan Akses /
                                        Keluhan Lainnya</label>
                                    <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
                                              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs text-black outline-none"
                                              placeholder="Catatan tambahan pra-dialisis..."/>
                                </div>
                            </div>
                        </div>

                        <div className="pt-3 flex justify-end border-t border-gray-200">
                            <button type="submit" disabled={loading}
                                    className="px-6 py-2.5 bg-teal-600 text-white font-bold rounded-xl text-xs hover:bg-teal-700 transition flex items-center gap-1.5 shadow-md">
                                {loading && <Loader2 className="w-4 h-4 animate-spin"/>}
                                <span>Simpan Pre-HD & Lanjut Post-HD</span>
                            </button>
                        </div>
                    </form>
                )}

                {/* -------------------- TAB 2: POST-HD -------------------- */}
                {activeTab === 'Post' && (
                    <form onSubmit={submitPostHD} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Card 1: Parameter Akhir */}
                            <div className="border border-gray-200 rounded-xl p-5">
                                <h3 className="font-bold text-gray-700 mb-3 border-b pb-2">Parameter Akhir</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-extrabold text-black mb-1">BB Aktual
                                            (kg)</label>
                                        <input type="number" step="0.1" required value={postWeight}
                                               onChange={(e) => setPostWeight(e.target.value)}
                                               className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs text-black font-semibold outline-none focus:ring-2 focus:ring-teal-500"/>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-extrabold text-black mb-1">Total Penarikan
                                            UF (L)</label>
                                        <input type="number" step="0.1" required value={actualUF}
                                               onChange={(e) => setActualUF(e.target.value)}
                                               className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs text-black font-semibold outline-none focus:ring-2 focus:ring-teal-500"/>
                                    </div>
                                    <div className="col-span-2 flex gap-4">
                                        <div className="flex-1">
                                            <label className="block text-xs font-extrabold text-black mb-1">TD
                                                Akhir</label>
                                            <input type="text" required placeholder="120/80" value={postTd}
                                                   onChange={(e) => setPostTd(e.target.value)}
                                                   className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs text-black font-semibold outline-none"/>
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-xs font-extrabold text-black mb-1">Nadi Akhir
                                                (x/mnt)</label>
                                            <input type="number" required value={postNadi}
                                                   onChange={(e) => setPostNadi(e.target.value)}
                                                   className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs text-black font-semibold outline-none"/>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Card 2: Tindakan Khusus & Obat */}
                            <div className="border border-gray-200 rounded-xl p-5">
                                <h3 className="font-bold text-gray-700 mb-3 border-b pb-2">Tindakan Khusus & Obat</h3>

                                <div className="mb-4">
                                    <label className="block text-xs font-bold text-teal-700 mb-1">Obat yang Diberikan
                                        (Masuk)</label>
                                    <input type="text" value={medication}
                                           onChange={(e) => setMedication(e.target.value)}
                                           placeholder="Contoh: ESA 3000 IU IV, Besi Sukrosa 100mg"
                                           className="w-full px-3.5 py-2.5 bg-teal-50 border border-teal-300 rounded-xl text-xs text-black outline-none focus:ring-2 focus:ring-teal-500"/>
                                    <p className="text-[10px] text-gray-500 mt-1">Obat ini akan tampil di riwayat
                                        aplikasi pasien.</p>
                                </div>

                                <div className="mb-4">
                                    <label
                                        className="flex items-center gap-2 text-xs font-extrabold text-black cursor-pointer">
                                        <input type="checkbox" checked={bleeding}
                                               onChange={(e) => setBleeding(e.target.checked)}
                                               className="w-4 h-4 text-red-600 rounded"/>
                                        Perdarahan Akses Aktif saat HD Selesai
                                    </label>
                                </div>

                                <div>
                                    <label className="block text-xs font-extrabold text-black mb-1">Instruksi Khusus /
                                        Edukasi / Catatan</label>
                                    <textarea rows={2} value={postNotes} onChange={(e) => setPostNotes(e.target.value)}
                                              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs text-black outline-none"
                                              placeholder="Pesan edukasi rumah..."/>
                                </div>
                            </div>
                        </div>

                        {/* Pemberitahuan Sinkronisasi */}
                        <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5"/>
                            <div className="text-sm text-blue-800">
                                <p className="font-bold text-xs">Sinkronisasi Otomatis:</p>
                                <p className="text-xs">Menyimpan data ini akan menjadikan BB Post-HD ini
                                    sebagai <strong>BB Kering Acuan</strong> sementara untuk sesi berikutnya, serta
                                    muncul otomatis di riwayat dashboard pasien.</p>
                            </div>
                        </div>

                        <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                            <button type="button" onClick={() => window.print()}
                                    className="px-4 py-2 border border-gray-400 rounded-xl text-xs font-extrabold text-black hover:bg-gray-100 flex items-center gap-1.5 transition">
                                <Printer className="w-4 h-4"/> Cetak Laporan
                            </button>
                            <button type="submit" disabled={loading}
                                    className="px-6 py-2.5 bg-teal-600 text-white font-bold rounded-xl text-xs hover:bg-teal-700 transition flex items-center gap-1.5 shadow-md">
                                {loading && <Loader2 className="w-4 h-4 animate-spin"/>}
                                <CheckCircle2 className="w-4 h-4"/> Selesaikan Sesi
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}