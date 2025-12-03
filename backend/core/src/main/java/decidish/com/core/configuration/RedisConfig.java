// package decidish.com.core.configuration;

// import org.springframework.context.annotation.Bean;
// import org.springframework.context.annotation.Configuration;
// import org.springframework.data.redis.connection.RedisConnectionFactory;
// import org.springframework.data.redis.core.RedisTemplate;
// import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
// import org.springframework.data.redis.serializer.StringRedisSerializer;

// @Configuration
// public class RedisConfig {

//     @Bean
//     public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory connectionFactory) {
//         RedisTemplate<String, Object> template = new RedisTemplate<>();
//         template.setConnectionFactory(connectionFactory);
        
//         // Use String for Keys (Readable in redis-cli)
//         template.setKeySerializer(new StringRedisSerializer());
        
//         // Use JSON for Values (So we can store Market objects)
//         template.setValueSerializer(new GenericJackson2JsonRedisSerializer());
        
//         return template;
//     }
// }
