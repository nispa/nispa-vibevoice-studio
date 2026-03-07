import { useState, useCallback } from 'react';

export interface GPUDevice {
    index: number;
    name: string;
    compute_capability: string;
    memory_allocated: string;
    memory_reserved: string;
    memory_total: string;
    error?: string;
}

export interface SystemInfoData {
    system: {
        platform: string;
        platform_release: string;
        python_version: string;
    };
    torch: {
        version: string;
        cuda_available: boolean;
        cuda_version: string | null;
        mps_available: boolean;
    };
    gpu: {
        has_cuda: boolean;
        cuda_version: string | null;
        gpu_count: number;
        gpu_devices: GPUDevice[];
    };
    cpu: {
        physical_cores: number;
        logical_cores: number;
        cpu_percent: number;
        memory_total_gb: number;
        memory_available_gb: number;
    };
}

export function useSystemInfo() {
    const [systemInfo, setSystemInfo] = useState<SystemInfoData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchSystemInfo = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch('http://localhost:8000/api/system-info');
            if (res.ok) {
                const data: SystemInfoData = await res.json();
                setSystemInfo(data);
            } else {
                setError('Failed to fetch system info');
            }
        } catch (e: any) {
            setError(e.message || 'Error connecting to API');
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        systemInfo,
        isLoading,
        error,
        fetchSystemInfo
    };
}
