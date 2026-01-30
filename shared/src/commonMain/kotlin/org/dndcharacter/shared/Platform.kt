@file:OptIn(kotlin.js.ExperimentalJsExport::class)

package org.dndcharacter.shared

import kotlin.js.JsExport

@JsExport
fun getGreeting(): String {
    return "Hello from Kotlin Multiplatform Shared Module!"
}
