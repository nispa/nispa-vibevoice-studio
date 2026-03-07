import React from 'react';
import { Eye } from 'lucide-react';
import { useSubtitleContext } from '../context/SubtitleContext';

export const SubtitleGroupingControls: React.FC = () => {
    const {
        subtitleFile,
        groupByPunctuation,
        setGroupByPunctuation,
        setPreviewData,
        loadingPreview,
        setShowPreview,
        setLoadingPreview,
    } = useSubtitleContext();

    const loadPreview = async () => {
        if (!subtitleFile) return;

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
                setPreviewData(data);
                setShowPreview(true);
            } else {
                alert('Failed to load preview');
            }
        } catch (err) {
            console.error('Error loading preview:', err);
            alert('Error loading preview');
        } finally {
            setLoadingPreview(false);
        }
    };

    if (!subtitleFile) return null;

    return (
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={groupByPunctuation}
                            onChange={(e) => {
                                setGroupByPunctuation(e.target.checked);
                                setPreviewData(null);
                            }}
                            className="w-4 h-4 rounded border-slate-600 accent-indigo-500 cursor-pointer"
                        />
                        <span className="text-slate-300 font-medium select-none">
                            Intelligent Grouping
                        </span>
                    </label>
                    <span className="text-xs text-slate-400">
                        Reduce stuttering by grouping segments at punctuation marks
                    </span>
                </div>
            </div>

            <p className="text-xs text-slate-500 mb-3">
                Enable this to combine subtitle segments that are split mid-sentence. Segments will only be split at sentence endings (. ! ?).
                Useful for avoiding choppy audio in long dialogue.
            </p>

            <button
                onClick={loadPreview}
                disabled={!subtitleFile || loadingPreview}
                className="text-sm px-3 py-2 bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-slate-100 rounded-lg border border-slate-600/50 transition inline-flex items-center gap-2"
            >
                <Eye size={16} />
                {loadingPreview ? 'Loading Preview...' : 'Preview Subtitles'}
            </button>
        </div>
    );
};
