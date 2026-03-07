
import { Zap, Cpu } from 'lucide-react';
import type { SystemInfoData } from './SystemInfo';

interface SystemFooterProps {
  systemInfo: SystemInfoData | null;
}

export default function SystemFooter({ systemInfo }: SystemFooterProps) {
  if (!systemInfo) return null;

  const isGpu = systemInfo.torch.cuda_available || systemInfo.torch.mps_available;
  const gpu = systemInfo.gpu.gpu_devices?.[0];
  const availableRamGb = systemInfo.cpu.memory_available_gb.toFixed(1);

  // Fallback if no specific GPU info but CUDA/MPS is true
  const gpuName = gpu?.name || (systemInfo.torch.mps_available ? "Apple Metal (MPS)" : "Unknown GPU");
  const vram = gpu?.memory_total || "?";

  return (
    <div className="w-full max-w-4xl mt-8 flex items-center justify-center gap-6 text-xs md:text-sm font-medium tracking-wide">
      {isGpu ? (
        <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
          <Zap size={16} />
          <span>Hardware Accelerated • {gpuName} ({vram} VRAM)</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700/50">
          <Cpu size={16} />
          <span>CPU Processing • System RAM: {availableRamGb} GB</span>
        </div>
      )}
    </div>
  );
}
