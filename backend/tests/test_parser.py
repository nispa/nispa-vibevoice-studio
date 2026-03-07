import os
import sys

# Add backend directory to sys.path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
sys.path.append(BACKEND_DIR)

from core.parser import parse_script

test_script = """Speaker1: Good morning everyone, and welcome to today's weather forecast.
Let's start with the general situation across the country. Today we can expect mostly cloudy skies in the north, with light rain in the early afternoon. Temperatures will stay quite cool there, around 15 degrees.
In the central regions, the weather will be a bit better. There will be some clouds in the morning, but the sun should appear later in the day. Temperatures will reach about 20 degrees.
The south will enjoy the warmest weather today. It will be mostly sunny, although a few clouds may appear during the evening. Temperatures there could reach 24 degrees.
Looking ahead to tomorrow, the weather should improve in most areas. The rain in the north will probably stop overnight, and we expect clearer skies by the morning.
That's all for today's forecast. Have a great day, and don't forget your umbrella if you are in the north!"""

print("Testing parser...")
try:
    lines = parse_script(test_script)
    print(f"Parsed {len(lines)} lines")
    for i, line in enumerate(lines):
        print(f"[{i}] {line.speaker} -> {line.text}")
except Exception as e:
    print(f"Exception: {e}")
