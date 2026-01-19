import unittest
from unittest.mock import MagicMock
import sys

# Mock dependencies to avoid loading DB or Model
sys.modules['mlpipeline.ingredient_parser.normalization'] = MagicMock()
sys.modules['mlpipeline.ingredient_parser.extraction'] = MagicMock()

from mlpipeline.ingredient_parser.processor import PipelineProcessor

class TestPipelineProcessor(unittest.TestCase):

    def test_process_product(self):
        # Mock ingredient parser and unit graph
        mock_parser = MagicMock()
        mock_graph = MagicMock()
        proc = PipelineProcessor(ingredient_parser=mock_parser, unit_graph=mock_graph)
        # Mock the graph normalization result
        proc.graph.normalize.return_value = 100.0
        
        result = proc.process_product_data(1, "kg", "Apple")
        
        self.assertEqual(result['source'], 'product')
        self.assertEqual(result['normalized'], 100.0)
        proc.graph.normalize.assert_called_with(1.0, "kg", "Apple")

    def test_process_recipe(self):
        # 1. Initialize Processor
        mock_parser = MagicMock()
        mock_graph = MagicMock()
        proc = PipelineProcessor(ingredient_parser=mock_parser, unit_graph=mock_graph)
        proc.graph = MagicMock()
        
        # 2. FORCE replace the extractor with a Mock object we control
        # This fixes the AttributeError because we guarantee it's a mock now.
        proc.extractor = MagicMock()
        
        # 3. Setup Expectations
        proc.extractor.extract.return_value = {
            "amount": 2.0, "unit": "cup", "ingredient": "Flour"
        }
        proc.graph.normalize.return_value = 250.0
        
        # 4. Run Logic
        result = proc.process_recipe_text("2 cups Flour")
        
        # 5. Assertions
        self.assertEqual(result['source'], 'recipe')
        self.assertEqual(result['normalized'], 250.0)
        
        # Verify calls
        proc.extractor.extract.assert_called_with("2 cups Flour")
        proc.graph.normalize.assert_called_with(2.0, "cup", "Flour")

if __name__ == '__main__':
    unittest.main()