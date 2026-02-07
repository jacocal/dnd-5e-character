package org.dndcharacter.shared.ui.viewmodel

// Helper since KMP stdlib might not have this exact overload for Array or we want clean syntax
internal inline fun <reified T> arrayOfNotNull(vararg elements: T?): Array<T> {
    return elements.filterNotNull().toTypedArray()
}
