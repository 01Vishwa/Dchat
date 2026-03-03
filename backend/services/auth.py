"""
Authentication utility for DChat backend.
Validates Supabase JWT tokens and extracts user identity.
Falls back to user_id from request body for service-key authenticated calls (e.g., n8n).
"""

import os
from fastapi import Request, HTTPException
from config import get_supabase


async def get_current_user(request: Request) -> str:
    """
    Extract the authenticated user ID from the request.
    
    Priority:
    1. Authorization: Bearer <JWT> header → validate via Supabase and extract user ID
    2. Falls back to user_id in request body/form (for service-key calls like n8n)
    
    Returns the user_id string.
    Raises HTTPException 401 if no valid authentication is found.
    """
    auth_header = request.headers.get("Authorization", "")
    
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
        
        try:
            supabase = get_supabase()
            user_response = supabase.auth.get_user(token)
            
            if user_response and user_response.user:
                return user_response.user.id
        except Exception as e:
            print(f"JWT validation failed: {e}")
            raise HTTPException(
                status_code=401,
                detail="Invalid or expired authentication token"
            )
    
    # Fallback: check for service key authentication (n8n or server-to-server)
    service_key = os.environ.get("SUPABASE_SERVICE_KEY", "")
    request_key = request.headers.get("X-Service-Key", "")
    
    if service_key and request_key == service_key:
        # Service-key authenticated call — trust the user_id from body
        return None  # Signal to caller to use user_id from request body
    
    raise HTTPException(
        status_code=401,
        detail="Authentication required. Provide a Bearer token or valid service key."
    )
