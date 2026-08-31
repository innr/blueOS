import unittest
from pathlib import Path

from tools.validate_blueos_project import validate


class BlueOSProjectTests(unittest.TestCase):
    def test_project_layout_is_valid(self):
        self.assertEqual(validate(Path(__file__).resolve().parents[1] / "watch"), [])


if __name__ == "__main__":
    unittest.main()
