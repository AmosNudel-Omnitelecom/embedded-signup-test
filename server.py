#!/usr/bin/env python3
import http.server
import socketserver
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

PORT = 9000

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()
    
    def do_GET(self):
        if self.path == '/api/config':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            config = {
                'businessPortfolioId': os.getenv('BUSINESS_PORTFOLIO_ID', ''),
                'accessToken': os.getenv('ACCESS_TOKEN', ''),
                'facebookAppId': os.getenv('FACEBOOK_APP_ID', ''),
                'facebookConfigId': os.getenv('FACEBOOK_CONFIG_ID', '')
            }
            self.wfile.write(str(config).replace("'", '"').encode())
            return
        return super().do_GET()

os.chdir(os.path.dirname(os.path.abspath(__file__)))

with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
    print(f"Server running at http://localhost:{PORT}/")
    print(f"Open http://localhost:{PORT}/index.html in your browser")
    httpd.serve_forever()