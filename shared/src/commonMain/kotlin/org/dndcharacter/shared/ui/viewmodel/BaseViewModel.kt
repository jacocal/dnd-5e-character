@file:OptIn(kotlin.js.ExperimentalJsExport::class)

package org.dndcharacter.shared.ui.viewmodel

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlin.js.JsExport

// Abstract base for all ViewModels
@JsExport
abstract class BaseViewModel<S>(initialState: S) {
    // Scope for this ViewModel
    internal val viewModelScope = CoroutineScope(Dispatchers.Main + SupervisorJob())

    private val _state = MutableStateFlow(initialState)
    // Hide StateFlow from JS export as it is not usable there directly
    internal val state: StateFlow<S> = _state.asStateFlow()
    
    // JS Interop: Expose current state value directly
    fun getState(): S {
        return state.value
    }
    
    // JS Interop helper: allow JS to subscribe to state changes easily
    fun watchState(callback: (S) -> Unit): () -> Unit {
        callback(state.value) // Initial emit
        
        val job = viewModelScope.launch {
            state.collect { newState ->
                callback(newState)
            }
        }
        
        return {
            job.cancel()
        }
    }

    protected fun setState(reducer: (S) -> S) {
        _state.value = reducer(_state.value)
    }

    // Cleanup
    open fun onCleared() {
        viewModelScope.cancel()
    }
}
