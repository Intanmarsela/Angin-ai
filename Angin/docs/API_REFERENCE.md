# Angin API Reference

**Version:** 1.0.0  
**Base URL:** `http://localhost:8000` (development)  
**Protocol:** HTTP/HTTPS  
**Content Types:** `application/json`, `multipart/form-data`, `audio/mpeg`

---

## Table of Contents

1. [Authentication](#authentication)
2. [Core Endpoints](#core-endpoints)
   - [POST /angin/call](#post-angincall)
   - [POST /angin/call-json](#post-angincall-json)
   - [POST /angin/turn](#post-anginturn)
3. [Utility Endpoints](#utility-endpoints)
   - [GET /speak](#get-speak)
   - [POST /analyze](#post-analyze)
   - [GET /health](#get-health)
4. [Data Models](#data-models)
5. [Error Handling](#error-handling)
6. [Rate Limits](#rate-limits)

---

## Authentication

Currently, the API does not require authentication. All endpoints are publicly accessible.

**Production Considerations:**
- Implement API key authentication
- Add rate limiting per client
- Use HTTPS for all requests

---

## Core Endpoints

### POST /angin/call

**Complete audio-to-audio therapy flow**

Processes user audio through the full pipeline: transcription → therapy agent → text-to-speech. Returns audio response with metadata in headers.

#### Request

**Content-Type:** `multipart/form-data`

**Parameters:**

| Field | Type | Required | Description |
|-------|------|--