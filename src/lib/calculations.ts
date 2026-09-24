export interface FluidEvaluation {
    netFluid: number;
    percentage: number;
    status: 'safe' | 'warning' | 'danger';
}

export interface IDWGEvaluation {
    idwgKg: number;
    idwgPercent: number;
    status: 'safe' | 'warning' | 'danger';
}

// 1. Kalkulasi IDWG (Interdialytic Weight Gain)
export function evaluateIDWG(currentWeight: number, dryWeight: number): IDWGEvaluation {
    const idwgKg = currentWeight - dryWeight;
    const idwgPercent = (idwgKg / dryWeight) * 100;

    let status: 'safe' | 'warning' | 'danger' = 'safe';
    if (idwgPercent >= 6) status = 'danger';
    else if (idwgPercent >= 4) status = 'warning';

    return {idwgKg: Number(idwgKg.toFixed(2)), idwgPercent: Number(idwgPercent.toFixed(1)), status};
}

// 2. Kalkulasi Keseimbangan Cairan Harian
export function evaluateFluidBalance(intake: number, output: number, limit: number): FluidEvaluation {
    const netFluid = intake - output;
    const percentage = (netFluid / limit) * 100;

    let status: 'safe' | 'warning' | 'danger' = 'safe';
    if (percentage > 100) status = 'danger';
    else if (percentage > 75) status = 'warning';

    return {netFluid, percentage: Number(percentage.toFixed(1)), status};
}

// 3. Kalkulasi Target UF Pre-HD (+ 300 mL priming/wash in)
export function calculateTargetUF(preWeight: number, dryWeight: number, washInLiters: number = 0.3): number {
    if (preWeight <= dryWeight) return 0;
    return Number(((preWeight - dryWeight) + washInLiters).toFixed(1));
}

// 4. Kalkulasi URR (Urea Reduction Ratio)
export function calculateURR(preUreum: number, postUreum: number): number {
    if (!preUreum || !postUreum || preUreum <= 0) return 0;
    return Number((((preUreum - postUreum) / preUreum) * 100).toFixed(1));
}