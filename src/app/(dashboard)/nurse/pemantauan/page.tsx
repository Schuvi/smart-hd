"use client";
import React, {useEffect, useState} from 'react';
import {createClient} from '@/lib/supabase/client';
import {Activity, MessageSquare, X} from 'lucide-react';

interface Patient {
    id: string;
    rm: string;
    name: string;
    dry_weight: number;
    fluid_limit: number;
}

interface AggregatedData extends Patient {
    totalIntake: number;
    fPercent: number;
    lastW: number | null;
    idwgPerc: number;
    status: 'red' | 'yellow' | 'green';
}

export default function PantauRumah() {
    const [patients, setPatients] = useState<AggregatedData[]>([]);
    const [loading, setLoading] = useState(true);
    const [chatModalOpen, setChatModalOpen] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [chatMessage, setChatMessage] = useState("");

    const fetchData = async () => {
        setLoading(true);
        try {
            const todayISO = new Date();
            todayISO.setHours(0, 0, 0, 0);

            // Fetch Data dari Schema Terbaru
            const [ptsRes, fluidsRes, weightsRes] = await Promise.all([
                createClient().from('patients').select('*'),
                createClient().from('fluid_logs').select('*').gte('logged_at', todayISO.toISOString()),
                createClient().from('weight_logs').select('*').order('logged_at', {ascending: false})
            ]);

            const pts: Patient[] = ptsRes.data || [];
            const fluids = fluidsRes.data || [];
            const weights = weightsRes.data || [];

            const aggregated = pts.map((p) => {
                // Kalkulasi Cairan
                const pFluids = fluids.filter((f) => f.patient_id === p.id);
                let tIntake = 0, tOutput = 0;

                pFluids.forEach((f) => {
                    if (f.type === 'intake') tIntake += f.amount;
                    else if (f.type === 'output') tOutput += f.amount;
                });

                const totalIntake = tIntake - tOutput;
                const fluidLimit = p.fluid_limit || 1000;
                const fPercent = (totalIntake / fluidLimit) * 100;

                // Kalkulasi Berat Badan (IDWG)
                const pWeights = weights.filter((w) => w.patient_id === p.id);
                const lastW = pWeights.length > 0 ? pWeights[0].weight : null;

                let idwgPerc = 0;
                if (lastW && p.dry_weight) {
                    idwgPerc = ((lastW - p.dry_weight) / p.dry_weight) * 100;
                }

                // Threshold Logika Smart HD
                let status: 'red' | 'yellow' | 'green' = 'green';
                if (fPercent > 100 || idwgPerc >= 6) status = 'red';
                else if (fPercent > 75 || idwgPerc >= 4) status = 'yellow';

                return {...p, totalIntake, fPercent, lastW, idwgPerc, status};
            });

            // Urutkan prioritas (Merah -> Kuning -> Hijau)
            aggregated.sort((a, b) => {
                const weightMap = {'red': 3, 'yellow': 2, 'green': 1};
                return weightMap[b.status] - weightMap[a.status];
            });

            setPatients(aggregated);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPatient) return;

        const todayStr = new Date().toISOString().split('T')[0];

        try {
            // Cek apakah saran hari ini sudah dibuat (Tabel advices, tipe date)
            const {data: existingAdvice} = await createClient()
                .from('advices')
                .select('*')
                .eq('patient_id', selectedPatient.id)
                .eq('date', todayStr)
                .maybeSingle();

            if (existingAdvice) {
                // Array append untuk kolom messages (_text)
                const updatedMessages = [...(existingAdvice.messages || []), chatMessage];
                await createClient()
                    .from('advices')
                    .update({messages: updatedMessages})
                    .eq('id', existingAdvice.id);
            } else {
                await createClient().from('advices').insert([{
                    patient_id: selectedPatient.id,
                    date: todayStr,
                    messages: [chatMessage]
                }]);
            }

            alert(`Pesan terkirim ke ${selectedPatient.name}`);
            setChatModalOpen(false);
            setChatMessage("");
        } catch (error) {
            console.error("Gagal mengirim pesan", error);
            alert("Terjadi kesalahan saat mengirim pesan.");
        }
    };

    if (loading) return <div className="p-8 text-center text-teal-600 flex justify-center items-center"><Activity
        className="animate-spin w-8 h-8"/></div>;

    return (
        <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Activity className="text-teal-600"/> Pemantauan Pasien di Rumah
            </h2>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                    <tr className="bg-gray-50 text-gray-600 text-sm border-b">
                        <th className="p-4 font-semibold">Status</th>
                        <th className="p-4 font-semibold">Nama Pasien</th>
                        <th className="p-4 font-semibold">BB Terkini vs Kering</th>
                        <th className="p-4 font-semibold">IDWG Estimasi</th>
                        <th className="p-4 font-semibold">Cairan Hari Ini</th>
                        <th className="p-4 font-semibold">Aksi</th>
                    </tr>
                    </thead>
                    <tbody>
                    {patients.map((p) => {
                        const badgeColor = p.status === 'red' ? 'bg-red-500' : p.status === 'yellow' ? 'bg-amber-400' : 'bg-emerald-500';
                        const idwgColor = p.idwgPerc >= 6 ? 'text-red-600 font-bold' : p.idwgPerc >= 4 ? 'text-amber-600 font-semibold' : 'text-emerald-600';
                        const fluidColor = p.fPercent > 100 ? 'text-red-600 font-bold' : p.fPercent > 75 ? 'text-amber-600 font-semibold' : 'text-emerald-600';

                        return (
                            <tr key={p.id} className="border-b hover:bg-gray-50/50 text-sm transition-colors">
                                <td className="p-4">
                                    <div
                                        className={`w-3.5 h-3.5 rounded-full ${badgeColor} mx-auto shadow-sm ring-4 ring-${p.status}-50`}></div>
                                </td>
                                <td className="p-4">
                                    <p className="font-medium text-gray-900">{p.name}</p>
                                    <p className="text-xs text-gray-500 font-mono mt-0.5">{p.rm}</p>
                                </td>
                                <td className="p-4">{p.lastW ? p.lastW + ' kg' : '-'} / {p.dry_weight || '-'} kg</td>
                                <td className={`p-4 ${idwgColor}`}>{p.lastW ? p.idwgPerc.toFixed(1) + '%' : '-'}</td>
                                <td className="p-4">
                                    <div className="flex flex-col gap-1.5">
                                        <span className={fluidColor}>{p.totalIntake} / {p.fluid_limit} mL</span>
                                        <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div className={`h-full ${badgeColor} transition-all duration-500`}
                                                 style={{width: `${Math.min(p.fPercent, 100)}%`}}></div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <button
                                        onClick={() => {
                                            setSelectedPatient(p);
                                            setChatModalOpen(true);
                                        }}
                                        className="text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-md transition-colors text-xs border border-blue-200 font-medium flex items-center gap-1.5"
                                    >
                                        <MessageSquare className="w-3.5 h-3.5"/> Pesan
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                    </tbody>
                </table>
            </div>

            {/* Modal Pesan */}
            {chatModalOpen && selectedPatient && (
                <div
                    className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="bg-teal-600 text-white p-4 flex justify-between items-center">
                            <h3 className="font-bold flex items-center gap-2"><MessageSquare
                                className="w-5 h-5"/> Instruksi Pasien</h3>
                            <button onClick={() => setChatModalOpen(false)} className="text-white/80 hover:text-white">
                                <X className="w-5 h-5"/></button>
                        </div>
                        <form onSubmit={handleSendMessage} className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Pesan ke: <span
                                    className="font-bold">{selectedPatient.name}</span></label>
                                <textarea
                                    required
                                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-teal-500 outline-none resize-none"
                                    rows={4}
                                    placeholder="Tuliskan anjuran medis atau peringatan untuk pasien hari ini..."
                                    value={chatMessage}
                                    onChange={(e) => setChatMessage(e.target.value)}
                                />
                            </div>
                            <div className="pt-2 flex justify-end gap-3">
                                <button type="button" onClick={() => setChatModalOpen(false)}
                                        className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors">Batal
                                </button>
                                <button type="submit"
                                        className="px-6 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-bold shadow-sm transition-colors">Kirim
                                    Pesan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}