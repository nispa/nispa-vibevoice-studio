import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ModelsManagerModal } from './index';
import { modelsApi } from '../../services/modelsApi';
import { useGlobalContext } from '../../context/GlobalContext';

vi.mock('../../context/GlobalContext');
vi.mock('../../services/modelsApi');

describe('ModelsManagerModal', () => {
    const mockRefreshTtsData = vi.fn();
    const mockModels = [
        {
            id: 'higgs-audio-v3-4b',
            name: 'Higgs Audio v3 (4B Emotion)',
            engine: 'higgs',
            description: 'State of the art 4B parameter model',
            disk_size_gb: 9.0,
            actual_size_gb: 9.1,
            vram_cost_gb: 10.0,
            installed: true,
            sample_rate: 24000,
            supports_voice_clone: true,
            supports_voice_design: false,
            supports_emotion_tags: true,
            requires_reference_transcript: false
        },
        {
            id: 'qwen3-tts-1.7b',
            name: 'Qwen3-TTS 1.7B',
            engine: 'qwen',
            description: 'High quality multilingual model',
            disk_size_gb: 3.5,
            actual_size_gb: 0,
            vram_cost_gb: 4.5,
            installed: false,
            sample_rate: 24000,
            supports_voice_clone: true,
            supports_voice_design: true,
            supports_emotion_tags: false,
            requires_reference_transcript: true
        }
    ];

    const mockHealth = {
        status: 'healthy',
        gpu: {
            available: true,
            device_name: 'NVIDIA RTX 5070 Ti Laptop',
            vram_total_gb: 16.0,
            vram_free_gb: 12.5,
            vram_allocated_gb: 3.5,
            cuda_version: '13.0'
        },
        storage: {
            total_gb: 1000.0,
            used_gb: 350.0,
            free_gb: 650.0
        },
        tools: {
            ffmpeg: { available: true, path: 'C:/ffmpeg/bin/ffmpeg.exe' },
            sox: { available: true, path: 'C:/sox/sox.exe' }
        },
        worker_env: {
            available: true,
            path: 'venv_omnivoice'
        }
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useGlobalContext).mockReturnValue({
            refreshTtsData: mockRefreshTtsData
        } as unknown as ReturnType<typeof useGlobalContext>);

        vi.mocked(modelsApi.getManageModels).mockResolvedValue({
            models: mockModels as any
        });

        vi.mocked(modelsApi.getSystemHealth).mockResolvedValue(mockHealth as any);
        vi.mocked(modelsApi.subscribeDownloadProgress).mockReturnValue(() => {});
    });

    it('renders models list when open', async () => {
        await act(async () => {
            render(<ModelsManagerModal isOpen={true} onClose={vi.fn()} />);
        });

        expect(screen.getByText(/Models & Engines Manager/i)).toBeInTheDocument();
        expect(screen.getByText('Higgs Audio v3 (4B Emotion)')).toBeInTheDocument();
        expect(screen.getByText('Qwen3-TTS 1.7B')).toBeInTheDocument();
        expect(screen.getByText(/Uninstall/i)).toBeInTheDocument();
        expect(screen.getByText(/Install \(3.5 GB\)/i)).toBeInTheDocument();
    });

    it('switches between Models and System Health tabs', async () => {
        await act(async () => {
            render(<ModelsManagerModal isOpen={true} onClose={vi.fn()} />);
        });

        const healthTab = screen.getByRole('button', { name: /System Health/i });
        await act(async () => {
            fireEvent.click(healthTab);
        });

        expect(screen.getByText('GPU Hardware & CUDA')).toBeInTheDocument();
        expect(screen.getByText('NVIDIA RTX 5070 Ti Laptop')).toBeInTheDocument();
        expect(screen.getByText('Modern Engines Environment')).toBeInTheDocument();
    });

    it('filters models using search query', async () => {
        await act(async () => {
            render(<ModelsManagerModal isOpen={true} onClose={vi.fn()} />);
        });

        const searchInput = screen.getByPlaceholderText(/Search models/i);
        await act(async () => {
            fireEvent.change(searchInput, { target: { value: 'Higgs' } });
        });

        expect(screen.getByText('Higgs Audio v3 (4B Emotion)')).toBeInTheDocument();
        expect(screen.queryByText('Qwen3-TTS 1.7B')).not.toBeInTheDocument();
    });

    it('triggers download when clicking install button', async () => {
        vi.mocked(modelsApi.downloadModel).mockResolvedValue({
            status: 'started',
            model_id: 'qwen3-tts-1.7b',
            name: 'Qwen3-TTS 1.7B',
            message: 'Downloading'
        });

        await act(async () => {
            render(<ModelsManagerModal isOpen={true} onClose={vi.fn()} />);
        });

        const installBtn = screen.getByText(/Install \(3.5 GB\)/i);
        await act(async () => {
            fireEvent.click(installBtn);
        });

        expect(modelsApi.downloadModel).toHaveBeenCalledWith('qwen3-tts-1.7b');
    });

    it('closes modal when close button is clicked', async () => {
        const mockClose = vi.fn();
        await act(async () => {
            render(<ModelsManagerModal isOpen={true} onClose={mockClose} />);
        });

        const closeBtn = screen.getByRole('button', { name: /Close modal/i });
        await act(async () => {
            fireEvent.click(closeBtn);
        });

        expect(mockClose).toHaveBeenCalled();
    });
});
