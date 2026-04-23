from slowapi import Limiter
from slowapi.util import get_remote_address

# RF01: Rate Limiting para evitar ataques de fuerza bruta o DDoS
limiter = Limiter(key_func=get_remote_address)
