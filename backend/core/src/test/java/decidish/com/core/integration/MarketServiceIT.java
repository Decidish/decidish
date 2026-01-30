package decidish.com.core.integration;

import decidish.com.core.model.rewe.*;
import decidish.com.core.service.MarketService;

import jakarta.transaction.Transactional;
import decidish.com.core.repository.MarketRepository;
import decidish.com.core.repository.SearchTermMarketRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import org.springframework.test.context.ActiveProfiles; // If you use application-test.properties

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("integration") // Use manual settings
// Use Real Containers (Postgres + Redis)

// @AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
// Useful to skip this test in CI builds
@Transactional
class MarketServiceIT {
	@Autowired
	private MarketService marketService;

	@Autowired
	private MarketRepository marketRepository;

	@Autowired
	private SearchTermMarketRepository searchTermMarketRepository;

	// A real, valid REWE Market ID (e.g., REWE City Munich)
	// You can find this ID in the URL on the rewe website
	private final Long VALID_MARKET_ID = 431022L;
	private final String PLZ = "80995";

	@BeforeEach
	void setup() {
		// Clear DB to ensure we are actually persisting fresh data
		marketRepository.deleteAll();

	}

	@Test
	@DisplayName("LIVE API: Fetch Markets -> Persist to Postgres -> Verify Update")
	void testSearchMarkets_Live() {
		// --- STEP 1: EXECUTE LIVE FETCH ---
		System.out.println("Calling Real REWE API (This may take a few seconds)...");
		List<MarketSummaryDto> markets = marketService.getMarkets(PLZ);

		// --- STEP 2: VERIFY PERSISTENCE ---
		assertNotNull(markets);
		System.out.println("Found " + markets.size() + " markets.");

		// Basic Sanity Checks
		assertFalse(markets.isEmpty(),
				"Real API should return (for this zipcode some have pickup = true) markets (unless searching for '*') returns nothing on Web API");

		MarketSummaryDto firstMarket = markets.get(0);
		System.out.println(
				"   Sample: " + firstMarket.name() + " - " + firstMarket.address().getZipCode()
						+ "cents");

		// assertEquals(firstMarket.getAddress().getZipCode(), PLZ);
		assertNotNull(firstMarket.id(), "Product must have an external ID");
		assertNotNull(firstMarket.name(), "Product must have a name");

		// --- STEP 4: VERIFY IDEMPOTENCY (Update Logic) ---
		System.out.println("Running 2nd Fetch (Should update, not duplicate)...");

		// Call it again
		List<MarketSummaryDto> reUpdatedMarket = marketService.getMarkets(PLZ);

		// Assertions
		assertEquals(markets.size(), reUpdatedMarket.size(),
				"Market count should remain stable (no duplicates created)");

		// Verify DB Row Count
		long dbMarketCount = marketRepository.findAll().size();
		assertEquals(markets.size(), dbMarketCount, "Database rows match in-memory list");
	}

	@Test
	@DisplayName("LIVE API: Fetch Products -> Persist to Postgres -> Verify Update")
	void testGetAllProducts_Live() {
		// --- STEP 1: PRE-CONDITION ---
		// The Service requires the Market to exist in DB before adding products
		Market initialMarket = new Market(VALID_MARKET_ID, "REWE Test Market", new Address());

		marketRepository.save(initialMarket);
		System.out.println("Market " + VALID_MARKET_ID + " seeded in DB.");

		// --- STEP 2: EXECUTE LIVE FETCH ---
		System.out.println("Calling Real REWE API (This may take a few seconds)...");
		Market updatedMarket = marketRepository.findById(VALID_MARKET_ID).orElse(null);

		assertNotNull(updatedMarket, "Market should exist in DB before fetching products");
		updatedMarket = marketService.getAllProductsAPI(updatedMarket);

		// --- STEP 3: VERIFY PERSISTENCE ---
		assertNotNull(updatedMarket);
		List<Product> products = updatedMarket.getProducts();

		System.out.println("Found " + products.size() + " products.");

		// Basic Sanity Checks
		assertFalse(products.isEmpty(),
				"Real API should return products (unless searching for '*') returns nothing on Web API");

		Product firstProduct = products.get(0);
		System.out.println("   Sample: " + firstProduct.getName() + " - " + firstProduct.getPrice() + "cents");

		assertNotNull(firstProduct.getId(), "Product must have an external ID");
		assertNotNull(firstProduct.getName(), "Product must have a name");

		// --- STEP 4: VERIFY IDEMPOTENCY (Update Logic) ---
		System.out.println("Running 2nd Fetch (Should update, not duplicate)...");

		Market reUpdatedMarket = marketRepository.findById(VALID_MARKET_ID).orElse(null);

		assertNotNull(reUpdatedMarket, "Market should exist in DB before re-fetching products");

		// Call it again
		reUpdatedMarket = marketService.getAllProductsAPI(reUpdatedMarket);

		// Assertions
		assertEquals(products.size(), reUpdatedMarket.getProducts().size(),
				"Product count should remain stable (no duplicates created)");

		// Verify DB Row Count
		long dbProductCount = marketRepository.findById(VALID_MARKET_ID).get().getProducts().size();
		assertEquals(products.size(), dbProductCount, "Database rows match in-memory list");
	}

	@Test
	@DisplayName("LIVE API: Fetch Products with Query -> Persist to Postgres -> Verify Update")
	void testGetProductsWithQuery_Live() {
		// --- STEP 1: PRE-CONDITION ---

		// The Service requires the Market to exist in DB before adding products
		Market initialMarket = new Market(VALID_MARKET_ID, "REWE Test Market", new Address());
		marketRepository.save(initialMarket);
		System.out.println("Market " + VALID_MARKET_ID + " seeded in DB.");
		String query = "Apfel";

		// --- STEP 2: EXECUTE LIVE FETCH ---
		System.out.println("Calling Real REWE API (This may take a few seconds)...");
		Market updatedMarket = marketService.getProductsQuerySave(VALID_MARKET_ID, query);

		// --- STEP 3: VERIFY PERSISTENCE ---
		assertNotNull(updatedMarket);
		List<Product> products = updatedMarket.getProducts();

		// Check number of products is less or equal to 250 (default page size)
		assertTrue(products.size() <= 250,
				"Product count should be less or equal to 250 for query '" + query + "'");
		System.out.println("Found " + products.size() + " products for query '" + query + "'.");

		// Basic Sanity Checks
		assertFalse(products.isEmpty(), "Real API should return products for query '" + query + "'");
		Product firstProduct = products.get(0);
		System.out.println("   Sample: " + firstProduct.getName() + " - " + firstProduct.getPrice() + " cents");
		assertNotNull(firstProduct.getId(), "Product must have an external ID");
		assertNotNull(firstProduct.getName(), "Product must have a name");

		// --- STEP 4: VERIFY IDEMPOTENCY (Update Logic) ---
		System.out.println("Running 2nd Fetch (Should update, not duplicate)...");

		// Call it again
		Market reUpdatedMarket = marketService.getProductsQuerySave(VALID_MARKET_ID, query);

		// Assertions
		assertEquals(products.size(), reUpdatedMarket.getProducts().size(),
				"Product count should remain stable (no duplicates created)");

		// Verify DB Row Count
		long dbProductCount = marketRepository.findById(VALID_MARKET_ID).get().getProducts().size();
		assertEquals(products.size(), dbProductCount, "Database rows match in-memory list");
	}

	@Test
	@DisplayName("Association Cleanup: Stale/Zombie markets should be removed from search term")
	void testSearchTermCleanup_ZombieRemoval() {
		// 1. SETUP: Create a 'Zombie' Association
		// This simulates a market that used to be returned for '80995' but is no longer
		// valid.

		// Create Zombie Market
		Long zombieId = 999999L;
		Market zombieMarket = new Market();
		zombieMarket.setId(zombieId);
		zombieMarket.setName("Zombie Market - Should be Removed");
		zombieMarket.setAddress(new Address()); // address is mandatory usually
		marketRepository.save(zombieMarket);

		// Link Zombie to our PLZ (80995)
		SearchTermMarketId zombieLinkId = new SearchTermMarketId(PLZ, zombieId);
		SearchTermMarket zombieLink = new SearchTermMarket(zombieLinkId, zombieMarket,
				java.time.LocalDateTime.now());
		searchTermMarketRepository.save(zombieLink);

		// Verify Setup
		assertTrue(searchTermMarketRepository.existsById(zombieLinkId),
				"Setup failed: Zombie link should exist before test runs");

		// Act
		List<MarketSummaryDto> results = marketService.getMarkets(PLZ);

		// ASSERT: Verify Zombie is Gone

		// Check 1: The Zombie Market object might still exist in the 'markets' table, we only delete the link
		boolean isZombieStillLinked = searchTermMarketRepository.existsById(zombieLinkId);

		assertFalse(isZombieStillLinked,
				"FAILURE: The obsolete 'Zombie' market is still linked to the search term after refresh!");

		// Check 2: The results should contain real markets, not the zombie
		boolean resultContainsZombie = results.stream().anyMatch(m -> m.id().equals(zombieId));
		assertFalse(resultContainsZombie, "Service returned the zombie market inside the result list");

		// Check 3: New associations should exist
		assertFalse(results.isEmpty(), "Real API should return markets");
		Long firstRealMarketId = results.get(0).id();
		assertTrue(searchTermMarketRepository.existsById(new SearchTermMarketId(PLZ, firstRealMarketId)),
				"New real market should be linked to the search term");

		System.out.println("Success: Zombie link removed, real links added.");
	}
}
