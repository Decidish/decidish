package decidish.com.core.unit;

import decidish.com.core.api.rewe.client.ReweApiClient;
import decidish.com.core.configuration.ApiClientConfig;
import io.minio.GetObjectArgs;
import io.minio.MinioClient;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Answers;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.ssl.SslBundle;
import org.springframework.boot.ssl.SslBundles;
import org.springframework.web.client.RestClient;

import javax.net.ssl.SSLContext;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@Tag("unit")
@ExtendWith(MockitoExtension.class)
class ApiClientConfigUT {

    @Mock(answer = Answers.RETURNS_DEEP_STUBS)
    private RestClient.Builder restClientBuilder;

    @Mock
    private MinioClient minioClient;

    @Mock
    private SslBundles sslBundles;

    @Mock
    private SslBundle sslBundle;

    @Mock
    private SSLContext sslContext;

    @InjectMocks
    private ApiClientConfig apiClientConfig;

    @Test
    @DisplayName("Bean Creation: Should fallback to local SSL bundle if MinIO fails")
    void testFallbackToLocalBundle() {
        // Arrange
        // 1. MinIO Mock throws exception to trigger fallback
        try {
            when(minioClient.getObject(any(GetObjectArgs.class)))
                    .thenThrow(new RuntimeException("MinIO Down"));
        } catch (Exception e) {
            // Unreachable in mock setup
        }

        // 2. SSL Bundle Mock
        when(sslBundles.getBundle("rewe-client")).thenReturn(sslBundle);
        when(sslBundle.createSslContext()).thenReturn(sslContext);

        // 3. RestClient Builder Chain Mock
        when(restClientBuilder
                .requestFactory(any())
                .baseUrl(anyString())
                .defaultHeader(anyString(), anyString())
                .defaultHeader(anyString(), anyString())
                .defaultHeader(anyString(), anyString())
                .defaultHeader(anyString(), anyString())
                .requestInterceptor(any())
                .requestInterceptor(any())
                .build())
                .thenReturn(mock(RestClient.class));

        // Act
        ReweApiClient client = apiClientConfig.reweApiClient(restClientBuilder, minioClient, sslBundles);

        // Assert
        assertNotNull(client);

        // Verify Fallback Happened
        verify(sslBundles).getBundle("rewe-client");
    }

    @Test
    @DisplayName("Bean Creation: Should throw exception if both MinIO and Local Bundle fail")
    void testBothFail() {
        // Arrange
        try {
            when(minioClient.getObject(any(GetObjectArgs.class)))
                    .thenThrow(new RuntimeException("MinIO Down"));
        } catch (Exception e) {
        }

        when(sslBundles.getBundle("rewe-client")).thenThrow(new IllegalArgumentException("Bundle not found"));

        // Act & Assert
        assertThrows(IllegalStateException.class,
                () -> apiClientConfig.reweApiClient(restClientBuilder, minioClient, sslBundles));
    }
}
