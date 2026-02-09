@file:OptIn(kotlin.js.ExperimentalJsExport::class)

package org.dndcharacter.shared


import com.apollographql.apollo.ApolloClient
import kotlinx.coroutines.DelicateCoroutinesApi
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.promise


import org.dndcharacter.shared.data.ApolloCharacterRepository
import org.dndcharacter.shared.data.ApolloRulesRepository
import org.dndcharacter.shared.data.ApolloDmRepository
import org.dndcharacter.shared.ui.viewmodel.CharacterSheetViewModel
import org.dndcharacter.shared.ui.viewmodel.DmDashboardViewModel
import org.dndcharacter.shared.ui.viewmodel.DmItemCreatorViewModel
import kotlin.js.JsExport
import kotlin.js.Promise

@JsExport
object SharedFactory {
    
    // Default API URL - can be overridden
    private var apiUrl: String = "http://localhost:3000/api/graphql"
    
    /**
     * Configure the GraphQL API endpoint URL.
     * Call this before createCharacterSheetViewModel if using a different URL.
     */
    fun setApiUrl(url: String) {
        apiUrl = url
    }
    
    /**
     * Creates a CharacterSheetViewModel backed by the GraphQL API.
     * Returns a JS Promise for easier consumption in Next.js.
     */
    @OptIn(DelicateCoroutinesApi::class)
    fun createCharacterSheetViewModel(): Promise<CharacterSheetViewModel> {
        return GlobalScope.promise {
            println("SharedFactory: Initializing Apollo client connecting to $apiUrl")
            
            val apolloClient = ApolloClient.Builder()
                .serverUrl(apiUrl)
                .build()
            
            val charRepo = ApolloCharacterRepository(apolloClient)
            val rulesRepo = ApolloRulesRepository(apolloClient)
            
            CharacterSheetViewModel(charRepo, rulesRepo)
        }
    }
    
    /**
     * Creates a CharacterSheetViewModel with a custom API URL.
     */
    @OptIn(DelicateCoroutinesApi::class)
    fun createCharacterSheetViewModelWithUrl(graphqlUrl: String): Promise<CharacterSheetViewModel> {
        return GlobalScope.promise {
            val apolloClient = ApolloClient.Builder()
                .serverUrl(graphqlUrl)
                .build()
            
            val charRepo = ApolloCharacterRepository(apolloClient)
            val rulesRepo = ApolloRulesRepository(apolloClient)
            

            CharacterSheetViewModel(charRepo, rulesRepo)
        }
    }

    /**
     * Creates a DmDashboardViewModel with a custom API URL.
     */
    @OptIn(DelicateCoroutinesApi::class)
    fun createDmDashboardViewModelWithUrl(graphqlUrl: String): Promise<DmDashboardViewModel> {
        return GlobalScope.promise {
            val apolloClient = ApolloClient.Builder()
                .serverUrl(graphqlUrl)
                .build()
            
            val dmRepo = ApolloDmRepository(apolloClient)
            
            DmDashboardViewModel(dmRepo)
        }
    }

    /**
     * Creates a DmItemCreatorViewModel with a custom API URL.
     */
    @OptIn(DelicateCoroutinesApi::class)
    fun createDmItemCreatorViewModelWithUrl(graphqlUrl: String): Promise<DmItemCreatorViewModel> {
        return GlobalScope.promise {
            val apolloClient = ApolloClient.Builder()
                .serverUrl(graphqlUrl)
                .build()
            
            val dmRepo = ApolloDmRepository(apolloClient)
            
            DmItemCreatorViewModel(dmRepo)
        }
    }
}
