package decidish.com.core;

import decidish.com.core.model.rewe.*;
import decidish.com.core.repository.MarketRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.test.util.AopTestUtils;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ContextConfiguration
@ExtendWith(SpringExtension.class)
public class MarketRepositoryCachingIntegrationTest {

    private static final Market M1 = new Market(1L,"m1",new Address());
    private static final Market M2 = new Market(2L,"m2",new Address());

    private MarketRepository mock;

    @Autowired
    private MarketRepository marketRepository;

    @EnableCaching
    @Configuration
    public static class CachingTestConfig {

        @Bean
        public MarketRepository marketRepositoryMockImplementation() {
            return mock(MarketRepository.class);
        }

        @Bean
        public CacheManager cacheManager() {
            return new ConcurrentMapCacheManager("markets_id");
        }

    }

    @BeforeEach
    void setUp() {
        mock = AopTestUtils.getTargetObject(marketRepository);

        reset(mock);

        when(mock.findByReweId(eq(2L)))
                .thenReturn(Optional.of(M2));

        when(mock.findByReweId(eq(1L)))
                .thenReturn(Optional.of(M1))
                .thenThrow(new RuntimeException("Market should be cached!"));
    }
    
    @Test
    void givenCachedMarket_whenFindByReweId_thenRepositoryShouldNotBeHit() {
        assertEquals(Optional.of(M1), marketRepository.findByReweId(1L));
        verify(mock).findByReweId(1L);

        assertEquals(Optional.of(M1), marketRepository.findByReweId(1L));
        assertEquals(Optional.of(M1), marketRepository.findByReweId(1L));

        verifyNoMoreInteractions(mock);
    }
    
    @Test
    void givenNotCachedMarket_whenFindByReweId_thenRepositoryShouldBeHit() {
        assertEquals(Optional.of(M2), marketRepository.findByReweId(2L));
        assertEquals(Optional.of(M2), marketRepository.findByReweId(2L));
        assertEquals(Optional.of(M2), marketRepository.findByReweId(2L));

        verify(mock, times(3)).findByReweId(2L);
    }
}