import hashlib
import unittest
from protocol import ProtocolError, decode_message, encode_message

class ProtocolMessageTests(unittest.TestCase):
    def message(self, message_type, **fields):
        return {'protocolVersion': 1, 'requestId': 'request-1', 'type': message_type, **fields}

    def test_round_trip_for_each_control_message(self):
        digest = hashlib.sha256(b'audio').hexdigest()
        messages = [
            self.message('hello', deviceId='watch-1'),
            self.message('book_manifest', bookId='book-1', chapters=[]),
            self.message('start_chunk', chapterId='chapter-1', index=0, length=64, checksum=digest),
            self.message('chunk_ack', chapterId='chapter-1', index=0),
            self.message('finish', chapterId='chapter-1', checksum=digest),
            self.message('progress', chapterId='chapter-1', positionMs=15000),
            self.message('delete', chapterId='chapter-1'),
        ]
        for message in messages:
            self.assertEqual(decode_message(encode_message(message)), message)

    def test_invalid_version_and_checksum_are_rejected(self):
        with self.assertRaisesRegex(ProtocolError, 'protocolVersion'):
            encode_message({'protocolVersion': 2, 'requestId': 'a', 'type': 'hello', 'deviceId': 'watch'})
        with self.assertRaisesRegex(ProtocolError, 'checksum'):
            encode_message(self.message('finish', chapterId='chapter-1', checksum='bad'))

    def test_invalid_json_and_missing_fields_are_rejected(self):
        with self.assertRaisesRegex(ProtocolError, 'invalid JSON'):
            decode_message('{not-json}')
        with self.assertRaisesRegex(ProtocolError, 'positionMs'):
            encode_message(self.message('progress', chapterId='chapter-1'))
