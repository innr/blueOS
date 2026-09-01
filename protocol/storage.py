"""Safe watch-side media repository used by the platform adapter."""
import hashlib
import os
from pathlib import Path


class MediaError(Exception):
    pass


class MediaRepository:
    SUPPORTED_EXTENSIONS = {'.mp3'}

    def __init__(self, root, capacity_bytes):
        self.root = Path(root)
        self.temp = self.root / '.partial'
        self.root.mkdir(parents=True, exist_ok=True)
        self.temp.mkdir(parents=True, exist_ok=True)
        self.capacity_bytes = capacity_bytes

    def _used_bytes(self):
        return sum(path.stat().st_size for path in self.root.rglob('*') if path.is_file())

    def start(self, chapter_id, filename, total_bytes):
        if total_bytes < 0:
            raise MediaError('INVALID_SIZE')
        if Path(filename).suffix.lower() not in self.SUPPORTED_EXTENSIONS:
            raise MediaError('UNSUPPORTED_FORMAT')
        if self._used_bytes() + total_bytes > self.capacity_bytes:
            raise MediaError('INSUFFICIENT_SPACE')
        path = self.temp / f'{chapter_id}.part'
        path.write_bytes(b'')
        return path

    def append(self, chapter_id, payload):
        path = self.temp / f'{chapter_id}.part'
        if not path.exists():
            raise MediaError('TRANSFER_NOT_STARTED')
        with path.open('ab') as stream:
            stream.write(payload)

    def finish(self, chapter_id, checksum):
        source = self.temp / f'{chapter_id}.part'
        if not source.exists():
            raise MediaError('TRANSFER_NOT_STARTED')
        digest = hashlib.sha256(source.read_bytes()).hexdigest()
        if digest != checksum:
            raise MediaError('FILE_CHECKSUM_MISMATCH')
        final = self.root / f'{chapter_id}.mp3'
        os.replace(source, final)
        return final

    def delete(self, chapter_id):
        removed = False
        for path in (self.root / f'{chapter_id}.mp3', self.temp / f'{chapter_id}.part'):
            if path.exists():
                path.unlink()
                removed = True
        return removed

    def has_complete(self, chapter_id):
        return (self.root / f'{chapter_id}.mp3').is_file()
