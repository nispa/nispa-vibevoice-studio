"""
Tests for core/aligner.py — subtitle/script alignment and audio export.
Uses pydub with silent WAV files: no GPU required.
"""
import io
import pytest
from pydub import AudioSegment
from core.aligner import align_subtitles_audio, align_script_audio
from core.parser import SubtitleSegment


def make_wav(duration_ms: int) -> bytes:
    buf = io.BytesIO()
    AudioSegment.silent(duration=duration_ms).export(buf, format="wav")
    return buf.getvalue()


def wav_duration_ms(data: bytes) -> int:
    return len(AudioSegment.from_wav(io.BytesIO(data)))


class TestAlignSubtitles:
    def test_empty_input(self):
        assert align_subtitles_audio([]) == b""

    def test_single_segment(self):
        seg = SubtitleSegment(index=1, start_time_ms=0, end_time_ms=1000, text="Hi")
        result = align_subtitles_audio([(seg, make_wav(500))], output_format="wav")
        assert wav_duration_ms(result) == 500

    def test_gap_between_segments(self):
        # seg1: 0–1000ms (audio 500ms), seg2: 2000ms (audio 500ms)
        # expected total: 2000 + 500 = 2500ms
        seg1 = SubtitleSegment(index=1, start_time_ms=0,    end_time_ms=1000, text="A")
        seg2 = SubtitleSegment(index=2, start_time_ms=2000, end_time_ms=3000, text="B")
        result = align_subtitles_audio(
            [(seg1, make_wav(500)), (seg2, make_wav(500))],
            output_format="wav",
        )
        assert wav_duration_ms(result) == 2500

    def test_shifting_when_audio_overflows_slot(self):
        # seg1: 0–1000ms but audio is 1500ms → seg2 shifts to 1500ms
        # expected total: 1500 + 500 = 2000ms
        seg1 = SubtitleSegment(index=1, start_time_ms=0,    end_time_ms=1000, text="Long")
        seg2 = SubtitleSegment(index=2, start_time_ms=1200, end_time_ms=2000, text="Next")
        result = align_subtitles_audio(
            [(seg1, make_wav(1500)), (seg2, make_wav(500))],
            output_format="wav",
        )
        assert wav_duration_ms(result) == 2000

    def test_no_overlap_between_segments(self):
        # Two segments that would overlap if not shifted
        seg1 = SubtitleSegment(index=1, start_time_ms=0,   end_time_ms=500,  text="A")
        seg2 = SubtitleSegment(index=2, start_time_ms=300, end_time_ms=1000, text="B")
        result = align_subtitles_audio(
            [(seg1, make_wav(800)), (seg2, make_wav(500))],
            output_format="wav",
        )
        # seg2 must start at 800ms (end of seg1 audio), total = 800 + 500 = 1300ms
        assert wav_duration_ms(result) == 1300

    def test_mp3_output_has_content(self):
        # Verifies MP3 export via temp-file path produces non-empty output
        seg = SubtitleSegment(index=1, start_time_ms=0, end_time_ms=2000, text="Test")
        result = align_subtitles_audio([(seg, make_wav(2000))], output_format="mp3")
        assert len(result) > 0
        # MP3 magic bytes: starts with ID3 or 0xFF 0xFB/0xF3/0xF2
        assert result[:3] == b"ID3" or result[0] == 0xFF


class TestAlignScript:
    def test_empty_input(self):
        assert align_script_audio([]) == b""

    def test_single_line(self):
        result = align_script_audio([make_wav(500)], gap_ms=300, output_format="wav")
        # 500ms audio + 300ms gap = 800ms
        assert wav_duration_ms(result) == 800

    def test_two_lines_with_gap(self):
        result = align_script_audio(
            [make_wav(500), make_wav(500)], gap_ms=300, output_format="wav"
        )
        # (500 + 300) * 2 = 1600ms
        assert wav_duration_ms(result) == 1600

    def test_zero_gap(self):
        result = align_script_audio(
            [make_wav(500), make_wav(500)], gap_ms=0, output_format="wav"
        )
        assert wav_duration_ms(result) == 1000
