import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import LanguageSelector from './LanguageSelector';

describe('LanguageSelector', () => {
    it('renders with selected language', () => {
        render(<LanguageSelector selectedLanguage="Italian" onLanguageSelect={vi.fn()} />);
        expect(screen.getByDisplayValue('Italian')).toBeInTheDocument();
    });

    it('calls onLanguageSelect when changed', () => {
        const onLanguageSelect = vi.fn();
        render(<LanguageSelector selectedLanguage="English" onLanguageSelect={onLanguageSelect} />);
        
        const select = screen.getByRole('combobox');
        fireEvent.change(select, { target: { value: 'German' } });
        
        expect(onLanguageSelect).toHaveBeenCalledWith('German');
    });
});
