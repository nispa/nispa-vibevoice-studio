import React from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';
import type { SystemInfoData } from '../../hooks/useSystemInfo';

export const PerformanceStatus = ({ torch }: { torch: SystemInfoData['torch'] }) => {
    return (
        <div className={`rounded-xl p-6 border ${torch.cuda_available || torch.mps_available ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-yellow-500/10 border-yellow-500/30'}`}>
            <div className="flex items-start gap-4">
                <div className={`p-2 rounded-full mt-0.5 ${torch.cuda_available || torch.mps_available ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-500'}`}>
                    {torch.cuda_available || torch.mps_available ? (
                        <CheckCircle size={24} />
                    ) : (
                        <AlertCircle size={24} />
                    )}
                </div>
                <div>
                    <h4 className={`text-lg font-bold mb-1 ${torch.cuda_available || torch.mps_available ? 'text-emerald-400' : 'text-yellow-500'}`}>
                        Performance Status
                    </h4>
                    <p className={`text-sm leading-relaxed ${torch.cuda_available || torch.mps_available ? 'text-emerald-300' : 'text-yellow-300/90'}`}>
                        {torch.cuda_available || torch.mps_available
                            ? 'GPU Acceleration is active ✅. TTS generation will perform at optimal speeds.'
                            : '⚠ No GPU acceleration detected. TTS generation will run on CPU, which is significantly slower.'}
                    </p>
                </div>
            </div>
        </div>
    );
};
