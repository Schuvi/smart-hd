'use client';

import React from 'react';
import {Printer, X} from 'lucide-react';

export default function PrintReportModal({session, patient, onClose}: {
    session: any;
    patient: any;
    onClose: () => void
}) {
    return (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 print:p-0">
            <div
                className="bg-white w-full max-w-3xl rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh] print:max-h-none print:shadow-none print:w-full print:rounded-none">

                {/* Navigasi Modal - Tersembunyi saat dicetak */}
                <div className="bg-teal-800 text-white px-6 py-4 flex justify-between items-center print:hidden">
                    <h2 className="font-bold text-sm">Pratinjau Lembar Rekam Medis HD</h2>
                    <div className="flex gap-2">
                        <button
                            onClick={() => window.print()}
                            className="bg-white text-teal-800 px-3 py-1.5 rounded font-semibold text-xs flex items-center gap-1 hover:bg-teal-50"
                        >
                            <Printer className="w-3.5 h-3.5"/> Cetak
                        </button>
                        <button onClick={onClose} className="p-1 hover:bg-teal-700 rounded">
                            <X className="w-4 h-4"/>
                        </button>
                    </div>
                </div>

                {/* Lembar Dokumen Fisik */}
                <div className="p-8 overflow-y-auto text-black font-serif print:p-6 print:overflow-visible">
                    <div className="text-center border-b-2 border-black pb-4 mb-6">
                        <h1 className="text-xl font-bold tracking-widest uppercase">Laporan Tindakan Hemodialisis</h1>
                        <p className="text-xs font-sans text-gray-500">Unit Dialisis SMART-HD</p>
                    </div>

                    <table className="w-full text-xs mb-6 leading-relaxed">
                        <tbody>
                        <tr>
                            <td className="w-1/4 font-bold">Nama Pasien</td>
                            <td>: {patient.name}</td>
                            <td className="w-1/4 font-bold">No. Rekam Medis</td>
                            <td>: {patient.rm}</td>
                        </tr>
                        <tr>
                            <td className="font-bold">Tanggal Tindakan</td>
                            <td>: {session.date}</td>
                            <td className="font-bold">Shift / Mesin</td>
                            <td>: {session.shift} / {session.bed}</td>
                        </tr>
                        <tr>
                            <td className="font-bold">BB Kering Acuan</td>
                            <td>: {patient.dry_weight} kg</td>
                            <td className="font-bold">Status Tindakan</td>
                            <td>: {session.status}</td>
                        </tr>
                        </tbody>
                    </table>

                    {/* Pengkajian Pre & Post */}
                    <div className="grid grid-cols-2 gap-4 mb-6 text-xs border border-gray-300 p-3">
                        <div>
                            <p className="font-bold border-b pb-1 mb-2 font-sans">PENGKAJIAN PRE-HD</p>
                            <p>BB Pre-HD: {session.pre_hd?.weight || '-'} kg</p>
                            <p>Target UF: {session.pre_hd?.targetUF || '-'} L</p>
                            <p>TD Awal: {session.pre_hd?.tdSys || '-'}/{session.pre_hd?.tdDia || '-'} mmHg</p>
                        </div>
                        <div>
                            <p className="font-bold border-b pb-1 mb-2 font-sans">EVALUASI POST-HD</p>
                            <p>BB Akhir: {session.post_hd?.weight || '-'} kg</p>
                            <p>Total UF: {session.post_hd?.uf || '-'} L</p>
                        </div>
                    </div>

                    {/* Tanda Tangan */}
                    <div className="grid grid-cols-2 mt-16 text-center text-xs">
                        <div>
                            <p className="mb-16">Pasien / Keluarga</p>
                            <p className="border-t border-black w-40 mx-auto font-bold pt-1">{patient.name}</p>
                        </div>
                        <div>
                            <p className="mb-16">Perawat Penanggung Jawab</p>
                            <p className="border-t border-black w-40 mx-auto font-bold pt-1">( Petugas HD )</p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}