// // package decidish.com.core.unit;

// // import decidish.com.core.api.rewe.client.ReweApiClient;
// // import decidish.com.core.configuration.ApiClientConfig;
// // import io.minio.GetObjectArgs;
// // import io.minio.MinioClient;
// // import org.junit.jupiter.api.DisplayName;
// // import org.junit.jupiter.api.Tag;
// // import org.junit.jupiter.api.Test;
// // import org.junit.jupiter.api.extension.ExtendWith;
// // import org.mockito.Answers;
// // import org.mockito.InjectMocks;
// // import org.mockito.Mock;
// // import org.mockito.junit.jupiter.MockitoExtension;
// // import org.springframework.boot.ssl.SslBundle;
// // import org.springframework.boot.ssl.SslBundles;
// // import org.springframework.web.client.RestClient;

// // import javax.net.ssl.SSLContext;
// // import java.io.ByteArrayInputStream;
// // import java.io.InputStream;
// // import java.nio.charset.StandardCharsets;

// // import static org.junit.jupiter.api.Assertions.assertNotNull;
// // import static org.junit.jupiter.api.Assertions.assertThrows;
// // import static org.mockito.ArgumentMatchers.any;
// // import static org.mockito.ArgumentMatchers.anyString;
// // import static org.mockito.Mockito.*;

// // @Tag("unit")
// // @ExtendWith(MockitoExtension.class)
// // class ApiClientConfigUT {

// //     @Mock(answer = Answers.RETURNS_DEEP_STUBS)
// //     private RestClient.Builder restClientBuilder;

// //     @Mock
// //     private MinioClient minioClient;

// //     @Mock
// //     private SslBundles sslBundles;

// //     @Mock
// //     private SslBundle sslBundle;

// //     @Mock
// //     private SSLContext sslContext;

// //     @InjectMocks
// //     private ApiClientConfig apiClientConfig;

// //     @Test
// //     @DisplayName("Bean Creation: Should fallback to local SSL bundle if MinIO fails")
// //     void testFallbackToLocalBundle() {
// //         // Arrange
// //         // 1. MinIO Mock throws exception to trigger fallback
// //         try {
// //             when(minioClient.getObject(any(GetObjectArgs.class)))
// //                     .thenThrow(new RuntimeException("MinIO Down"));
// //         } catch (Exception e) {
// //             // Unreachable in mock setup
// //         }

// //         // 2. SSL Bundle Mock
// //         when(sslBundles.getBundle("rewe-client")).thenReturn(sslBundle);
// //         when(sslBundle.createSslContext()).thenReturn(sslContext);

// //         // 3. RestClient Builder Chain Mock
// //         when(restClientBuilder
// //                 .requestFactory(any())
// //                 .baseUrl(anyString())
// //                 .defaultHeader(anyString(), anyString())
// //                 .defaultHeader(anyString(), anyString())
// //                 .defaultHeader(anyString(), anyString())
// //                 .defaultHeader(anyString(), anyString())
// //                 .requestInterceptor(any())
// //                 .requestInterceptor(any())
// //                 .build())
// //                 .thenReturn(mock(RestClient.class));

// //         // Act
// //         ReweApiClient client = apiClientConfig.reweApiClient(restClientBuilder, minioClient, sslBundles);

// //         // Assert
// //         assertNotNull(client);

// //         // Verify Fallback Happened
// //         verify(sslBundles).getBundle("rewe-client");
// //     }

// //     @Test
// //     @DisplayName("Bean Creation: Should throw exception if both MinIO and Local Bundle fail")
// //     void testBothFail() {
// //         // Arrange
// //         try {
// //             when(minioClient.getObject(any(GetObjectArgs.class)))
// //                     .thenThrow(new RuntimeException("MinIO Down"));
// //         } catch (Exception e) {
// //         }

// //         when(sslBundles.getBundle("rewe-client")).thenThrow(new IllegalArgumentException("Bundle not found"));

// //         // Act & Assert
// //         assertThrows(IllegalStateException.class,
// //                 () -> apiClientConfig.reweApiClient(restClientBuilder, minioClient, sslBundles));
// //     }
// // }

// package decidish.com.core.unit;

// import decidish.com.core.api.rewe.client.ReweApiClient;
// import decidish.com.core.configuration.ApiClientConfig;
// import io.minio.GetObjectArgs;
// import io.minio.GetObjectResponse;
// import io.minio.MinioClient;
// import org.junit.jupiter.api.BeforeEach;
// import org.junit.jupiter.api.DisplayName;
// import org.junit.jupiter.api.Test;
// import org.junit.jupiter.api.extension.ExtendWith;
// import org.mockito.Answers;
// import org.mockito.InjectMocks;
// import org.mockito.Mock;
// import org.mockito.junit.jupiter.MockitoExtension;
// import org.springframework.boot.ssl.SslBundle;
// import org.springframework.boot.ssl.SslBundles;
// // import org.springframework.boot.ssl.SslContextBundle;
// import org.springframework.http.client.ClientHttpRequestFactory;
// import org.springframework.test.util.ReflectionTestUtils;
// import org.springframework.web.client.RestClient;

// import javax.net.ssl.SSLContext;
// import java.io.ByteArrayInputStream;
// import java.nio.charset.StandardCharsets;

// import static org.junit.jupiter.api.Assertions.assertNotNull;
// import static org.junit.jupiter.api.Assertions.assertThrows;
// import static org.mockito.ArgumentMatchers.any;
// import static org.mockito.ArgumentMatchers.anyString;
// import static org.mockito.Mockito.*;

// @ExtendWith(MockitoExtension.class)
// class ApiClientConfigUT {

//     @Mock
//     private MinioClient minioClient;

//     @Mock
//     private SslBundles sslBundles;

//     @Mock(answer = Answers.RETURNS_SELF) // Important for Builder chains
//     private RestClient.Builder restClientBuilder;

//     @Mock
//     private RestClient restClient;

//     @InjectMocks
//     private ApiClientConfig apiClientConfig;

//     @BeforeEach
//     void setUp() {
//         ReflectionTestUtils.setField(apiClientConfig, "bucketName", "test-bucket");
//         ReflectionTestUtils.setField(apiClientConfig, "pemFileName", "cert.pem");
//         ReflectionTestUtils.setField(apiClientConfig, "keyFileName", "key.key");

//         // Common Builder Setup
//         lenient().when(restClientBuilder.build()).thenReturn(restClient);
//     }
//     // @Test
//     // @DisplayName("Bean Creation: Should load from MinIO when successful")
//     // void testBeanCreation_MinioSuccess() throws Exception {
//     //     // 1. Arrange: Valid-looking PEM content (Headers are required for Spring to parse as inline content)
//     //     // These don't need to be cryptographically matching for this specific unit test, 
//     //     // just syntactically valid PEM blocks so 'PemContent.load' doesn't treat them as filenames.
//     //     String validCert = "-----BEGIN CERTIFICATE-----\n" +
//     //             "MIIDXTCCAkWgAwIBAgIJALJf6y4Y1r4TMA0GCSqGSIb3DQEBCwUAMEUxCzAJBgNV\n" +
//     //             "BAYTAkFVMRMwEQYDVQQIDApTb21lLVN0YXRlMSEwHwYDVQQKDBhJbnRlcm5ldCBX\n" +
//     //             "aWRnaXRzIFB0eSBMdGQwHhcNMjMwMTEyMDkwMDAwWhcNMzMwMTA5MDkwMDAwWjBF\n" +
//     //             "MQswCQYDVQQGEwJBVTETMBEGA1UECAwKU29tZS1TdGF0ZTEhMB8GA1UECgwYSW50\n" +
//     //             "ZXJuZXQgV2lkZ2l0cyBQdHkgTHRkMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIB\n" +
//     //             "CgKCAQEA6K/2rK+tGv2+8+V7tF+5uJ6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+\n" +
//     //             "5+6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+\n" +
//     //             "5+6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+\n" +
//     //             "5+6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+\n" +
//     //             "5+6+5+6+5+6+5+6+5+6+5+6+5+6+5wIDAQABo1AwtjAdBgNVHQ4EFgQU6K/2rK+t\n" +
//     //             "Gv2+8+V7tF+5uJ6+5+6wHwYDVR0jBBgwFoAU6K/2rK+tGv2+8+V7tF+5uJ6+5+6w\n" +
//     //             "DAYDVR0TBAUwAwEB/zANBgkqhkiG9w0BAQsFAAOCAQEA6K/2rK+tGv2+8+V7tF+5\n" +
//     //             "uJ6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+\n" +
//     //             "5+6+5+6+5+6+5+6+5+6+5+6\n" +
//     //             "-----END CERTIFICATE-----";

//     //     String validKey = "-----BEGIN PRIVATE KEY-----\n" +
//     //             "MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDor/asr60a/b7z\n" +
//     //             "5Xu0X7m4nr7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n\n" +
//     //             "7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n\n" +
//     //             "7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n\n" +
//     //             "7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n\n" +
//     //             "7r7n7r7n7r7n7r7n7r7n7r7nAgMBAAECggEBAOiv9qyvrRr9vvPle7Rfubiuvufu\n" +
//     //             "vufuHp6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+\n" +
//     //             "5+6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+\n" +
//     //             "5+6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+\n" +
//     //             "5+6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+5+6+5+6BAoIB\n" +
//     //             "AQDor/asr60a/b7z5Xu0X7m4nr7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n\n" +
//     //             "7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n\n" +
//     //             "7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n\n" +
//     //             "7r7n7r7n7r7n7r7n7r7n7r7nAoIBAQDor/asr60a/b7z5Xu0X7m4nr7n7r7n7r7n\n" +
//     //             "7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n\n" +
//     //             "7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n\n" +
//     //             "7r7n7r7n7r7n7r7n7r7n7r7nAoIBAQC4r/asr60a/b7z5Xu0X7m4nr7n7r7n7r7n\n" +
//     //             "7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n\n" +
//     //             "7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n\n" +
//     //             "7r7n7r7n7r7n7r7n7r7n7r7nAoIBAQDor/asr60a/b7z5Xu0X7m4nr7n7r7n7r7n\n" +
//     //             "7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n\n" +
//     //             "7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n7r7n\n" +
//     //             "7r7n7r7n7r7n7r7n7r7n7r7n\n" +
//     //             "-----END PRIVATE KEY-----";

//     //     // 2. Setup dynamic answering
//     //     // We use thenAnswer because the code calls getObject twice (once for cert, once for key).
//     //     // We must return a NEW stream each time, containing the correct content type.
//     //     when(minioClient.getObject(any(GetObjectArgs.class))).thenAnswer(invocation -> {
//     //         GetObjectArgs args = invocation.getArgument(0);
//     //         // Based on the filename configured in your ReflectionTestUtils setup
//     //         String content = args.object().endsWith(".key") ? validKey : validCert;
            
//     //         return new GetObjectResponse(
//     //                 null, "bucket", "region", "object",
//     //                 new ByteArrayInputStream(content.getBytes(StandardCharsets.UTF_8))
//     //         );
//     //     });

//     //     // Act
//     //     ReweApiClient client = apiClientConfig.reweApiClient(restClientBuilder, minioClient, sslBundles);

//     //     // Assert
//     //     assertNotNull(client);
//     //     verify(sslBundles, never()).getBundle(anyString());
//     // }

//     // @Test
//     // @DisplayName("Bean Creation: Should load from MinIO when successful")
//     // void testBeanCreation_MinioSuccess() throws Exception {
//     //     // Arrange: MinIO returns valid data
//     //     // We mock the GetObjectResponse which is an InputStream
//     //     GetObjectResponse mockResponse = new GetObjectResponse(
//     //             null, "bucket", "region", "object", 
//     //             new ByteArrayInputStream("dummy-cert-content".getBytes(StandardCharsets.UTF_8))
//     //     );
        
//     //     // Use lenient or specific matching. Since MinIO SDK args are complex, any() is often safer for UTs
//     //     when(minioClient.getObject(any(GetObjectArgs.class))).thenReturn(mockResponse);

//     //     // Act
//     //     ReweApiClient client = apiClientConfig.reweApiClient(restClientBuilder, minioClient, sslBundles);

//     //     // Assert
//     //     assertNotNull(client);
//     //     // Verify we DID NOT use the fallback
//     //     verify(sslBundles, never()).getBundle(anyString());
//     // }

//     @Test
//     @DisplayName("Bean Creation: Should fallback to local SSL bundle if MinIO fails")
//     void testBeanCreation_MinioFail_FallbackSuccess() throws Exception {
//         // Arrange: MinIO throws Exception
//         when(minioClient.getObject(any(GetObjectArgs.class)))
//                 .thenThrow(new RuntimeException("MinIO Down"));

//         // Arrange: Fallback works
//         SslBundle mockBundle = mock(SslBundle.class);
//         // Mock the internal SSL context creation to avoid real crypto errors
//         when(mockBundle.createSslContext()).thenReturn(SSLContext.getDefault());
//         when(sslBundles.getBundle("rewe-client")).thenReturn(mockBundle);

//         // Act
//         ReweApiClient client = apiClientConfig.reweApiClient(restClientBuilder, minioClient, sslBundles);

//         // Assert
//         assertNotNull(client);
//         verify(sslBundles).getBundle("rewe-client"); // Verified fallback was used
//     }

//     @Test
//     @DisplayName("Bean Creation: Should throw exception if both MinIO and Local Bundle fail")
//     void testBeanCreation_BothFail() throws Exception {
//         // Arrange: MinIO fails
//         when(minioClient.getObject(any(GetObjectArgs.class)))
//                 .thenThrow(new RuntimeException("MinIO Down"));

//         // Arrange: Fallback also fails (e.g. config missing)
//         when(sslBundles.getBundle("rewe-client")).thenThrow(new IllegalArgumentException("Bundle not found"));

//         // Act & Assert
//         assertThrows(IllegalStateException.class, () -> 
//             apiClientConfig.reweApiClient(restClientBuilder, minioClient, sslBundles)
//         );
//     }
// }