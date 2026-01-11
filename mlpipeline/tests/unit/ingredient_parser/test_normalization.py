import unittest
from unittest.mock import MagicMock, patch
from mlpipeline.ingredient_parser.normalization import UnitGraph

class TestUnitGraph(unittest.TestCase):
    def setUp(self):
        UnitGraph._instance = None # Reset Singleton

    @patch('psycopg2.connect')
    def test_normalization_logic(self, mock_connect):
        # 1. Mock DB Data
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_connect.return_value = mock_conn
        mock_conn.cursor.return_value = mock_cursor

        # Mock Return Values: [Global Rules, Ingredient Props, Aliases]
        mock_cursor.fetchall.side_effect = [
            [{'from_unit': 'kg', 'to_unit': 'g', 'factor': 1000}, {'from_unit': 'cup', 'to_unit': 'ml', 'factor': 240}], # Globals
            [{'id': 1, 'density': 0.6, 'piece_weight_g': 0}, {'id': 2, 'density': 1.0, 'piece_weight_g': 150}], # Props (1=Flour, 2=Apple)
            [{'alias': 'mehl', 'ingredient_id': 1}, {'alias': 'apfel', 'ingredient_id': 2}] # Aliases
        ]

        graph = UnitGraph("postgres://mock")

        # 2. Test Scenarios
        
        # Global: 1.5 kg -> 1500 g
        self.assertEqual(graph.normalize(1.5, "kg", "any"), 1500.0)
        
        # Abstract: 2 Stück Apple -> 300 g (ID 2 has piece_weight 150)
        self.assertEqual(graph.normalize(2, "stück", "apfel"), 300.0)
        
        # Density Chain: 1 cup Flour -> 240 ml -> 144 g (Density 0.6)
        self.assertEqual(graph.normalize(1, "cup", "mehl"), 144.0)
        
        # Unknown Ingredient: 1 cup Unknown -> Default density
        self.assertEqual(graph.normalize(1, "cup", "mystery"),240.0)

if __name__ == '__main__':
    unittest.main()