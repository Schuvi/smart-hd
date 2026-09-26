"use client";
import React, {useEffect, useState} from 'react';
import {createClient} from '@/lib/supabase/client';
import {CheckCircle, MessageCircleWarning, Reply} from 'lucide-react';

interface Complaint {
    id: string;
    patient_id: string;
    created_at: string;
    status: string;
    symptoms: string[];
    severity: number;
    description: string;
    reply: string | null;
    patients: { name: string } | null;
}

export default function KeluhanPasien() {
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [loading, setLoading] = useState(true);
    const [replyText, setReplyText] = useState<{ [key: string]: string }>({});

    const fetchComplaints = async () => {
        setLoading(true);
        try {
            // Join dengan tabel patients untuk mengambil nama pasien
            const {data, error} = await createClient()
                .from('complaints')
                .select(`*, patients (name)`)
                .order('created_at', {ascending: false});

            if (error) throw error;
            setComplaints(data as Complaint[] || []);
        } catch (error) {
            console.error("Gagal memuat keluhan", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchComplaints();
    }, []);

    const handleReply = async (id: string) => {
        const text = replyText[id];
        if (!text) return alert("Balasan tidak boleh kosong");

        try {
            const {error} = await createClient()
                .from('complaints')
                .update({
                    reply: text,
                    status: 'Selesai',
                    updated_at: new Date().toISOString()
                })
                .eq('id', id);

            if (error) throw error;

            // Optimistic Update
            setComplaints(prev => prev.map(c => c.id === id ? {...c, status: 'Selesai', reply: text} : c));
            setReplyText(prev => {
                const next = {...prev};
                delete next[id];
                return next;
            });

        } catch (error) {
            console.error("Gagal membalas keluhan", error);
            alert("Terjadi kesalahan saat menyimpan balasan");
        }
    };

    if (loading) return <div className="p-8 text-center text-teal-600 flex justify-center items-center">
        <MessageCircleWarning className="animate-spin w-8 h-8"/></div>;

    return (
        <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <MessageCircleWarning className="text-teal-600"/> Daftar Keluhan Pasien
            </h2>

            <div className="space-y-5">
                {complaints.length === 0 ? (
                    <div className="text-center p-10 border-2 border-dashed border-gray-200 rounded-xl">
                        <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-3"/>
                        <p className="text-gray-500 font-medium">Belum ada keluhan yang masuk.</p>
                    </div>
                ) : (
                    complaints.map((c) => (
                        <div key={c.id}
                             className={`border rounded-xl p-5 transition-colors ${c.status === 'Baru' ? 'bg-amber-50/50 border-amber-200 shadow-sm' : 'bg-gray-50/50 border-gray-200'}`}>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-bold text-gray-900 text-lg">{c.patients?.name || 'Unknown Patient'}</h3>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {new Date(c.created_at).toLocaleString('id-ID', {
                                            dateStyle: 'full',
                                            timeStyle: 'short'
                                        })}
                                    </p>
                                </div>
                                <span
                                    className={`px-3 py-1 text-xs font-bold tracking-wide rounded-full uppercase ${c.status === 'Baru' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
                                    {c.status}
                                </span>
                            </div>

                            <div
                                className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700 mb-4 bg-white p-4 rounded-lg border border-gray-100">
                                <div>
                                    <p className="mb-1"><strong>Gejala Terdeteksi:</strong></p>
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                        {c.symptoms && c.symptoms.length > 0 ? c.symptoms.map((sym, idx) => (
                                            <span key={idx}
                                                  className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md text-xs capitalize">{sym.replace('_', ' ')}</span>
                                        )) : '-'}
                                    </div>
                                </div>
                                <div>
                                    <p className="mb-1"><strong>Skala Nyeri / Gangguan:</strong> <span
                                        className="font-bold text-red-600 text-base ml-1">{c.severity}/10</span></p>
                                    <p className="mt-3"><strong>Deskripsi Tambahan:</strong></p>
                                    <p className="italic text-gray-600">"{c.description || 'Tidak ada deskripsi tambahan.'}"</p>
                                </div>
                            </div>

                            {c.status === 'Baru' ? (
                                <div className="mt-4 pt-4 border-t border-amber-200">
                                    <textarea
                                        className="w-full border border-gray-300 rounded-lg p-3 text-sm mb-3 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all resize-none"
                                        rows={3}
                                        placeholder="Tulis balasan, anjuran tindakan, atau instruksi klinis untuk pasien..."
                                        value={replyText[c.id] || ''}
                                        onChange={(e) => setReplyText({...replyText, [c.id]: e.target.value})}
                                    />
                                    <div className="flex justify-end">
                                        <button
                                            onClick={() => handleReply(c.id)}
                                            className="bg-teal-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-teal-700 shadow-sm transition-colors flex items-center gap-2"
                                        >
                                            <Reply className="w-4 h-4"/> Balas & Selesaikan Keluhan
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    className="mt-3 bg-teal-50/50 p-4 rounded-lg text-sm border border-teal-100 flex items-start gap-3">
                                    <CheckCircle className="w-5 h-5 text-teal-600 shrink-0 mt-0.5"/>
                                    <div>
                                        <strong className="text-teal-800 block mb-1">Tindakan / Balasan
                                            Perawat:</strong>
                                        <p className="text-gray-700 leading-relaxed">{c.reply || '-'}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}