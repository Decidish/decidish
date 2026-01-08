import unittest
import os
import psycopg2
from mlpipeline.ingredient_parser.normalization import UnitGraph

# Connection string to your running Docker DB (exposed on localhost)
DB_DSN = os.getenv("CORE_DATABASE_URL", "postgresql://user:password@localhost:5433/decidish?sslmode=disable")

class TestNormalizationIntegration(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        """
        1. Connect to DB
        2. Insert TEST DATA that doesn't exist in production (Unicorns & Magic)
        """
        try:
            cls.conn = psycopg2.connect(DB_DSN)
            cls.conn.autocommit = True
            cls.cursor = cls.conn.cursor()

            print("--- Seeding Test Data ---")
            
            # A. Add a Test Global Rule: 1 "blob" = 10 "ml"
            cls.cursor.execute("""
                INSERT INTO reference_data.unit_conversions (from_unit, to_unit, factor)
                VALUES ('blob', 'ml', 10)
                ON CONFLICT DO NOTHING;
            """)

            # B. Add a Test Ingredient: "Unicorn Dust" (Density 2.0, Piece 50g)
            cls.cursor.execute("""
                INSERT INTO reference_data.ingredient_definitions (name, density, piece_weight_g)
                VALUES ('unicorn dust', 2.0, 50)
                RETURNING id;
            """)
            cls.unicorn_id = cls.cursor.fetchone()[0]

            # C. Add an Alias: "magic powder" -> "Unicorn Dust"
            cls.cursor.execute(f"""
                INSERT INTO reference_data.ingredient_aliases (alias, ingredient_id)
                VALUES ('magic powder', {cls.unicorn_id});
            """)
            
        except Exception as e:
            print(f"Skipping Integration Test: Could not connect to DB. {e}")
            raise

    @classmethod
    def tearDownClass(cls):
        """Clean up the mess we made"""
        print("\n--- Cleaning Up Test Data ---")
        if hasattr(cls, 'conn'):
            # Delete Alias
            cls.cursor.execute("DELETE FROM reference_data.ingredient_aliases WHERE alias = 'magic powder'")
            # Delete Ingredient
            cls.cursor.execute(f"DELETE FROM reference_data.ingredient_definitions WHERE id = {cls.unicorn_id}")
            # Delete Rule
            cls.cursor.execute("DELETE FROM reference_data.unit_conversions WHERE from_unit = 'blob'")
            
            cls.cursor.close()
            cls.conn.close()

    def setUp(self):
        # Force reload the singleton to pick up the new DB data
        UnitGraph._instance = None
        self.graph = UnitGraph(DB_DSN)

    def test_database_driven_normalization(self):
        """
        Verifies that Python correctly calculates values based on the SQL rows we just inserted.
        """
        # Scenario 1: Global Conversion (Blob -> ML)
        # 5 blobs * 10 = 50 ml. 
        # "Magic Powder" density = 2.0.
        # Result = 100 g.
        result = self.graph.normalize(5, "blob", "magic powder")
        self.assertEqual(result, 100.0, "Failed to combine Global Rule + Density from DB")

        # Scenario 2: Abstract Piece
        # 3 Stück "Magic Powder". Piece weight = 50g.
        # Result = 150 g.
        result = self.graph.normalize(3, "stück", "magic powder")
        self.assertEqual(result, 150.0, "Failed to look up Piece Weight from DB")

        # Scenario 3: Verify Real Seed Data (V2 Migration)
        # 1 kg -> 1000 g (Assuming V2 migration ran)
        result = self.graph.normalize(1, "kg", "any")
        self.assertEqual(result, 1000.0, "Failed to read standard V2 migration data")

if __name__ == '__main__':
    unittest.main()