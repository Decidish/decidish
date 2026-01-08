import unittest
import os
import psycopg2
from mlpipeline.ingredient_parser.normalization import UnitGraph

DB_DSN = os.getenv(
    "CORE_DATABASE_URL", 
    "postgresql://user:password@localhost:5433/decidish?sslmode=disable"
)

class TestNormalizationIntegration(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        """Seed the Real Database with Test Data"""
        try:
            cls.conn = psycopg2.connect(DB_DSN)
            cls.conn.autocommit = True
            with cls.conn.cursor() as cur:
                # Clean previous runs
                cur.execute("DELETE FROM reference_data.ingredient_aliases WHERE alias = 'magic_dust'")
                cur.execute("DELETE FROM reference_data.ingredient_definitions WHERE name = 'magic_item'")
                
                # Insert Test Ingredient: "Magic Item" (Density 2.0, Piece 50g)
                cur.execute("""
                    INSERT INTO reference_data.ingredient_definitions (name, density, piece_weight_g)
                    VALUES ('magic_item', 2.0, 50)
                    RETURNING id;
                """)
                cls.ing_id = cur.fetchone()[0]

                # Insert Alias
                cur.execute(f"""
                    INSERT INTO reference_data.ingredient_aliases (alias, ingredient_id)
                    VALUES ('magic_dust', {cls.ing_id});
                """)
        except Exception as e:
            print(f"\n[SKIP] DB Integration Test skipped: {e}")
            raise

    @classmethod
    def tearDownClass(cls):
        if hasattr(cls, 'conn'):
            with cls.conn.cursor() as cur:
                cur.execute(f"DELETE FROM reference_data.ingredient_aliases WHERE ingredient_id = {cls.ing_id}")
                cur.execute(f"DELETE FROM reference_data.ingredient_definitions WHERE id = {cls.ing_id}")
            cls.conn.close()

    def setUp(self):
        UnitGraph._instance = None # Force reload from DB
        self.graph = UnitGraph(DB_DSN)

    def test_real_database_lookup(self):
        # 1. Test Abstract (Piece -> Grams)
        # 3 Stück "Magic Dust" -> 3 * 50g = 150g
        res_piece = self.graph.normalize(3, "stück", "magic_dust")
        self.assertEqual(res_piece, 150.0)

        # 2. Test Density (Volume -> Grams)
        # 10 ml "Magic Dust" (Density 2.0) -> 20g
        res_vol = self.graph.normalize(10, "ml", "magic_dust")
        self.assertEqual(res_vol, 20.0)

        # 3. Test Global (Standard Seed Data)
        # 1 kg -> 1000g (Should exist if V2 migration ran)
        res_global = self.graph.normalize(1, "kg", "magic_dust")
        self.assertEqual(res_global, 1000.0)

if __name__ == '__main__':
    unittest.main()