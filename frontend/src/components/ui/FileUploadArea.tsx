import React, { useState, type RefObject } from 'react';
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
    className?: string;
}

/**
 * A reusable file upload area with drag-and-drop support and consistent styling.
 * 
 * @param {FileUploadAreaProps} props - Component props.
 * @returns {JSX.Element} The rendered file upload area.
 */
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
    layout = 'vertical',
    className = ""
}: FileUploadAreaProps) {
    const [isDragging, setIsDragging] = useState(false);
    const isHorizontal = layout === 'horizontal';

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const droppedFile = e.dataTransfer.files[0];
            // Simple validation for accepted types
            if (accept.split(',').some(type => droppedFile.name.endsWith(type.trim()))) {
                onFileChange(droppedFile);
            } else {
                alert(`Invalid file type. Accepted: ${accept}`);
            }
        }
    };

    const containerClasses = `
        border-2 border-dashed rounded-xl transition-all cursor-pointer 
        ${isDragging ? `border-${activeColorClass} ${activeBgClass} scale-[1.01] shadow-lg` : 
          file ? `border-${activeColorClass} ${activeBgClass}` : 'border-slate-700 hover:border-slate-600 hover:bg-slate-800/50'}
        ${isHorizontal ? 'p-6 flex items-center gap-6' : 'p-10 flex flex-col items-center justify-center'}
        ${className}
    `;

    return (
        <div
            className={containerClasses}
            onClick={() => inputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
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

            <div className={isHorizontal ? `p-4 rounded-full ${file || isDragging ? `${activeBgClass} ${activeTextClass}` : 'bg-slate-800 text-slate-400'}` : ''}>
                <Icon size={isHorizontal ? 32 : 48} className={isHorizontal ? '' : `mb-4 ${file || isDragging ? activeTextClass : 'text-slate-500'}`} />
            </div>

            <div className={isHorizontal ? '' : 'text-center'}>
                {file ? (
                    <>
                        <p className="text-lg font-medium text-slate-200 truncate max-w-[200px] md:max-w-[300px]">{titleLoaded || file.name}</p>
                        <p className="text-sm text-slate-400 mt-1">{subtitleLoaded}</p>
                    </>
                ) : (
                    <>
                        <p className="text-lg font-medium text-slate-300">{isDragging ? 'Drop it here!' : titleDefault}</p>
                        <p className="text-sm text-slate-500 mt-1">{isDragging ? `Upload ${accept}` : subtitleDefault}</p>
                    </>
                )}
            </div>
        </div>
    );
}
