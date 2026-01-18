import logging
import psycopg2
from psycopg2.extras import RealDictCursor

logger = logging.getLogger(__name__)


class UnitGraph:
    """
    Converts ingredient amounts to grams using unit conversions, density, and piece weights.
    
    Usage:
        normalizer = UnitGraph(db_connection_string)
        grams = normalizer.normalize(2.5, "kg", "flour")
    """
    
    def __init__(self, db_connection_string: str):
        """Initialize the UnitGraph by loading conversion rules from the database."""
        self.global_rules = {}
        self.ingredient_props = {}
        self.alias_map = {}
        self._load_from_db(db_connection_string)
    
    def _load_from_db(self, conn_string: str):
        """Load conversion rules, ingredient properties, and aliases from database."""
        logger.info("Loading UnitGraph from database...")
        
        conn = None
        try:
            conn = psycopg2.connect(conn_string)
            cur = conn.cursor(cursor_factory=RealDictCursor)

            # Load global unit conversions (kg -> g, cup -> ml, etc.)
            cur.execute("SELECT from_unit, to_unit, factor FROM reference_data.unit_conversions")
            for row in cur.fetchall():
                from_unit = row['from_unit'].lower()
                to_unit = row['to_unit'].lower()
                
                if from_unit not in self.global_rules:
                    self.global_rules[from_unit] = {}
                self.global_rules[from_unit][to_unit] = float(row['factor'])

            # Load ingredient properties (density and piece weight)
            cur.execute("SELECT id, density, piece_weight_g FROM reference_data.ingredient_definitions")
            for row in cur.fetchall():
                self.ingredient_props[row['id']] = {
                    'density': float(row['density']) if row['density'] is not None else 1.0,
                    'piece': float(row['piece_weight_g']) if row['piece_weight_g'] is not None else 0.0
                }

            # Load ingredient aliases for name -> ID mapping
            cur.execute("SELECT alias, ingredient_id FROM reference_data.ingredient_aliases")
            for row in cur.fetchall():
                self.alias_map[row['alias'].lower()] = row['ingredient_id']

            cur.close()
            logger.info(f"UnitGraph loaded: {len(self.alias_map)} aliases, {len(self.ingredient_props)} ingredients")

        except Exception as e:
            logger.error(f"Failed to load UnitGraph from database: {e}")
            raise
        finally:
            if conn:
                conn.close()

    def normalize(self, amount: float, unit: str, ingredient_name: str) -> float | None:
        """
        Convert an ingredient amount to grams.
        
        Args:
            amount: The quantity of the ingredient
            unit: The unit of measurement (e.g., "kg", "cup", "stück")
            ingredient_name: The name of the ingredient
            
        Returns:
            The amount in grams, or None if conversion is not possible
        """
        if amount is None or unit is None:
            return None

        unit = unit.lower().strip()
        ingredient = ingredient_name.lower().strip() if ingredient_name else ""

        # Already in grams
        if unit in ['g', 'gramm', 'grams']:
            return amount

        # Get ingredient ID from alias map
        ing_id = self.alias_map.get(ingredient)

        # Handle piece units (stück, piece, etc.)
        if unit in ['stück', 'stk', 'piece', 'stueck', 'stk.']:
            if not ing_id:
                return None
            
            piece_weight = self.ingredient_props.get(ing_id, {}).get('piece', 0.0)
            if piece_weight > 0:
                return amount * piece_weight
            return None

        # Direct mass conversion (kg -> g, etc.)
        if unit in self.global_rules and 'g' in self.global_rules[unit]:
            return amount * self.global_rules[unit]['g']

        # Volume to mass conversion (cup -> ml -> g using density)
        ml_amount = None
        if unit in ['ml', 'milliliter']:
            ml_amount = amount
        elif unit in self.global_rules and 'ml' in self.global_rules[unit]:
            ml_amount = amount * self.global_rules[unit]['ml']
        
        if ml_amount is None:
            return None

        # Apply density (default to 1.0 for water)
        density = self.ingredient_props.get(ing_id, {}).get('density', 1.0) if ing_id else 1.0
        return ml_amount * density