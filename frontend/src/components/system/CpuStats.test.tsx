import { render, screen } from '@testing-library/react';
import { CpuStats } from './CpuStats';

describe('CpuStats', () => {
    it('renders correctly', () => {
        const mockCpu = {
            physical_cores: 8,
            logical_cores: 16,
            cpu_percent: 25.5,
            memory_total_gb: 32.0,
            memory_available_gb: 15.5
        };

        render(<CpuStats cpu={mockCpu} />);

        expect(screen.getByText('CPU')).toBeTruthy();
        expect(screen.getByText('8')).toBeTruthy();
        expect(screen.getByText('16')).toBeTruthy();
        expect(screen.getByText('25.5%')).toBeTruthy();
        expect(screen.getByText('32.0')).toBeTruthy();
        expect(screen.getByText('15.5')).toBeTruthy();
    });
});
