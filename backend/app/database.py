"""
Clientes Supabase (público e service-role).
"""

from supabase import create_client, Client
from app.config import settings

_supabase_client: Client | None = None
_supabase_service_client: Client | None = None


def get_supabase_client() -> Client:
    """Retorna o cliente Supabase público (anon key)."""
    global _supabase_client
    if _supabase_client is None:
        _supabase_client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_KEY,
        )
    return _supabase_client


def get_supabase_service_client() -> Client:
    """Retorna o cliente Supabase com service-role key (admin)."""
    global _supabase_service_client
    if _supabase_service_client is None:
        _supabase_service_client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SERVICE_KEY,
        )
    return _supabase_service_client
