import type { RefObject } from 'react';
import type { LucideIcon } from 'lucide-react';

interface FileUploadAreaProps {
    file: File | null;
    onFileChange: (file: File | null) => void;
    inputRef: RefObject<HTMLInputElement | null>;
    accept: string;
    icon: LucideIcon;
    titleDefault: string;
    subtitleDefault: string;
    titleLoaded?: string;
    subtitleLoaded?: string;
    activeColorClass: string;   // e.g. "blue-500"
    activeBgClass: string;      // e.g. "bg-blue-500/5"
    activeTextClass: string;    // e.g. "text-blue-500"
    layout?: 'vertical' | 'horizontal';
}

export default function FileUploadArea({
    file,
    onFileChange,
    inputRef,
    accept,
    icon: Icon,
    titleDefault,
    subtitleDefault,
    titleLoaded,
    subtitleLoaded = "Ready for generation",
    activeColorClass,
    activeBgClass,
    activeTextClass,
    layout = 'vertical'
}: FileUploadAreaProps) {
    const isHorizontal = layout === 'horizontal';

    return (
        <div
            className={`border border-dashed rounded-xl transition-all cursor-pointer hover:bg-slate-800/50 
                ${file ? `border-${activeColorClass} ${activeBgClass}` : 'border-slate-700'}
                ${isHorizontal ? 'p-6 flex items-center gap-6' : 'p-10 flex flex-col items-center justify-center'}
            `}
            onClick={() => inputRef.current?.click()}
        >
            <input
                type="file"
                accept={accept}
                className="hidden"
                ref={inputRef}
                onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                        onFileChange(e.target.files[0]);
                    }
                }}
            />

            <div className={isHorizontal ? `p-4 rounded-full ${file ? `${activeBgClass} ${activeTextClass}` : 'bg-slate-800 text-slate-400'}` : ''}>
                <Icon size={isHorizontal ? 32 : 48} className={isHorizontal ? '' : `mb-4 ${file ? activeTextClass : 'text-slate-500'}`} />
            </div>

            <div className={isHorizontal ? '' : 'text-center'}>
                {file ? (
                    <>
                        <p className="text-lg font-medium text-slate-200">{titleLoaded || file.name}</p>
                        <p className="text-sm text-slate-400 mt-1">{subtitleLoaded}</p>
                    </>
                ) : (
                    <>
                        <p className="text-lg font-medium text-slate-300">{titleDefault}</p>
                        <p className="text-sm text-slate-500 mt-1">{subtitleDefault}</p>
                    </>
                )}
            </div>
        </div>
    );
}
