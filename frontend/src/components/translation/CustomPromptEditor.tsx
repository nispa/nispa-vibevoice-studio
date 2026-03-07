import React from 'react';

interface CustomPromptEditorProps {
    customPrompt: string;
    setCustomPrompt: (prompt: string) => void;
}

export const CustomPromptEditor: React.FC<CustomPromptEditorProps> = ({
    customPrompt,
    setCustomPrompt
}) => {
    return (
        <div className="flex-1 p-6 overflow-y-auto">
            <h3 className="text-lg font-semibold text-slate-200 mb-2 border-b border-slate-700/50 pb-2">
                Custom System Prompt
            </h3>
            <p className="text-sm text-slate-400 mb-4">
                This prompt configures how Ollama translates the subtitles. You can modify it to give instructions about tone, context, or style.
                <br />Leave <code>{'{target_language}'}</code> and <code>{'{text}'}</code> so the system can fill them.
            </p>
            <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                className="w-full h-[250px] bg-slate-900 border border-slate-700 rounded-lg p-4 text-sm font-mono text-slate-300 focus:outline-none focus:border-indigo-500 shadow-inner"
            />
        </div>
    );
};
