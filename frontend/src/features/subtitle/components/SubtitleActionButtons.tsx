import React from 'react';
import { FileText, BookOpen, Archive } from 'lucide-react';
import { useSubtitleContext } from '../context/SubtitleContext';

export const SubtitleActionButtons: React.FC = () => {
    const {
        subtitleFile,
        setSubtitleSegments,
        setShowEditor,
        setLoadingPreview,
        loadingPreview,
        saveJobDraft,
        setShowArchive
    } = useSubtitleContext();

    const loadSegmentsFromFile = async () => {
        if (!subtitleFile) return;

        setLoadingPreview(true);
        try {
            const formData = new FormData();
            formData.append('subtitle_file', subtitleFile);

            const res = await fetch(
                'http://localhost:8000/api/preview-subtitles?group_by_punctuation=false',
                {
                    method: 'POST',
                    body: formData,
                }
            );

            if (res.ok) {
                const data = await res.json();
                setSubtitleSegments(data.segments);
                setShowEditor(true);
            } else {
                alert('Failed to load subtitles');
            }
        } catch (err) {
            console.error('Error loading segments:', err);
            alert('Error loading subtitles');
        } finally {
            setLoadingPreview(false);
        }
    };

    if (!subtitleFile) return null;

    return (
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4 flex flex-col sm:flex-row gap-3">
            <button
                onClick={loadSegmentsFromFile}
                disabled={loadingPreview}
                className="flex-1 px-4 py-2.5 bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-slate-100 rounded-lg border border-slate-600/50 transition inline-flex items-center justify-center gap-2 text-sm font-medium"
            >
                <FileText size={18} />
                {loadingPreview ? 'Loading...' : 'Edit Subtitles'}
            </button>
            <button
                onClick={() => saveJobDraft()}
                className="flex-1 px-4 py-2.5 bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-slate-100 rounded-lg border border-slate-600/50 transition inline-flex items-center justify-center gap-2 text-sm font-medium"
            >
                <BookOpen size={18} />
                Save as Draft
            </button>
            <button
                onClick={() => setShowArchive(true)}
                className="flex-1 px-4 py-2.5 bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-slate-100 rounded-lg border border-slate-600/50 transition inline-flex items-center justify-center gap-2 text-sm font-medium"
            >
                <Archive size={18} />
                Job Archive
            </button>
        </div>
    );
};
