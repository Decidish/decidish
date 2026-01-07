import unittest
from unittest.mock import MagicMock, patch
from normalization import UnitGraph

class TestUnitGraph(unittest.TestCase):

    def setUp(self):
        # Reset Singleton before every test to ensure clean state
        UnitGraph._instance = None

    @patch('psycopg2.connect')
    def test_graph_loading_and_logic(self, mock_connect):
        """
        This test simulates the DB response and checks the math logic.
        """
        # --- SETUP MOCK DB ---
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_connect.return_value = mock_conn
        mock_conn.cursor.return_value = mock_cursor

        # Define what the DB returns for each query
        # We use side_effect to return different data for each execute/fetchall call
        
        # Query 1: Global Rules
        global_data = [
            {'from_unit': 'kg', 'to_unit': 'g', 'factor': 1000},
            {'from_unit': 'tsp', 'to_unit': 'ml', 'factor': 5}
        ]
        
        # Query 2: Ingredient Props
        # ID 1=Flour (0.6 density), ID 2=Apple (150g piece)
        props_data = [
            {'id': 1, 'density': 0.6, 'piece_weight_g': 0},
            {'id': 2, 'density': 0.8, 'piece_weight_g': 150}
        ]
        
        # Query 3: Aliases
        alias_data = [
            {'alias': 'mehl', 'ingredient_id': 1},   # Mehl -> Flour
            {'alias': 'apfel', 'ingredient_id': 2},  # Apfel -> Apple
            {'alias': 'apples', 'ingredient_id': 2}
        ]

        # Configure the mock to return these lists when fetchall is called
        mock_cursor.fetchall.side_effect = [global_data, props_data, alias_data]

        # --- INITIALIZE GRAPH ---
        # This triggers the _load_from_db logic using our mock
        graph = UnitGraph("postgres://fake:5432/core_db")

        # Case A: Global Mass (1.5 kg -> 1500 g)
        self.assertEqual(graph.normalize(1.5, "kg", "any"), 1500.0)

        # Case B: Abstract Piece (2 Stück Apfel -> 300 g)
        # It should map "apfel" -> ID 2 -> Piece Weight 150
        self.assertEqual(graph.normalize(2, "stück", "apfel"), 300.0)

        # Case C: Volume Density (10 tsp Mehl -> 30 g)
        # 10 tsp -> 50 ml. "Mehl" -> ID 1 -> Density 0.6. Result: 30g
        self.assertEqual(graph.normalize(10, "tsp", "mehl"), 30.0)

        # Case D: Identity (100 g -> 100 g)
        self.assertEqual(graph.normalize(100, "g", "mehl"), 100.0)

        # Case E: Unknown Ingredient Piece (1 Stück Unknown -> None)
        self.assertIsNone(graph.normalize(1, "stück", "unicorn"))

        # Case F: Unknown Unit (1 Stone -> None)
        self.assertIsNone(graph.normalize(1, "stone", "apfel"))

        # Verify DB was closed properly
        mock_conn.close.assert_called()

    def test_singleton_behavior(self):
        """Ensures we don't reconnect to DB if initialized twice"""
        with patch('psycopg2.connect') as mock_connect:
            # First init
            g1 = UnitGraph("postgres://fake")
            
            # Second init (should return same instance without reloading)
            g2 = UnitGraph("postgres://fake")
            
            self.assertIs(g1, g2)
            # connect should have been called only ONCE
            self.assertEqual(mock_connect.call_count, 1)

if __name__ == '__main__':
    unittest.main()