"""Loopback-only preview; mounts only the lab, installed runtime and sample."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlsplit, unquote
import argparse

LAB = Path(__file__).resolve().parent

class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        route = unquote(urlsplit(self.path).path)
        if route in ('/sample-model', '/sample-thumbnail'):
            target = self.server.sample if route == '/sample-model' else self.server.thumbnail
        elif route.startswith('/runtime/'):
            target = (self.server.runtime / route.removeprefix('/runtime/')).resolve()
            if not target.is_relative_to(self.server.runtime):
                self.send_error(403); return
        elif route in ('/', '/index.html', '/viewer.js'):
            target = LAB / ('index.html' if route == '/' else route[1:])
        else:
            self.send_error(404); return
        if not target or not target.is_file():
            self.send_error(404); return
        data = target.read_bytes()
        mime = 'text/javascript' if target.suffix in ('.js', '.mjs') else self.guess_type(str(target))
        self.send_response(200)
        self.send_header('Content-Type', mime)
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; connect-src 'self' blob:; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'")
        self.end_headers(); self.wfile.write(data)

    def do_POST(self):
        self.send_error(405, 'This viewer has no upload endpoint.')

    def do_HEAD(self):
        self.send_error(405, 'Only scoped GET requests are supported.')

    def log_message(self, *_):
        pass

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--runtime', type=Path, required=True)
    parser.add_argument('--sample', type=Path)
    parser.add_argument('--thumbnail', type=Path)
    parser.add_argument('--port', type=int, default=8769)
    args = parser.parse_args()
    runtime = args.runtime.resolve()
    for file in ('three/build/three.module.js', '@pixiv/three-vrm/lib/three-vrm.module.js'):
        if not (runtime / file).is_file():
            parser.error(f'Missing installed runtime file: {file}')
    server = ThreadingHTTPServer(('127.0.0.1', args.port), Handler)
    server.runtime = runtime
    server.sample = args.sample.resolve() if args.sample else None
    server.thumbnail = args.thumbnail.resolve() if args.thumbnail else None
    print(f'Local mentor preview ready at http://127.0.0.1:{server.server_port}', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()

if __name__ == '__main__':
    main()
