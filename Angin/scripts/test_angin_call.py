#!/usr/bin/env python3
"""
Test script for /angin/call-json endpoint (full therapy flow).
This tests: audio → STT → therapy agent → response (without TTS audio).

Run the FastAPI server first: uvicorn backend.main:app --reload
Then run this script: python scripts/test_angin_call.py
"""

import httpx
import json
from pathlib import Path

# Endpoint URL
URL = "http://localhost:8000/angin/call-json"

def test_angin_call():
    """
    Test the full therapy flow with a fake audio file.
    Note: You'll need a real audio file for actual testing.
    """
    print("Testing /angin/call-json endpoint...")
    print(f"URL: {URL}\n")
    
    # Example conversation history (optional)
    history = [
        {"role": "user", "content": "I've been feeling really anxious lately."},
        {"role": "assistant", "content": "I hear you. Anxiety can feel overwhelming. What's been on your mind?"}
    ]
    
    # For this test, you need an actual audio file
    # Replace with path to a real audio file (mp3, wav, etc.)
    audio_file_path = "test_audio.mp3"
    
    if not Path(audio_file_path).exists():
        print(f"⚠ Audio file not found: {audio_file_path}")
        print("\nTo test this endpoint:")
        print("1. Record a short audio message (mp3, wav, m4a, etc.)")
        print("2. Save it as 'test_audio.mp3' in the scripts folder")
        print("3. Run this script again")
        print("\nOr test with curl:")
        print(f'  curl -X POST "{URL}" \\')
        print('    -F "audio=@your_audio.mp3" \\')
        print('    -F \'history=[{"role":"user","content":"Hello"}]\'')
        return
    
    try:
        # Prepare multipart form data
        with open(audio_file_path, "rb") as audio_file:
            files = {"audio": ("test.mp3", audio_file, "audio/mpeg")}
            data = {
                "summary": "User has been discussing work stress",
                "history": json.dumps(history)
            }
            
            response = httpx.post(URL, files=files, data=data, timeout=60.0)
            response.raise_for_status()
        
        result = response.json()
        
        print("✓ Success! Full therapy flow completed:")
        print("=" * 60)
        print(f"Transcript:    {result['transcript']}")
        print(f"Mood:          {result['mood']}")
        print(f"Urgency:       {result['urgency']}")
        print(f"Strategy:      {result['strategy']}")
        print(f"Next Action:   {result['next_action']}")
        print(f"\nResponse:")
        print(f"  {result['response_text']}")
        print("=" * 60)
        
        print("\nFull JSON:")
        print(json.dumps(result, indent=2))
        
    except FileNotFoundError:
        print(f"✗ Audio file not found: {audio_file_path}")
    except httpx.ConnectError:
        print("✗ Connection failed. Is the FastAPI server running?")
        print("  Start it with: uvicorn backend.main:app --reload")
    except httpx.HTTPStatusError as e:
        print(f"✗ HTTP error: {e.response.status_code}")
        print(f"  {e.response.text}")
    except Exception as e:
        print(f"✗ Error: {e}")

if __name__ == "__main__":
    test_angin_call()
