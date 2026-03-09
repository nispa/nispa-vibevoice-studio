import React from 'react';
import { FileText, BookOpen, Trash2 } from 'lucide-react';
import { useSubtitleContext } from '../context/SubtitleContext';

/**
 * Component that provides action buttons for subtitle management.
 * 
 * Includes buttons to open the subtitle editor, save the current state 
 * as a draft in the archive, and clear the current session.
 * 
 * @returns {JSX.Element | null} The rendered buttons or null if no file is uploaded.
 */
export const SubtitleActionButtons: React.FC = () => {
    const {
        subtitleFile,
        setSubtitleFile,
        subtitleSegments,
        setSubtitleSegments,
        setShowEditor,
        setLoadingPreview,
        loadingPreview,
        saveJobDraft,
        groupByPunctuation
    } = useSubtitleContext();

    /**
     * Opens the subtitle editor modal. If segments are not already loaded in state,
     * it first parses them from the uploaded file via the backend.
     */
    const handleEditSubtitles = async () => {
        if (!subtitleFile) return;

        // If segments are already in state (loaded from job or previously parsed), just open editor
        if (subtitleSegments && subtitleSegments.length > 0) {
            setShowEditor(true);
            return;
        }

        // Otherwise, parse from file
        setLoadingPreview(true);
        try {
            const formData = new FormData();
            formData.append('subtitle_file', subtitleFile);

            const res = await fetch(
                `http://localhost:8000/api/preview-subtitles?group_by_punctuation=${groupByPunctuation}`,
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

    /**
     * Resets the current subtitle session after user confirmation.
     */
    const handleClear = () => {
        if (confirm('Clear current subtitles and start new?')) {
            setSubtitleFile(null);
            setSubtitleSegments([]);
        }
    };

    if (!subtitleFile) return null;

    return (
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4 flex flex-col sm:flex-row gap-3">
            <button
                onClick={handleEditSubtitles}
                disabled={loadingPreview}
                className="flex-1 px-4 py-2.5 bg-indigo-600/90 hover:bg-indigo-500 text-white rounded-lg transition inline-flex items-center justify-center gap-2 text-sm font-medium shadow-lg shadow-indigo-500/20"
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
                onClick={handleClear}
                className="flex-1 px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg border border-rose-500/30 transition inline-flex items-center justify-center gap-2 text-sm font-medium"
            >
                <Trash2 size={18} />
                Clear / New
            </button>
        </div>
    );
};
