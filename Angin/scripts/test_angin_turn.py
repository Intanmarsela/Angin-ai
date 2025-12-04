#!/usr/bin/env python3
"""
Test script for /angin/turn endpoint.
Run the FastAPI server first: uvicorn backend.main:app --reload
Then run this script: python scripts/test_angin_turn.py
"""

import httpx
import json

# Endpoint URL (adjust port if needed)
URL = "http://localhost:8000/angin/turn"

# Test payload with fake conversation history
payload = {
    "summary": "User is feeling stressed about work deadlines and struggling to sleep.",
    "history": [
        {
            "role": "user",
            "content": "I've been so stressed lately. Work is overwhelming and I can't sleep."
        },
        {
            "role": "assistant",
            "content": "That sounds really hard. When everything piles up like that, it's tough to find rest. What's weighing on you most right now?"
        },
        {
            "role": "user",
            "content": "I have this big project due tomorrow and I don't think I can finish it in time."
        }
    ]
}

def test_angin_turn():
    print("Testing /angin/turn endpoint...")
    print(f"URL: {URL}\n")
    
    try:
        response = httpx.post(URL, json=payload, timeout=30.0)
        response.raise_for_status()
        
        data = response.json()
        
        print("✓ Success! Response:")
        print("-" * 60)
        print(f"Mood:        {data['mood']}")
        print(f"Urgency:     {data['urgency']}")
        print(f"Strategy:    {data['strategy']}")
        print(f"Next Action: {data['next_action']}")
        print(f"\nResponse:")
        print(f"  {data['response']}")
        print("-" * 60)
        
        print("\nFull JSON:")
        print(json.dumps(data, indent=2))
        
    except httpx.ConnectError:
        print("✗ Connection failed. Is the FastAPI server running?")
        print("  Start it with: uvicorn backend.main:app --reload")
    except httpx.HTTPStatusError as e:
        print(f"✗ HTTP error: {e.response.status_code}")
        print(f"  {e.response.text}")
    except Exception as e:
        print(f"✗ Error: {e}")

if __name__ == "__main__":
    test_angin_turn()
