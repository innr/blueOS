import hashlib
import tempfile
import unittest

from protocol import InMemoryProgressRepository, MediaError, MediaRepository, PlaybackController, PlaybackStatus


class PlaybackAndStorageTests(unittest.TestCase):
    def test_playback_checkpoint_and_disconnect_recovery(self):
        repo = InMemoryProgressRepository()
        controller = PlaybackController(repo)
        controller.load('chapter-1')
        controller.play()
        controller.seek(15000)
        controller.disconnect()
        self.assertEqual(repo.load().status, PlaybackStatus.PAUSED_BY_DISCONNECT)
        controller.reconnect()
        self.assertEqual(repo.load().position_ms, 15000)
        self.assertEqual(repo.load().status, PlaybackStatus.PAUSED)

    def test_media_is_not_visible_until_checksum_finishes(self):
        with tempfile.TemporaryDirectory() as directory:
            repository = MediaRepository(directory, capacity_bytes=10)
            repository.start('chapter-1', 'chapter.mp3', 3)
            repository.append('chapter-1', b'abc')
            self.assertFalse(repository.has_complete('chapter-1'))
            with self.assertRaisesRegex(MediaError, 'FILE_CHECKSUM_MISMATCH'):
                repository.finish('chapter-1', 'bad')
            repository.finish('chapter-1', hashlib.sha256(b'abc').hexdigest())
            self.assertTrue(repository.has_complete('chapter-1'))

    def test_media_rejects_format_and_capacity(self):
        with tempfile.TemporaryDirectory() as directory:
            repository = MediaRepository(directory, capacity_bytes=2)
            with self.assertRaisesRegex(MediaError, 'UNSUPPORTED_FORMAT'):
                repository.start('chapter-1', 'chapter.wav', 1)
            with self.assertRaisesRegex(MediaError, 'INSUFFICIENT_SPACE'):
                repository.start('chapter-1', 'chapter.mp3', 3)

