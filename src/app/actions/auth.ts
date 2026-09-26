'use server';

import {createClient} from "@supabase/supabase-js";

export async function createPatientAuth(email: string, password: string, name: string, patientId: string) {
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        const {data: authData, error: authError} = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                name,
                role: 'patient',
                patient_id: patientId
            }
        });

        if (authError) throw new Error(`Gagal membuat akun login: ${authError.message}`);

        if (authData.user) {
            const {error: profileError} = await supabaseAdmin.from('profiles').insert([{
                id: authData.user.id,
                name: name,
                role: 'patient',
                patient_id: patientId,
            }]);

            if (profileError) throw new Error(`Gagal menyimpan ke profil: ${profileError.message}`);
        }

        return {success: true};
    } catch (error: any) {
        return {success: false, error: error.message};
    }
}

export async function updatePatientAuth(patientId: string, newPassword?: string, newUsername?: string) {
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        // 1. Cari user ID (UUID Auth) berdasarkan patientId dari tabel profiles
        const {data: profileData, error: profileErr} = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('patient_id', patientId)
            .single();

        if (profileErr || !profileData) throw new Error("Profil pasien tidak ditemukan.");

        const authUserId = profileData.id;

        // Objek update untuk Auth
        const updateParams: any = {};
        if (newPassword) updateParams.password = newPassword;
        if (newUsername) updateParams.email = `${newUsername.trim().toLowerCase()}@smarthd.com`;

        // 2. Update via Supabase Admin (tidak akan melogout Perawat)
        if (Object.keys(updateParams).length > 0) {
            const {error: authError} = await supabaseAdmin.auth.admin.updateUserById(
                authUserId,
                updateParams
            );
            if (authError) throw new Error(`Gagal update auth: ${authError.message}`);
        }

        return {success: true};
    } catch (error: any) {
        return {success: false, error: error.message};
    }
}