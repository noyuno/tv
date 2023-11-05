from http.server import BaseHTTPRequestHandler, HTTPServer
import json
import asyncio
import sys
import socket
from urllib.parse import urlparse
import os

def makeAPIHandler(sendqueue, logger, token):
    class APIHandler(BaseHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super(APIHandler, self).__init__(*args, **kwargs)

        def header(self):
            self.send_header('content-type', 'text')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()

        def do_GET(self):
            parsed_path = urlparse(self.path).path
            if parsed_path == "/":
                self.send_response(200)
                self.header()
                self.wfile.write('notifyd\nhello'.encode('utf-8'))
            if parsed_path == "/crypt":
                if os.path.exists("/mnt/ssdki3-crypt0/private"):
                    self.send_response(200)
                    self.header()
                    self.wfile.write('200\nnotifyd\nunlocked'.encode('utf-8'))
                else:
                    self.send_response(503)
                    self.header()
                    self.wfile.write('503\nnotifyd\nlocked'.encode('utf-8'))
            else:
                self.send_response(404)
                self.header()
                self.wfile.write('notifyd\n404 not found'.encode('utf-8'))

        def do_POST(self):
            res = { 'status': 0, 'type': 'none', 'message': 'none' }
            got = { }
            try:
                s = self.rfile.read(int(self.headers.get('content-length'))).decode('utf-8')
                got = json.loads(s)
                if got['token'] is not None and got['token'] == token:
                    self.sendqueue.put(got)
                    res = { 'status': 200 }
                else:
                    res = { 'status': 403 }
            except Exception as e:
                res = { 'status': 500 }
                self.logger.exception('APIHandler.do_POST()', stack_info=True)

            self.send_response(res['status'])
            self.header()
            self.wfile.write(json.dumps(res).encode('utf-8'))
    ret = APIHandler
    ret.sendqueue = sendqueue
    ret.logger = logger
    return ret

class API():
    def __init__(self, loop, sendqueue, logger, token):
        self.loop = loop
        self.sendqueue = sendqueue
        self.logger = logger
        self.token = token

    def run(self):
        asyncio.set_event_loop(self.loop)
        handler = makeAPIHandler(self.sendqueue, self.logger, self.token)
        port = 80
        try:
            port = int(os.environ.get('PORT'))
        except:
            pass
        if port is None:
            port = 80
        server = HTTPServer(('', port), handler)
        self.logger.debug('listen api at {0}:{1}'.format(socket.gethostbyname_ex(socket.gethostname()), port))
        server.serve_forever()

