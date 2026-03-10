import { useState } from 'react';
import { Cpu, FlaskConical, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import type { SystemInfoData } from '../../hooks/useSystemInfo';

interface SystemDetailsProps {
    system: SystemInfoData['system'];
    torch: SystemInfoData['torch'];
}

interface TestResult {
    model: string;
    status: 'success' | 'error' | 'missing';
    message: string;
}

export const SystemDetails = ({ system, torch }: SystemDetailsProps) => {
    const [testResults, setTestResults] = useState<TestResult[] | null>(null);
    const [isTesting, setIsTesting] = useState(false);

    const handleTestQwen = async () => {
        setIsTesting(true);
        setTestResults(null);
        try {
            const res = await fetch('http://127.0.0.1:8000/api/system/test-qwen', { method: 'POST' });
            const data = await res.json();
            setTestResults(data.results);
        } catch (err) {
            console.error("Test failed:", err);
        } finally {
            setIsTesting(false);
        }
    };

    return (
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-700/30 rounded-lg">
                        <Cpu className="text-slate-400" size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-100">System Details</h3>
                </div>
                
                <button
                    onClick={handleTestQwen}
                    disabled={isTesting}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-lg text-sm font-medium transition disabled:opacity-50"
                >
                    {isTesting ? <Loader2 size={16} className="animate-spin" /> : <FlaskConical size={16} />}
                    {isTesting ? 'Testing Qwen3...' : 'Test Qwen3 Integration'}
                </button>
            </div>

            {/* Diagnostic Results */}
            {testResults && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                    {testResults.map((res, idx) => (
                        <div key={idx} className={`p-4 rounded-lg border flex items-start gap-3 ${
                            res.status === 'success' ? 'bg-emerald-500/5 border-emerald-500/20' : 
                            res.status === 'missing' ? 'bg-amber-500/5 border-amber-500/20' : 'bg-rose-500/5 border-rose-500/20'
                        }`}>
                            {res.status === 'success' ? <CheckCircle2 className="text-emerald-400 mt-0.5" size={18} /> : 
                             res.status === 'missing' ? <AlertCircle className="text-amber-400 mt-0.5" size={18} /> : 
                             <AlertCircle className="text-rose-400 mt-0.5" size={18} />}
                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">{res.model}</h4>
                                <p className={`text-xs mt-1 ${
                                    res.status === 'success' ? 'text-emerald-400/80' : 
                                    res.status === 'missing' ? 'text-amber-400/80' : 'text-rose-400/80'
                                }`}>
                                    {res.message}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                    <span className="font-medium text-slate-400">Platform</span>
                    <span className="text-slate-200 font-mono">{system.platform}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                    <span className="font-medium text-slate-400">Platform Release</span>
                    <span className="text-slate-200 font-mono">{system.platform_release}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                    <span className="font-medium text-slate-400">Python Version</span>
                    <span className="text-slate-200 font-mono">{system.python_version}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                    <span className="font-medium text-slate-400">PyTorch Version</span>
                    <span className="text-slate-200 font-mono">{torch.version}</span>
                </div>
            </div>
        </div>
    );
};
