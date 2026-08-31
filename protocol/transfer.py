import hashlib
from dataclasses import dataclass

class TransferError(Exception):
    pass

@dataclass
class _Partial:
    data: bytearray
    next_index: int = 0

class VirtualTransferEndpoint:
    """Deterministic watch-side simulator for resumable chunk transfer."""
    def __init__(self, chunk_size: int = 64):
        if chunk_size <= 0:
            raise ValueError("chunk_size must be positive")
        self.chunk_size = chunk_size
        self._files = {}
        self._partial = {}

    def start(self, chapter_id: str, total_bytes: int, checksum: str):
        if total_bytes < 0:
            raise ValueError("total_bytes must be non-negative")
        self._partial[chapter_id] = _Partial(bytearray())
        return {"chapterId": chapter_id, "nextIndex": 0, "totalBytes": total_bytes, "checksum": checksum}

    def send_chunk(self, chapter_id: str, index: int, payload: bytes, checksum: str):
        state = self._partial.get(chapter_id)
        if state is None:
            raise TransferError("TRANSFER_NOT_STARTED")
        if index < state.next_index:
            return {"ack": index, "duplicate": True}
        if index != state.next_index:
            raise TransferError("CHUNK_OUT_OF_ORDER")
        if hashlib.sha256(payload).hexdigest() != checksum:
            raise TransferError("CHUNK_CHECKSUM_MISMATCH")
        state.data.extend(payload)
        state.next_index += 1
        return {"ack": index, "duplicate": False}

    def finish(self, chapter_id: str, checksum: str):
        state = self._partial.get(chapter_id)
        if state is None:
            raise TransferError("TRANSFER_NOT_STARTED")
        data = bytes(state.data)
        if hashlib.sha256(data).hexdigest() != checksum:
            raise TransferError("FILE_CHECKSUM_MISMATCH")
        self._files[chapter_id] = data
        del self._partial[chapter_id]
        return {"chapterId": chapter_id, "bytes": len(data), "status": "COMPLETE"}

    def resume_index(self, chapter_id: str) -> int:
        state = self._partial.get(chapter_id)
        return 0 if state is None else state.next_index

    def read(self, chapter_id: str) -> bytes:
        return self._files[chapter_id]
