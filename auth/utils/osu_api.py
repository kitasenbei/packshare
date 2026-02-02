"""
osu! API utilities for OAuth and beatmap lookups
"""
import time
import httpx
from typing import Dict, Any, Optional, List
from config import Config


class OsuAPI:
    """Handle osu! OAuth and API interactions"""

    OSU_OAUTH_URL = "https://osu.ppy.sh/oauth/authorize"
    OSU_TOKEN_URL = "https://osu.ppy.sh/oauth/token"
    OSU_API_BASE = "https://osu.ppy.sh/api/v2"

    # Cache for client credentials token
    _client_token: Optional[str] = None
    _client_token_expires_at: float = 0

    @staticmethod
    def get_auth_url(state: Optional[str] = None) -> str:
        """Generate osu! OAuth authorization URL"""
        params = {
            "client_id": Config.OSU_CLIENT_ID,
            "redirect_uri": Config.OSU_REDIRECT_URI,
            "response_type": "code",
            "scope": "public identify",
        }

        if state:
            params["state"] = state

        query_string = "&".join([f"{k}={v}" for k, v in params.items()])
        return f"{OsuAPI.OSU_OAUTH_URL}?{query_string}"

    @staticmethod
    async def _get_client_token() -> Optional[str]:
        """Get a client credentials token for API calls (no user auth needed)"""
        # Return cached token if still valid
        if OsuAPI._client_token and time.time() < OsuAPI._client_token_expires_at - 60:
            return OsuAPI._client_token

        data = {
            "client_id": Config.OSU_CLIENT_ID,
            "client_secret": Config.OSU_CLIENT_SECRET,
            "grant_type": "client_credentials",
            "scope": "public",
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    OsuAPI.OSU_TOKEN_URL,
                    data=data,
                    timeout=10.0
                )

                if response.status_code != 200:
                    print(f"Client token failed: {response.text}")
                    return None

                result = response.json()
                OsuAPI._client_token = result["access_token"]
                OsuAPI._client_token_expires_at = time.time() + result.get("expires_in", 86400)
                return OsuAPI._client_token

            except Exception as e:
                print(f"Error getting client token: {e}")
                return None

    @staticmethod
    async def exchange_code_for_token(code: str) -> Optional[str]:
        """Exchange authorization code for access token"""
        data = {
            "client_id": Config.OSU_CLIENT_ID,
            "client_secret": Config.OSU_CLIENT_SECRET,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": Config.OSU_REDIRECT_URI,
        }

        headers = {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "PackShare/1.0",
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    OsuAPI.OSU_TOKEN_URL,
                    data=data,
                    headers=headers,
                    timeout=10.0
                )

                if response.status_code != 200:
                    print(f"Token exchange failed: {response.text}")
                    return None

                result = response.json()
                return result.get("access_token")

            except Exception as e:
                print(f"Error exchanging code for token: {e}")
                return None

    @staticmethod
    async def get_user_info(access_token: str) -> Optional[Dict[str, Any]]:
        """Get user information from osu! API using access token"""
        headers = {
            "Authorization": f"Bearer {access_token}",
            "User-Agent": "PackShare/1.0",
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{OsuAPI.OSU_API_BASE}/me",
                    headers=headers,
                    timeout=10.0
                )

                if response.status_code != 200:
                    print(f"Failed to get user info: {response.text}")
                    return None

                return response.json()

            except Exception as e:
                print(f"Error getting user info: {e}")
                return None

    @staticmethod
    async def get_beatmapset(beatmapset_id: int) -> Optional[Dict[str, Any]]:
        """
        Fetch beatmapset data with all difficulties from osu! API.

        Args:
            beatmapset_id: The osu! beatmapset ID.

        Returns:
            Dictionary with beatmapset data and mania beatmaps, or None if not found.
        """
        token = await OsuAPI._get_client_token()
        if not token:
            return None

        headers = {
            "Authorization": f"Bearer {token}",
            "User-Agent": "PackShare/1.0",
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{OsuAPI.OSU_API_BASE}/beatmapsets/{beatmapset_id}",
                    headers=headers,
                    timeout=10.0
                )

                if response.status_code == 404:
                    return None

                if response.status_code != 200:
                    print(f"Beatmapset fetch failed: {response.text}")
                    return None

                data = response.json()

                # Filter to only mania beatmaps and extract relevant info
                mania_beatmaps: List[Dict[str, Any]] = []
                for bm in data.get("beatmaps", []):
                    if bm.get("mode") == "mania":
                        mania_beatmaps.append({
                            "beatmap_id": bm["id"],
                            "difficulty_name": bm.get("version", ""),
                            "star_rating": round(bm.get("difficulty_rating", 0), 2),
                            "keys": int(bm.get("cs", 4)),  # CS = key count in mania
                            "bpm": round(bm.get("bpm", 0)),
                            "length_seconds": bm.get("total_length", 0),
                        })

                # Sort by key count then star rating
                mania_beatmaps.sort(key=lambda x: (x["keys"], x["star_rating"]))

                return {
                    "beatmapset_id": data["id"],
                    "artist": data.get("artist", ""),
                    "title": data.get("title", ""),
                    "creator": data.get("creator", ""),
                    "covers": {
                        "cover": data.get("covers", {}).get("cover", ""),
                        "card": data.get("covers", {}).get("card", ""),
                        "list": data.get("covers", {}).get("list", ""),
                    },
                    "beatmaps": mania_beatmaps,
                }

            except Exception as e:
                print(f"Error fetching beatmapset: {e}")
                return None
