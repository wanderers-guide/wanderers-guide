#!/usr/bin/env python3
"""Read Wanderer’s Guide Discord context with the existing local bot credential."""
import argparse
import json
from pathlib import Path
import sys
import urllib.error
import urllib.request

GUILD_ID = "735260060682289254"
API = "https://discord.com/api/v10"


def read_token():
    """Load just the Discord credential without logging the environment file."""
    path = Path(__file__).resolve().parents[2] / ".env"
    for line in path.read_text().splitlines():
        key, sep, value = line.partition("=")
        if sep and key.strip() == "DISCORD_TOKEN":
            token = value.strip().strip('"').strip("'")
            if token:
                return token
    raise ValueError("DISCORD_TOKEN is missing from the repository .env")


def get(path, token):
    """GET one Discord resource; report status codes without leaking credentials."""
    request = urllib.request.Request(API + path, headers={
        "Authorization": "Bot " + token,
        "User-Agent": "WanderersGuideReadOnly/1.0",
    })
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        raise RuntimeError(f"Discord GET failed: HTTP {error.code}") from None
    except urllib.error.URLError:
        raise RuntimeError("Unable to connect to Discord") from None


def main():
    """List server channels/active threads, or read a bounded page of messages."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["channels", "threads", "messages"])
    parser.add_argument("channel_id", nargs="?")
    parser.add_argument("--limit", type=int, default=20)
    args = parser.parse_args()
    if not 1 <= args.limit <= 100:
        parser.error("--limit must be between 1 and 100")
    token = read_token()
    if args.action == "channels":
        data = [{key: row.get(key) for key in ("id", "name", "type", "parent_id")}
                for row in get(f"/guilds/{GUILD_ID}/channels", token)]
    elif args.action == "threads":
        data = get(f"/guilds/{GUILD_ID}/threads/active", token)
    else:
        if not args.channel_id or not args.channel_id.isdecimal():
            parser.error("messages requires a numeric channel or thread ID")
        channel = get(f"/channels/{args.channel_id}", token)
        if channel.get("guild_id") != GUILD_ID:
            raise ValueError("Channel is outside the Wanderer’s Guide server")
        data = get(f"/channels/{args.channel_id}/messages?limit={args.limit}", token)
    print(json.dumps(data, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, RuntimeError) as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
