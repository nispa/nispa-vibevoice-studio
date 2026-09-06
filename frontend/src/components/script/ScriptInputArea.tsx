import { useRef, useState } from 'react';
import { Clipboard, FileText } from 'lucide-react';
import FileUploadArea from '../ui/FileUploadArea';
import { useScriptContext } from '../../features/script/context/ScriptContext';
import { useGlobalContext } from '../../context/GlobalContext';
import HiggsEmotionGuideModal from './HiggsEmotionGuideModal';
import { HiggsTagPalette } from './HiggsTagPalette';

export default function ScriptInputArea() {
    const { models } = useGlobalContext();
    const {
        scriptFile, setScriptFile,
        scriptText, setScriptText,
        setDetectedSpeakers, setErrorMsg,
        clearDraft, hasDraft, selectedModel
    } = useScriptContext();
    const scriptInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [showGuideModal, setShowGuideModal] = useState(false);

    const currentModel = models.find(m => m.id === selectedModel);
    const supportsEmotionTags = Boolean(currentModel?.supports_emotion_tags);

    const insertTag = (tag: string) => {
        const textarea = textareaRef.current;
        if (!textarea) {
            handleScriptTextChange(scriptText + tag);
            return;
        }
        const start = textarea.selectionStart ?? scriptText.length;
        const end = textarea.selectionEnd ?? scriptText.length;
        const before = scriptText.substring(0, start);
        const after = scriptText.substring(end);
        const newText = before + tag + after;
        handleScriptTextChange(newText);

        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + tag.length, start + tag.length);
        }, 0);
    };

    const extractSpeakersFromText = (text: string): string[] => {
        const speakerPattern = /^(?:\[?([^\]:]+)\]?:?)\s*(.*)$/gm;
        const uniqueSpeakers = new Set<string>();
        let match;

        while ((match = speakerPattern.exec(text)) !== null) {
            const speakerName = match[1]?.trim();
            const dialogue = match[2]?.trim();

            if (speakerName && dialogue && speakerName.length < 30 && speakerName.length > 0) {
                uniqueSpeakers.add(speakerName);
                if (uniqueSpeakers.size >= 8) break; // Maximum 8 speakers for script mode
            }
        }

        return Array.from(uniqueSpeakers);
    };

    const handleScriptFileChange = (file: File | null) => {
        setScriptFile(file);
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target?.result as string;
                setScriptText(text);
                const foundSpeakers = extractSpeakersFromText(text);
                setDetectedSpeakers(foundSpeakers);
            };
            reader.readAsText(file);
            setErrorMsg('');
        }
    };

    const handleScriptTextChange = (text: string) => {
        setScriptText(text);
        const foundSpeakers = extractSpeakersFromText(text);
        setDetectedSpeakers(foundSpeakers);
    };

    return (
        <div className="space-y-6">
            <FileUploadArea
                file={scriptFile}
                onFileChange={handleScriptFileChange}
                inputRef={scriptInputRef}
                accept=".txt,.md"
                icon={FileText}
                titleDefault="Upload Dialogue Script"
                subtitleDefault=".txt or .md format"
                titleLoaded={scriptFile?.name}
                subtitleLoaded="Script loaded successfully"
                activeBorderClass="border-indigo-500"
                activeBgClass="bg-indigo-500/5"
                activeTextClass="text-indigo-400"
                layout="horizontal"
            />

            <div className="bg-slate-800/30 rounded-lg p-5 border border-slate-700/50">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-700/50">
                    <div className="flex items-center gap-2">
                        <Clipboard size={18} className="text-indigo-400" />
                        <h4 className="font-semibold text-slate-200">Or Paste Script Here</h4>
                    </div>
                    {hasDraft && (
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-emerald-400 font-medium flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                Draft auto-saved
                            </span>
                            <button
                                type="button"
                                onClick={clearDraft}
                                className="text-xs text-slate-400 hover:text-red-400 hover:underline transition-colors"
                            >
                                Clear Draft
                            </button>
                        </div>
                    )}
                </div>

                {supportsEmotionTags && (
                    <HiggsTagPalette
                        onInsertTag={insertTag}
                        onOpenGuide={() => setShowGuideModal(true)}
                    />
                )}


                <textarea
                    ref={textareaRef}
                    value={scriptText}
                    onChange={(e) => handleScriptTextChange(e.target.value)}
                    placeholder="Format: Speaker1: Dialogue. Up to 8 speakers supported.&#10;&#10;Example:&#10;Speaker1: Hello, how are you?&#10;Speaker2: I'm doing great!&#10;Speaker1: That's wonderful!"
                    className="input-style w-full h-36 resize-none bg-slate-900/50"
                />

                <HiggsEmotionGuideModal
                    isOpen={showGuideModal}
                    onClose={() => setShowGuideModal(false)}
                    onInsertTag={insertTag}
                />
            </div>
        </div>
    );
}
