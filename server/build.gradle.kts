plugins {
    alias(libs.plugins.kotlinJvm)
    alias(libs.plugins.kotlinSerialization)
    application
}

kotlin {
    jvmToolchain(21)
}

application {
    mainClass.set("org.dndcharacter.server.ApplicationKt")
}

dependencies {
    implementation(project(":shared"))
    implementation(libs.kotlinx.coroutines.core)
    implementation(libs.kotlinx.serialization.json)

    // Ktor Server
    implementation("io.ktor:ktor-server-core-jvm:3.0.3")
    implementation("io.ktor:ktor-server-netty-jvm:3.0.3")
    implementation("io.ktor:ktor-server-content-negotiation-jvm:3.0.3")
    implementation("io.ktor:ktor-serialization-kotlinx-json-jvm:3.0.3")
    implementation("io.ktor:ktor-server-cors-jvm:3.0.3")

    // Ktor Client (Local LAN Ollama / LM Studio / vLLM + BYOK Cloud LLM gateways)
    implementation("io.ktor:ktor-client-core-jvm:3.0.3")
    implementation("io.ktor:ktor-client-cio-jvm:3.0.3")
    implementation("io.ktor:ktor-client-content-negotiation-jvm:3.0.3")

    // PostgreSQL & Connection Pooling
    implementation("org.postgresql:postgresql:42.7.4")
    implementation("com.zaxxer:HikariCP:6.2.1")
    implementation("ch.qos.logback:logback-classic:1.5.12")

    testImplementation(kotlin("test"))
}
