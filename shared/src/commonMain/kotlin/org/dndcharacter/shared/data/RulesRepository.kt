package org.dndcharacter.shared.data

import org.dndcharacter.shared.model.Item
import org.dndcharacter.shared.model.Spell
import org.dndcharacter.shared.model.RuleCondition
import org.dndcharacter.shared.model.RuleResource
import kotlin.js.JsExport

interface RulesRepository {
    suspend fun getItem(id: String): Item?
    suspend fun getSpell(id: String): Spell?
    suspend fun getCondition(id: String): RuleCondition?
    suspend fun getResource(id: String): RuleResource?
    suspend fun getRace(id: String): org.dndcharacter.shared.model.RaceEntry?
    suspend fun getBackground(id: String): org.dndcharacter.shared.model.Background?
    suspend fun getSubclasses(): List<org.dndcharacter.shared.model.Subclass>
    
    suspend fun getClass(id: String): org.dndcharacter.shared.model.RuleClass?
    suspend fun getClassFeatures(classId: String): List<org.dndcharacter.shared.model.RuleClassFeature>
    suspend fun getSubclassFeatures(classId: String, subclassId: String): List<org.dndcharacter.shared.model.RuleClassFeature>
    suspend fun getFeat(id: String): org.dndcharacter.shared.model.RuleFeat?

}
