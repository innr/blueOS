"""BLE transport boundary with deterministic retry/resume behavior.

The backend is intentionally injected because BlueOS/BLE API names and
permissions are device-SDK specific. A production adapter implements the
small backend contract documented below.
"""
from enum import Enum


class TransportError(Exception):
    pass


class TransportState(str, Enum):
    DISCONNECTED = 'DISCONNECTED'
    DISCOVERING = 'DISCOVERING'
    CONNECTING = 'CONNECTING'
    CONNECTED = 'CONNECTED'
    TRANSFERRING = 'TRANSFERRING'
    PAUSED_BY_DISCONNECT = 'PAUSED_BY_DISCONNECT'
    ERROR = 'ERROR'


class BleTransportAdapter:
    """Stateful adapter around a backend with discover/connect/send_chunk APIs."""
    def __init__(self, backend, max_retries=2):
        self.backend = backend
        self.max_retries = max(0, max_retries)
        self.state = TransportState.DISCONNECTED
        self.device_id = None

    def discover(self, timeout_ms=5000):
        self.state = TransportState.DISCOVERING
        try:
            devices = self.backend.discover(timeout_ms)
        except Exception as error:
            self.state = TransportState.ERROR
            raise TransportError('DISCOVERY_FAILED') from error
        self.state = TransportState.DISCONNECTED
        return devices

    def connect(self, device_id):
        self.state = TransportState.CONNECTING
        for attempt in range(self.max_retries + 1):
            try:
                self.backend.connect(device_id)
                self.device_id = device_id
                self.state = TransportState.CONNECTED
                return
            except Exception:
                if attempt == self.max_retries:
                    self.state = TransportState.ERROR
                    raise TransportError('CONNECTION_FAILED')

    def disconnect(self):
        try:
            self.backend.disconnect()
        finally:
            self.device_id = None
            self.state = TransportState.DISCONNECTED

    def transfer(self, chapter_id, chunks, start_index=0):
        if self.state not in (TransportState.CONNECTED, TransportState.PAUSED_BY_DISCONNECT):
            raise TransportError('NOT_CONNECTED')
        self.state = TransportState.TRANSFERRING
        index = start_index
        for payload in chunks[start_index:]:
            sent = False
            for attempt in range(self.max_retries + 1):
                try:
                    ack = self.backend.send_chunk(chapter_id, index, payload)
                    if ack != index:
                        raise TransportError('INVALID_ACK')
                    sent = True
                    break
                except (TimeoutError, ConnectionError):
                    if attempt == self.max_retries:
                        self.state = TransportState.PAUSED_BY_DISCONNECT
                        raise TransportError('TRANSFER_INTERRUPTED')
            if not sent:
                self.state = TransportState.ERROR
                raise TransportError('TRANSFER_FAILED')
            index += 1
        self.state = TransportState.CONNECTED
        return index
