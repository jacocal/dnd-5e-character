plugins {
    alias(libs.plugins.kotlinMultiplatform)
    alias(libs.plugins.kotlinSerialization)
    alias(libs.plugins.apollo)
}

apollo {
    service("dnd") {
        packageName.set("org.dndcharacter.shared.graphql")
        // Schema will be downloaded from the running server
        introspection {
            endpointUrl.set("http://localhost:3000/api/graphql")
            schemaFile.set(layout.projectDirectory.file("src/commonMain/graphql/schema.graphqls"))
        }
    }
}

kotlin {
    js(IR) {
        moduleName = "dnd-shared"
        browser()
        binaries.library()
        generateTypeScriptDefinitions()
    }
    
    jvm()

    sourceSets {
        val commonMain by getting {
            dependencies {
                implementation(libs.kotlinx.coroutines.core)
                implementation(libs.kotlinx.serialization.json)
                implementation(libs.apollo.runtime)
            }
        }
        val commonTest by getting {
            dependencies {
                implementation(kotlin("test"))
            }
        }
        val jsMain by getting {
            dependencies {
                // No SQLDelight dependencies needed
            }
        }
        val jvmMain by getting {
            dependencies {
                // No SQLDelight dependencies needed
            }
        }
    }
}


