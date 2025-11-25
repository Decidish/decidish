## Rewe API Client SSL Configuration Guide

This guide explains how the SSL/mTLS configuration in your application.yml works and how to set up your environment to use it securely.

### 1. How the Configuration Works

The configuration uses Spring Boot's Property Placeholder Syntax with default values:

`certificate: "${REWE_CERT_PATH:classpath:certificates/private_test.pem}"`


`${REWE_CERT_PATH}`: This is the primary look-up. Spring first checks if an environment variable named REWE_CERT_PATH exists.

`:classpath:certificates/private_test.pem`: This is the fallback (default) value. If the environment variable is not set, Spring looks for a file named private_test.pem inside the certificates folder within your application's classpath (resources).

### 2. Local Development Setup (The "Default" Path)

To make this work locally in your IDE (IntelliJ, Eclipse, VS Code), you must ensure the certificate files exist in the correct resource folder.

Required Directory Structure:

```
src/
└── main/
└── resources/
    ├── application.yml
    └── certificates/            <-- Create this folder
        ├── private_test.pem     <-- Paste your certificate here
        └── private_test.key     <-- Paste your private key here
```


Create folder: src/main/resources/certificates.

Copy files: Place your .pem and .key files there.

Run: Start the application. Spring will use the default classpath: paths automatically.

### 3. Production / Docker Setup (The "Override" Path)

NEVER build your production Docker image with the test certificates inside. Instead, use the environment variables to point

# NEVER PUSH THE CERTIFICATE OR API KEY!!!!!