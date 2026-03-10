import React from 'react';
import { Globe } from 'lucide-react';

interface LanguageSelectorProps {
    selectedLanguage: string;
    onLanguageSelect: (lang: string) => void;
    label?: string;
    description?: string;
}

const LANGUAGES = [
    'Italian', 'English', 'Chinese', 'German', 'Spanish', 'French', 'Japanese', 'Korean'
];

export default function LanguageSelector({
    selectedLanguage,
    onLanguageSelect,
    label = "Generation Language",
    description = "Select the primary language of the text."
}: LanguageSelectorProps) {
    return (
        <div className="bg-slate-800/40 rounded-lg p-5 border border-slate-700/50 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-start gap-4 flex-1">
                <div className="p-3 bg-blue-500/10 rounded-full text-blue-400 h-12 w-12 flex items-center justify-center">
                    <Globe size={22} />
                </div>
                <div>
                    <h4 className="font-medium text-slate-200">{label}</h4>
                    <p className="text-sm text-slate-400 mt-1">{description}</p>
                </div>
            </div>
            <div className="flex-shrink-0 w-full md:w-auto">
                <select
                    value={selectedLanguage}
                    onChange={(e) => onLanguageSelect(e.target.value)}
                    className="input-style w-full md:w-48 appearance-none bg-slate-700/50 cursor-pointer"
                >
                    {LANGUAGES.map(lang => (
                        <option key={lang} value={lang}>{lang}</option>
                    ))}
                </select>
            </div>
        </div>
    );
}
