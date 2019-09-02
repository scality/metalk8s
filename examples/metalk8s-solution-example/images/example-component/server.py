from http.server import HTTPServer, BaseHTTPRequestHandler
import json

from __version__ import __VERSION__


def json_response(handler):
    def wrapped(self):
        try:
            result = handler(self)
        except Exception as exc:
            result = None
            self.error_500(exc)

        if result is not None:
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            result_str = json.dumps(result)
            self.wfile.write(result_str.encode('utf-8'))

        return
    return wrapped


class Handler(BaseHTTPRequestHandler):
    @json_response
    def do_GET(self):
        if self.path == '/version':
            return {'version': __VERSION__}
        if self.path == '/error':
            raise Exception('Some error occured')
        else:
            self.error_404()

    def error_404(self):
        self.send_response(404)
        self.send_header('Content-Type', 'text/html')
        self.end_headers()
        self.wfile.write(b'<html><h1>Not Found</h1></html>')

    def error_500(self, exception):
        self.send_response(500)
        self.send_header('Content-Type', 'text/html')
        self.end_headers()
        content = (
            '<html>'
            '<h1>Server Internal Error</h1>'
            '<p>An unexpected error occured: {}</p>'
            '</html>'
        ).format(exception)
        self.wfile.write(content.encode('utf-8'))


def run(host='', port=8080):
    address = (host, port)
    server = HTTPServer(address, Handler)
    server.serve_forever()


if __name__ == '__main__':
    run()
