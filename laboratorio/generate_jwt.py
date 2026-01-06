import hmac
import hashlib
import base64
import json
import time

def base64url_encode(input):
    if isinstance(input, str):
        input = input.encode('utf-8')
    return base64.urlsafe_b64encode(input).decode('utf-8').replace('=', '')

def sign(msg, key):
    return hmac.new(key.encode(), msg.encode(), hashlib.sha256).digest()

def make_token(payload, secret):
    header = {"typ": "JWT", "alg": "HS256"}
    segments = []
    segments.append(base64url_encode(json.dumps(header, separators=(',', ':'))))
    segments.append(base64url_encode(json.dumps(payload, separators=(',', ':'))))
    signing_input = '.'.join(segments)
    signature = sign(signing_input, secret)
    segments.append(base64url_encode(signature))
    return '.'.join(segments)

secret = 'super-secret-jwt-token-with-at-least-32-characters-long'
ts = int(time.time())

anon_payload = {
    "role": "anon",
    "iss": "supabase",
    "iat": ts,
    "exp": ts + (3600 * 24 * 365 * 10), # 10 years
    "ref": "local"
}

service_payload = {
    "role": "service_role",
    "iss": "supabase",
    "iat": ts,
    "exp": ts + (3600 * 24 * 365 * 10), # 10 years
    "ref": "local"
}

anon_key = make_token(anon_payload, secret)
service_key = make_token(service_payload, secret)

print(f"ANON_KEY={anon_key}")
print(f"SERVICE_ROLE_KEY={service_key}")

with open('laboratorio/anon_key.txt', 'w', encoding='utf-8') as f:
    f.write(anon_key)

