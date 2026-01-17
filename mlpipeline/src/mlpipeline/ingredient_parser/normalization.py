import logging
import psycopg2
from psycopg2.extras import RealDictCursor

logger = logging.getLogger(__name__)

class UnitGraph:
    _instance = None

    def __new__(cls, db_connection_string=None):
        """
        Singleton Pattern: ensures we only load the heavy graph from the DB 
        once per process, not for every request.
        """
        if cls._instance is None:
            if db_connection_string is None:
                raise ValueError("UnitGraph not initialized. Pass DB connection string on first call.")

            # For testing
            if db_connection_string == "mock":
                return None

            cls._instance = super(UnitGraph, cls).__new__(cls)
            cls._instance._load_from_db(db_connection_string)
        
        return cls._instance

    def _load_from_db(self, conn_string):
        """
        Fetches rules from the CORE database (reference_data schema) 
        and builds the optimized in-memory graph.
        """
        logger.info("Hydrating UnitGraph from Core Database...")
        
        conn = None
        try:
            conn = psycopg2.connect(conn_string)
            # RealDictCursor allows accessing columns by name (row['density'])
            cur = conn.cursor(cursor_factory=RealDictCursor)

            # Load Global Rules (e.g. kg -> g, cup -> ml)
            # These apply to all ingredients.
            self.global_rules = {}
            query_global = "SELECT from_unit, to_unit, factor FROM reference_data.unit_conversions"
            cur.execute(query_global)
            
            for row in cur.fetchall():
                f_unit = row['from_unit'].lower()
                t_unit = row['to_unit'].lower()
                
                if f_unit not in self.global_rules:
                    self.global_rules[f_unit] = {}
                self.global_rules[f_unit][t_unit] = float(row['factor'])

            # Load Ingredient Properties (Density & Piece Weight)
            # ingredient_id -> {density: X, piece: Y}
            self.ingredient_props = {}
            query_props = "SELECT id, density, piece_weight_g FROM reference_data.ingredient_definitions"
            cur.execute(query_props)
            
            for row in cur.fetchall():
                self.ingredient_props[row['id']] = {
                    'density': float(row['density']) if row['density'] is not None else 1.0,
                    'piece': float(row['piece_weight_g']) if row['piece_weight_g'] is not None else 0.0
                }

            # Load Aliases (The O(1) Lookup Map)
            # "weizenmehl" -> ingredient_id
            self.alias_map = {}
            query_aliases = "SELECT alias, ingredient_id FROM reference_data.ingredient_aliases"
            cur.execute(query_aliases)
            
            for row in cur.fetchall():
                self.alias_map[row['alias'].lower()] = row['ingredient_id']

            cur.close()
            logger.info(f"UnitGraph Loaded: {len(self.alias_map)} aliases, {len(self.ingredient_props)} definitions.")

        except Exception as e:
            logger.error(f"Failed to load UnitGraph from DB: {e}")
            raise
        finally:
            if conn:
                conn.close()

    def normalize(self, amount: float, unit: str, ingredient_name: str) -> float | None:
        """
        Main API: Converts input to Grams (g).
        Returns None if conversion is impossible.
        """
        if amount is None or unit is None:
            return None

        # Standardize inputs
        unit = unit.lower().strip()
        ingredient = ingredient_name.lower().strip() if ingredient_name else ""

        # Identity Check (Already grams)
        if unit in ['g', 'gramm', 'grams']:
            return amount

        # Resolve Canonical ID from Alias Map
        # "Puten" -> ID 502
        ing_id = self.alias_map.get(ingredient)

        # Handle Abstract Units (Piece/Stück)
        # Look up weight in properties map using ID
        if unit in ['stück', 'stk', 'piece', 'stueck', 'stk.']:
            if not ing_id:
                return None # Unknown ingredient, can't guess weight
            
            weight = self.ingredient_props.get(ing_id, {}).get('piece', 0.0)
            if weight > 0:
                return amount * weight
            return None # Known ingredient, but no piece weight defined

        # Global Mass Conversions (kg -> g)
        if unit in self.global_rules and 'g' in self.global_rules[unit]:
            return amount * self.global_rules[unit]['g']

        # Volume -> Mass (The Density Path)
        # Convert Unit -> ml, then ml -> g using Density
        
        # Convert to ml
        ml_amount = 0.0
        if unit in ['ml', 'milliliter']:
            ml_amount = amount
        elif unit in self.global_rules and 'ml' in self.global_rules[unit]:
            ml_amount = amount * self.global_rules[unit]['ml']
        else:
            return None # Cannot convert to ml, so cannot convert to g

        # Apply Density (ml -> g)
        density = 1.0 # Default fallback (Water)
        if ing_id:
            # If known, use specific density
            density = self.ingredient_props.get(ing_id, {}).get('density', 1.0)
        
        return ml_amount * density