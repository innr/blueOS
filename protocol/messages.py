"""Versioned JSON control messages for audiobook transfer protocol v1."""
import json
import re
from uuid import UUID

PROTOCOL_VERSION = 1
MESSAGE_TYPES = {'hello', 'book_manifest', 'start_chunk', 'chunk_ack', 'finish', 'progress', 'delete'}
SHA256 = re.compile(r'^[0-9a-f]{64}$')

class ProtocolError(ValueError):
    pass

def _require_string(message, key):
    value = message.get(key)
    if not isinstance(value, str) or not value:
        raise ProtocolError(f'{key} must be a non-empty string')
    return value

def _require_int(message, key, minimum=0):
    value = message.get(key)
    if isinstance(value, bool) or not isinstance(value, int) or value < minimum:
        raise ProtocolError(f'{key} must be an integer >= {minimum}')
    return value

def validate_message(message):
    if not isinstance(message, dict):
        raise ProtocolError('message must be an object')
    if message.get('protocolVersion') != PROTOCOL_VERSION:
        raise ProtocolError('unsupported protocolVersion')
    _require_string(message, 'requestId')
    message_type = _require_string(message, 'type')
    if message_type not in MESSAGE_TYPES:
        raise ProtocolError('unsupported message type')

    if message_type == 'hello':
        _require_string(message, 'deviceId')
    elif message_type == 'book_manifest':
        _require_string(message, 'bookId')
        if not isinstance(message.get('chapters'), list):
            raise ProtocolError('chapters must be a list')
    elif message_type == 'start_chunk':
        _require_string(message, 'chapterId')
        _require_int(message, 'index')
        _require_int(message, 'length')
        if not isinstance(message.get('checksum'), str) or not SHA256.fullmatch(message['checksum']):
            raise ProtocolError('checksum must be a lowercase SHA-256 hex digest')
    elif message_type == 'chunk_ack':
        _require_string(message, 'chapterId')
        _require_int(message, 'index')
    elif message_type == 'finish':
        _require_string(message, 'chapterId')
        if not isinstance(message.get('checksum'), str) or not SHA256.fullmatch(message['checksum']):
            raise ProtocolError('checksum must be a lowercase SHA-256 hex digest')
    elif message_type == 'progress':
        _require_string(message, 'chapterId')
        _require_int(message, 'positionMs')
    elif message_type == 'delete':
        _require_string(message, 'chapterId')
    return message

def encode_message(message):
    return json.dumps(validate_message(message), ensure_ascii=False, separators=(',', ':'), sort_keys=True)

def decode_message(payload):
    if not isinstance(payload, (str, bytes, bytearray)):
        raise ProtocolError('payload must be JSON text')
    try:
        return validate_message(json.loads(payload))
    except (json.JSONDecodeError, UnicodeDecodeError) as error:
        raise ProtocolError('invalid JSON payload') from error
