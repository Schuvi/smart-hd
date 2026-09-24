'use client';

import React, {useState} from 'react';
import {createClient} from '@/lib/supabase/client';
import {calculateTargetUF} from '@/lib/calculations';
import {AlertCircle, CheckCircle2, Printer} from 'lucide-react';

export default function SesiHDWorkflow({session, patient, onRefresh}: {
    session: any;
    patient: any;
    onRefresh: () => void;
}) {
    const supabase = createClient();
    const [activeTab, setActiveTab] = useState<'Pre' | 'Intra' | 'Post'>('Pre');
    const [loading, setLoading] = useState(false);

    // Form States Pre-HD
    const [preWeight, setPreWeight] = useState(session?.pre_hd?.weight || '');
    const [targetUF, setTargetUF] = useState(session?.pre_hd?.targetUF || '');
    const [tdSys, setTdSys] = useState(session?.pre_hd?.tdSys || '');
    const [tdDia, setTdDia] = useState(session?.pre_hd?.tdDia || '');

    // Form States Post-HD
    const [postWeight, setPostWeight] = useState(session?.post_hd?.weight || '');
    const [actualUF, setActualUF] = useState(session?.post_hd?.uf || '');

    const handlePreWeightChange = (val: string) => {
        setPreWeight(val);
        if (patient?.dry_weight) {
            setTargetUF(calculateTargetUF(parseFloat(val), patient.dry_weight).toString());
        }
    };

    const submitPreHD = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const preData = {weight: preWeight, targetUF, tdSys, tdDia, timestamp: new Date().toISOString()};
        const {error} = await supabase
            .from('hd_sessions')
            .update({pre_hd: preData, status: 'Intra-HD'})
            .eq('id', session.id);

        setLoading(false);
        if (!error) {
            setActiveTab('Intra');
            onRefresh();
        }
    };

    const submitPostHD = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const postData = {weight: postWeight, uf: actualUF, timestamp: new Date().toISOString()};

        // 1. Simpan Post-HD data
        await supabase
            .from('hd_sessions')
            .update({post_hd: postData, status: 'Selesai'})
            .eq('id', session.id);

        // 2. Sinkronisasi BB Kering acuan terbaru ke profil pasien
        await supabase
            .from('patients')
            .update({dry_weight: parseFloat(postWeight)})
            .eq('id', patient.id);

        setLoading(false);
        onRefresh();
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Tab Navigation */}
            <div className="flex border-b border-gray-200">
                {(['Pre', 'Intra', 'Post'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-3 text-sm font-semibold text-center border-b-2 transition-all ${
                            activeTab === tab
                                ? 'border-teal-600 text-teal-700 bg-teal-50/50'
                                : 'border-transparent text-gray-500 hover:text-gray-800'
                        }`}
                    >
                        {tab === 'Pre' ? '1. Pre-HD' : tab === 'Intra' ? '2. Intra-HD' : '3. Post-HD'}
                    </button>
                ))}
            </div>

            <div className="p-6">
                {activeTab === 'Pre' && (
                    <form onSubmit={submitPreHD} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">BB Pre-HD (kg)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    required
                                    value={preWeight}
                                    onChange={(e) => handlePreWeightChange(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-sm"
                                />
                                <span
                                    className="text-xs text-teal-600 mt-1 block">BB Kering Acuan: {patient?.dry_weight} kg</span>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Target Penarikan
                                    Cairan / UF (L)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    required
                                    value={targetUF}
                                    onChange={(e) => setTargetUF(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg bg-amber-50/50 focus:ring-2 focus:ring-teal-500 outline-none text-sm font-bold text-amber-900"
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="mt-4 px-5 py-2.5 bg-teal-600 text-white font-semibold rounded-lg text-sm hover:bg-teal-700 transition"
                        >
                            Simpan Pre-HD & Mulai Sesi
                        </button>
                    </form>
                )}

                {activeTab === 'Post' && (
                    <form onSubmit={submitPostHD} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">BB Post-HD Aktual
                                    (kg)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    required
                                    value={postWeight}
                                    onChange={(e) => setPostWeight(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Total Cairan Ditarik
                                    (L)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    required
                                    value={actualUF}
                                    onChange={(e) => setActualUF(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-sm"
                                />
                            </div>
                        </div>

                        <div
                            className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-800 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-blue-600"/>
                            <span>Menyelesaikan sesi ini secara otomatis memperbarui nilai <strong>BB Kering</strong> pasien untuk pemantauan rumah.</span>
                        </div>

                        <div className="flex justify-between items-center pt-2">
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5"
                            >
                                <Printer className="w-4 h-4"/> Cetak Rekam Medis
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-5 py-2.5 bg-teal-600 text-white font-semibold rounded-lg text-sm hover:bg-teal-700 transition flex items-center gap-1.5"
                            >
                                <CheckCircle2 className="w-4 h-4"/> Selesaikan Tindakan HD
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}