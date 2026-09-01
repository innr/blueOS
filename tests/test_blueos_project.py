import json
import unittest
from tools.validate_blueos_project import PROJECT, validate_manifest

class BlueOSProjectTests(unittest.TestCase):
    def setUp(self): self.manifest = json.loads((PROJECT / 'src' / 'manifest.json').read_text(encoding='utf-8'))
    def test_current_manifest_is_valid(self): self.assertEqual(validate_manifest(self.manifest), [])
    def test_entry_must_be_declared(self):
        invalid = {**self.manifest, 'router': {**self.manifest['router'], 'entry': 'pages/Missing'}}
        self.assertIn('router.entry must reference a declared page', validate_manifest(invalid))
    def test_missing_page_is_rejected(self):
        invalid = json.loads(json.dumps(self.manifest)); invalid['router']['pages']['pages/Demo']['component'] = 'missing'
        self.assertTrue(any('missing component page' in error for error in validate_manifest(invalid)))
