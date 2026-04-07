#!/usr/bin/env python3
"""
UP — Servidor HTTPS local · Fase 0
Corre en https://192.168.2.27:8443
"""
import http.server
import ssl
import os

PORT = 8443
DIR  = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIR, **kwargs)

    # Security headers en cada respuesta
    def end_headers(self):
        self.send_header("X-Frame-Options",           "DENY")
        self.send_header("X-Content-Type-Options",    "nosniff")
        self.send_header("Referrer-Policy",           "no-referrer")
        self.send_header("Permissions-Policy",        "camera=(), microphone=(), geolocation=()")
        self.send_header("Content-Security-Policy",
            "default-src 'self'; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src https://fonts.gstatic.com; "
            "script-src 'self' 'unsafe-inline'; "
            "img-src 'self' data:; "
            "connect-src 'self';"
        )
        super().end_headers()

    def log_message(self, format, *args):
        # Log limpio sin ruido
        print(f"[UP] {self.address_string()} — {args[0]} {args[1]}")

httpd = http.server.HTTPServer(("0.0.0.0", PORT), Handler)

ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
ctx.load_cert_chain("cert.pem", "key.pem")
# Solo TLS 1.2+, sin protocolos viejos
ctx.minimum_version = ssl.TLSVersion.TLSv1_2
ctx.set_ciphers("ECDHE+AESGCM:ECDHE+CHACHA20:DHE+AESGCM:!aNULL:!eNULL:!RC4")

httpd.socket = ctx.wrap_socket(httpd.socket, server_side=True)

print(f"\n  UP · servidor HTTPS corriendo")
print(f"  → https://192.168.2.27:{PORT}")
print(f"  → https://localhost:{PORT}")
print(f"\n  Ctrl+C para detener\n")
httpd.serve_forever()
