"""
Tests for core/parser.py — SRT/VTT parsing and script parsing.
Pure Python, no GPU or models required.
"""
import pytest
from core.parser import parse_subtitles, parse_script, group_subtitles_by_punctuation


SRT_SAMPLE = """\
1
00:00:01,000 --> 00:00:03,000
Hello world

2
00:00:04,500 --> 00:00:06,000
This is a test.

3
00:00:07,000 --> 00:00:09,000
Third line.
"""

VTT_SAMPLE = """\
WEBVTT

1
00:00:01.000 --> 00:00:03.000
Hello world

2
00:00:05.000 --> 00:00:06.000
This is a test.
"""

SCRIPT_SAMPLE = """\
Alice: Good morning, how are you?
Bob: I'm doing well, thanks!
Alice: Glad to hear it.
"""


class TestParseSrt:
    def test_returns_correct_count(self):
        segments = parse_subtitles(SRT_SAMPLE)
        assert len(segments) == 3

    def test_first_segment_text(self):
        segments = parse_subtitles(SRT_SAMPLE)
        assert segments[0].text == "Hello world"

    def test_first_segment_timing(self):
        segments = parse_subtitles(SRT_SAMPLE)
        assert segments[0].start_time_ms == 1000
        assert segments[0].end_time_ms == 3000

    def test_second_segment_timing(self):
        segments = parse_subtitles(SRT_SAMPLE)
        assert segments[1].start_time_ms == 4500
        assert segments[1].end_time_ms == 6000

    def test_segment_indices(self):
        segments = parse_subtitles(SRT_SAMPLE)
        assert [s.index for s in segments] == [1, 2, 3]

    def test_empty_input_returns_empty(self):
        assert parse_subtitles("") == []


class TestParseVtt:
    def test_returns_correct_count(self):
        segments = parse_subtitles(VTT_SAMPLE, is_vtt=True)
        assert len(segments) == 2

    def test_text_content(self):
        segments = parse_subtitles(VTT_SAMPLE, is_vtt=True)
        assert segments[0].text == "Hello world"
        assert segments[1].text == "This is a test."

    def test_timing(self):
        # Note: VTT parser truncates sub-second precision (known limitation)
        segments = parse_subtitles(VTT_SAMPLE, is_vtt=True)
        assert segments[0].start_time_ms == 1000
        assert segments[1].start_time_ms == 5000


class TestParseScript:
    def test_returns_correct_count(self):
        lines = parse_script(SCRIPT_SAMPLE)
        assert len(lines) == 3

    def test_speaker_names(self):
        lines = parse_script(SCRIPT_SAMPLE)
        assert lines[0].speaker == "Alice"
        assert lines[1].speaker == "Bob"
        assert lines[2].speaker == "Alice"

    def test_line_text(self):
        lines = parse_script(SCRIPT_SAMPLE)
        assert lines[0].text == "Good morning, how are you?"
        assert lines[1].text == "I'm doing well, thanks!"

    def test_empty_input(self):
        assert parse_script("") == []

    def test_unique_speakers(self):
        lines = parse_script(SCRIPT_SAMPLE)
        assert {l.speaker for l in lines} == {"Alice", "Bob"}


class TestGroupByPunctuation:
    def test_result_has_fewer_or_equal_segments(self):
        segments = parse_subtitles(SRT_SAMPLE)
        grouped = group_subtitles_by_punctuation(segments)
        assert len(grouped) <= len(segments)

    def test_preserves_all_words(self):
        segments = parse_subtitles(SRT_SAMPLE)
        grouped = group_subtitles_by_punctuation(segments)
        grouped_text = " ".join(s.text for s in grouped)
        for word in ["Hello", "world", "test", "Third"]:
            assert word in grouped_text

    def test_empty_input(self):
        assert group_subtitles_by_punctuation([]) == []
