import hashlib
import unittest
from protocol import VirtualTransferEndpoint, TransferError

class TransferTests(unittest.TestCase):
    def test_transfer_and_resume(self):
        data = b"blueos-audiobook-test" * 20
        digest = hashlib.sha256(data).hexdigest()
        ep = VirtualTransferEndpoint(chunk_size=10)
        ep.start("c1", len(data), digest)
        chunks = [data[i:i+10] for i in range(0, len(data), 10)]
        for i, chunk in enumerate(chunks[:2]):
            ep.send_chunk("c1", i, chunk, hashlib.sha256(chunk).hexdigest())
        self.assertEqual(ep.resume_index("c1"), 2)
        ep.send_chunk("c1", 1, chunks[1], hashlib.sha256(chunks[1]).hexdigest())
        for i, chunk in enumerate(chunks[2:], 2):
            ep.send_chunk("c1", i, chunk, hashlib.sha256(chunk).hexdigest())
        self.assertEqual(ep.finish("c1", digest)["status"], "COMPLETE")
        self.assertEqual(ep.read("c1"), data)

    def test_bad_chunk_is_rejected(self):
        ep = VirtualTransferEndpoint()
        ep.start("c1", 1, "unused")
        with self.assertRaisesRegex(TransferError, "CHUNK_CHECKSUM_MISMATCH"):
            ep.send_chunk("c1", 0, b"x", "bad")

    def test_out_of_order_is_rejected(self):
        ep = VirtualTransferEndpoint()
        ep.start("c1", 2, "unused")
        digest = hashlib.sha256(b"x").hexdigest()
        with self.assertRaisesRegex(TransferError, "CHUNK_OUT_OF_ORDER"):
            ep.send_chunk("c1", 1, b"x", digest)

if __name__ == "__main__":
    unittest.main()
