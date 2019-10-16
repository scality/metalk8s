import argparse
import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import re


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
            result_str = json.dumps(result) + '\n'
            self.wfile.write(result_str.encode('utf-8'))

        return
    return wrapped


class BaseHandler(BaseHTTPRequestHandler):
    HANDLERS = {
        '/error': 'raise_error',
    }

    @json_response
    def do_GET(self):
        handler = getattr(self, self.HANDLERS.get(self.path, ''), None)
        if handler is not None:
            return handler()
        else:
            self.error_404()

    def raise_error(self):
        raise Exception('Something went wrong')

    def error_404(self):
        self.send_response(404)
        self.send_header('Content-Type', 'text/html')
        self.end_headers()
        self.wfile.write(b'<html><h1>Not Found</h1></html>\n')

    def error_500(self, exception):
        self.send_response(500)
        self.send_header('Content-Type', 'text/html')
        self.end_headers()
        content = (
            '<html>'
            '<h1>Server Internal Error</h1>'
            '<p>An unexpected error occured: {}</p>'
            '</html>\n'
        ).format(exception)
        self.wfile.write(content.encode('utf-8'))


def _parse_timezone(timezone):
    error_msg = (
        'Invalid timezone (must match format "UTC[±HH:MM])": {}'
    ).format(timezone)
    match = re.match(r'UTC(?:(?P<sign>[\+\-])(?P<value>\d{2}:\d{2}))?',
                     timezone)
    if match is None:
        raise ValueError(error_msg)

    value = match.group('value')
    if value is None:
        hours, minutes = 0, 0
    else:
        hours, _, minutes = value.partition(':')
        try:
            hours = int(hours)
            minutes = int(minutes)
        except ValueError:
            raise ValueError(error_msg)

    offset = datetime.timedelta(hours=hours, minutes=minutes)
    if match.group('sign') == '-':
        offset = -offset

    return datetime.timezone(offset)


def _custom_handler(version=None, timezone=None):
    extra_handlers = {}
    if version is not None:
        extra_handlers['/version'] = 'print_version'
    if timezone is not None:
        extra_handlers['/time'] = 'print_time'

    tzinfo = _parse_timezone(timezone) if timezone is not None else None

    class CustomHandler(BaseHandler):
        HANDLERS = dict(BaseHandler.HANDLERS, **extra_handlers)

        def print_version(self):
            return {'version': version}

        def print_time(self):
            return {'time': datetime.datetime.now(tz=tzinfo).isoformat()}

    return CustomHandler


def run(args):
    address = (args.host, args.port)
    handler = _custom_handler(args.version, args.timezone)
    server = HTTPServer(address, handler)
    server.serve_forever()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        description='Basic HTTP server that can expose a /time route and/or '
                    'a /version route, based on command-line arguments.',
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument('--version', help='string to return on /version')
    parser.add_argument('--clock', dest='timezone',
                        help='timezone to use for /clock')
    parser.add_argument('--host', default='',
                        help='the host to listen on')
    parser.add_argument('--port', default=8080, type=int,
                        help='the port to listen on')

    args = parser.parse_args()
    run(args)
