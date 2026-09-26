'use server'

import {createClient} from "@supabase/supabase-js";

export async function updatePatientData(patientId: string, payload: {
    rm: string;
    name: string;
    dry_weight: number;
    fluid_limit: number;
    schedule_pattern: string | null
}) {
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        const {error: patientError} = await supabaseAdmin
            .from('patients')
            .update({...payload, updated_at: new Date().toISOString()})
            .eq('id', patientId);

        if (patientError) throw new Error(`Gagal update patients: ${patientError.message}`);

        const {error: profileError} = await supabaseAdmin
            .from('profiles')
            .update({name: payload.name, updated_at: new Date().toISOString()})
            .eq('patient_id', patientId);

        if (profileError) throw new Error(`Gagal update profiles: ${profileError.message}`);

        return {success: true};
    } catch (error: any) {
        return {success: false, error: error.message};
    }
}