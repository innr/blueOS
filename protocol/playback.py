"""Platform-independent playback state and checkpoint logic."""
from dataclasses import dataclass
from enum import Enum
from typing import Optional


class PlaybackStatus(str, Enum):
    STOPPED = 'STOPPED'
    PLAYING = 'PLAYING'
    PAUSED = 'PAUSED'
    PAUSED_BY_DISCONNECT = 'PAUSED_BY_DISCONNECT'
    ERROR = 'ERROR'


@dataclass
class PlaybackState:
    chapter_id: Optional[str] = None
    position_ms: int = 0
    status: PlaybackStatus = PlaybackStatus.STOPPED
    updated_at: int = 0


class InMemoryProgressRepository:
    def __init__(self):
        self._state = PlaybackState()

    def save(self, state: PlaybackState):
        if state.position_ms < 0:
            raise ValueError('position_ms must be non-negative')
        self._state = PlaybackState(state.chapter_id, state.position_ms, state.status, state.updated_at)

    def load(self):
        return PlaybackState(self._state.chapter_id, self._state.position_ms, self._state.status, self._state.updated_at)


class PlaybackController:
    def __init__(self, progress_repository=None):
        self.repository = progress_repository or InMemoryProgressRepository()
        self.state = self.repository.load()

    def load(self, chapter_id, position_ms=0, updated_at=0):
        self.state = PlaybackState(chapter_id, max(0, position_ms), PlaybackStatus.PAUSED, updated_at)
        self.repository.save(self.state)

    def play(self):
        if not self.state.chapter_id:
            raise ValueError('NO_CHAPTER')
        self.state.status = PlaybackStatus.PLAYING
        self.repository.save(self.state)

    def pause(self):
        self.state.status = PlaybackStatus.PAUSED
        self.repository.save(self.state)

    def stop(self):
        self.state.status = PlaybackStatus.STOPPED
        self.state.position_ms = 0
        self.repository.save(self.state)

    def seek(self, position_ms):
        self.state.position_ms = max(0, position_ms)
        self.repository.save(self.state)

    def disconnect(self):
        if self.state.status == PlaybackStatus.PLAYING:
            self.state.status = PlaybackStatus.PAUSED_BY_DISCONNECT
            self.repository.save(self.state)

    def reconnect(self):
        if self.state.status == PlaybackStatus.PAUSED_BY_DISCONNECT:
            self.state.status = PlaybackStatus.PAUSED
            self.repository.save(self.state)

    def complete(self):
        self.state.status = PlaybackStatus.STOPPED
        self.state.position_ms = 0
        self.repository.save(self.state)
