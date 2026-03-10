import { useRef } from 'react';
import { Clipboard, FileText } from 'lucide-react';
import FileUploadArea from '../ui/FileUploadArea';
import { useScriptContext } from '../../features/script/context/ScriptContext';

export default function ScriptInputArea() {
    const { scriptFile, setScriptFile, scriptText, setScriptText, setDetectedSpeakers, setErrorMsg } = useScriptContext();
    const scriptInputRef = useRef<HTMLInputElement>(null);

    const extractSpeakersFromText = (text: string): string[] => {
        const speakerPattern = /^(?:\[?([^\]:]+)\]?:?)\s*(.*)$/gm;
        const uniqueSpeakers = new Set<string>();
        let match;

        while ((match = speakerPattern.exec(text)) !== null) {
            const speakerName = match[1]?.trim();
            const dialogue = match[2]?.trim();

            if (speakerName && dialogue && speakerName.length < 30 && speakerName.length > 0) {
                uniqueSpeakers.add(speakerName);
                if (uniqueSpeakers.size >= 4) break; // Maximum 4 speakers
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
                activeColorClass="indigo-500"
                activeBgClass="bg-indigo-500/5"
                activeTextClass="text-indigo-400"
                layout="horizontal"
            />

            <div className="bg-slate-800/30 rounded-lg p-5 border border-slate-700/50">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-700/50">
                    <Clipboard size={18} className="text-indigo-400" />
                    <h4 className="font-semibold text-slate-200">Or Paste Script Here</h4>
                </div>
                <textarea
                    value={scriptText}
                    onChange={(e) => handleScriptTextChange(e.target.value)}
                    placeholder="Format: Speaker1: Dialogue. Max 4 speakers for 1.5B/Large models.&#10;&#10;Example:&#10;Speaker1: Hello, how are you?&#10;Speaker2: I'm doing great!&#10;Speaker1: That's wonderful!"
                    className="input-style w-full h-32 resize-none bg-slate-900/50"
                />
            </div>
        </div>
    );
}
