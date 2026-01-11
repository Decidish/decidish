// package decidish.com.core.configuration;

// import org.springframework.boot.autoconfigure.cache.RedisCacheManagerBuilderCustomizer;
// import org.springframework.cache.annotation.EnableCaching;
// import org.springframework.context.annotation.Bean;
// import org.springframework.context.annotation.Configuration;
// import org.springframework.data.redis.cache.RedisCacheConfiguration;
// import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
// import org.springframework.data.redis.serializer.RedisSerializationContext;
// import com.fasterxml.jackson.annotation.JsonTypeInfo;
// import com.fasterxml.jackson.databind.ObjectMapper;
// import com.fasterxml.jackson.databind.SerializationFeature;
// import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
// import com.fasterxml.jackson.datatype.hibernate6.Hibernate6Module;
// import com.fasterxml.jackson.databind.DeserializationFeature;
// import com.fasterxml.jackson.annotation.JsonAutoDetect;
// import com.fasterxml.jackson.annotation.PropertyAccessor;

// import java.time.Duration;

// @Configuration
// @EnableCaching
// public class RedisCacheConfig {

//     /**
//      * This defines the default behavior for all caches
//      * AND allows you to override specific caches with different TTLs.
//      */
//     @Bean
//     public RedisCacheManagerBuilderCustomizer redisCacheManagerBuilderCustomizer() {
//         return (builder) -> builder
//             .cacheDefaults(defaultConfig()) // Default for everything else
//             .withCacheConfiguration("markets", 
//                 defaultConfig().entryTtl(Duration.ofDays(30)))
//             .withCacheConfiguration("markets_id", 
//                 defaultConfig().entryTtl(Duration.ofDays(30)))
//             .withCacheConfiguration("market_products", 
//                 defaultConfig().entryTtl(Duration.ofDays(7)));
//     }

//     private RedisCacheConfiguration defaultConfig() {
//         ObjectMapper mapper = new ObjectMapper();
        
//         // Register Java Time
//         mapper.registerModule(new JavaTimeModule());

//         // Register Hibernate Module
//         // Feature.FORCE_LAZY_LOADING = false (Default) ensures we don't 
//         // accidentally trigger DB queries during serialization.
//         Hibernate6Module hibernateModule = new Hibernate6Module();
//         // Optional: If you want to serialize the actual class name of the proxy
//         // hibernateModule.configure(Hibernate6Module.Feature.SERIALIZE_IDENTIFIER_FOR_LAZY_NOT_LOADED_OBJECTS, true);
//         mapper.registerModule(hibernateModule);
//         // mapper.registerModule(new Hibernate5Module().disable(Hibernate5Module.Feature.USE_TRANSIENT_ANNOTATION));
        
//         // Config
//         mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        
//         // Typing (for polymorphic deserialization)
//         mapper.activateDefaultTyping(
//             mapper.getPolymorphicTypeValidator(), 
//             ObjectMapper.DefaultTyping.NON_FINAL, 
//             JsonTypeInfo.As.PROPERTY
//         );

//         mapper.setVisibility(PropertyAccessor.ALL, JsonAutoDetect.Visibility.ANY);
//         mapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
//         GenericJackson2JsonRedisSerializer serializer = new GenericJackson2JsonRedisSerializer(mapper);

//         return RedisCacheConfiguration.defaultCacheConfig()
//             .entryTtl(Duration.ofMinutes(60))
//             .disableCachingNullValues()
//             .serializeValuesWith(RedisSerializationContext.SerializationPair
//                 .fromSerializer(serializer));
//     }
// }