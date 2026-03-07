import os
import sys
import asyncio

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
sys.path.append(BACKEND_DIR)

from core.tts_provider import tts_engine

async def main():
    text = "Good morning everyone, and welcome to today's weather forecast."
    voice_id = "uk-simon_man"
    
    print(f"Synthesizing text: {text}")
    print(f"Voice ID: {voice_id}")
    
    try:
        wav_bytes = await asyncio.to_thread(
            tts_engine.synthesize, text=text, model_name="VibeVoice-1.5B", voice_id=voice_id
        )
        print(f"Success! audio size: {len(wav_bytes)}")
    except Exception as e:
        print(f"Exception caught! Type: {type(e)}")
        print(f"Exception string: {str(e)}")
        
if __name__ == "__main__":
    asyncio.run(main())
