import unittest
from unittest.mock import MagicMock, patch
import sys
import importlib

class TestIngredientExtractor(unittest.TestCase):
    
    def setUp(self):
        # Un-mock spacy if it was mocked by other tests
        if 'spacy' in sys.modules and isinstance(sys.modules['spacy'], MagicMock):
            del sys.modules['spacy']
            
        # We need to reload the module to ensure we get the REAL class,
        # not a cached Mock from a previous test run.
        if 'mlpipeline.ingredient_parser.extraction' in sys.modules:
            del sys.modules['mlpipeline.ingredient_parser.extraction']

    @patch('spacy.load')
    def test_extraction_helpers(self, mock_spacy_load):
        # 1. Setup Mock NLP before importing
        mock_nlp = MagicMock()
        mock_spacy_load.return_value = mock_nlp
        
        # 2. Import INSIDE the test or after patching
        from mlpipeline.ingredient_parser.extraction import IngredientExtractor
        
        extractor = IngredientExtractor()

        # 3. Test Unit Cleaning
        # This is a pure python function, so it should return a string, not a Mock
        self.assertEqual(extractor._clean_unit_label("Stk."), "stück")
        self.assertEqual(extractor._clean_unit_label("EL"), "tbsp")
        self.assertEqual(extractor._clean_unit_label(None), "piece")

    @patch('spacy.load')
    def test_extract_flow(self, mock_spacy_load):
        # 1. Setup Mock NLP output
        mock_nlp = MagicMock()
        mock_doc = MagicMock()
        
        # Configure the mock doc to return specific entities
        ent_qty = MagicMock(); ent_qty.label_ = "QUANTITY"; ent_qty.text = "2"
        ent_unit = MagicMock(); ent_unit.label_ = "UNIT"; ent_unit.text = "cups"
        ent_food = MagicMock(); ent_food.label_ = "FOOD"; ent_food.text = "Flour"
        
        mock_doc.ents = [ent_qty, ent_unit, ent_food]
        mock_nlp.return_value = mock_doc
        mock_spacy_load.return_value = mock_nlp

        # 2. Import
        from mlpipeline.ingredient_parser.extraction import IngredientExtractor

        extractor = IngredientExtractor()
        result = extractor.extract("2 cups Flour")

        self.assertEqual(result['amount'], 2.0)
        self.assertEqual(result['unit'], "cup")
        self.assertEqual(result['ingredient'], "Flour")

if __name__ == '__main__':
    unittest.main()