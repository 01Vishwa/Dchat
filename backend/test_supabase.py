import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv("e:/Dchat/backend/.env")

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_KEY")

try:
    print(f"Testing client creation with key: {key[:15]}...")
    client = create_client(url, key)
    print("Client created successfully!")
except Exception as e:
    print(f"Exception: {e}")
