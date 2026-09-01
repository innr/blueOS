import unittest

from protocol import BleTransportAdapter, TransportError, TransportState


class FakeBleBackend:
    def __init__(self):
        self.connect_attempts = 0
        self.failed_once = True

    def discover(self, timeout_ms):
        return ['watch-1']

    def connect(self, device_id):
        self.connect_attempts += 1
        if self.connect_attempts == 1:
            raise TimeoutError()

    def disconnect(self):
        pass

    def send_chunk(self, chapter_id, index, payload):
        if self.failed_once and index == 1:
            self.failed_once = False
            raise TimeoutError()
        return index


class BleAdapterTests(unittest.TestCase):
    def test_discover_connect_and_resume_transfer(self):
        adapter = BleTransportAdapter(FakeBleBackend(), max_retries=1)
        self.assertEqual(adapter.discover(), ['watch-1'])
        adapter.connect('watch-1')
        self.assertEqual(adapter.transfer('chapter-1', [b'a', b'b']), 2)
        self.assertEqual(adapter.state, TransportState.CONNECTED)

    def test_transfer_requires_connection(self):
        with self.assertRaisesRegex(TransportError, 'NOT_CONNECTED'):
            BleTransportAdapter(FakeBleBackend()).transfer('chapter-1', [b'a'])
