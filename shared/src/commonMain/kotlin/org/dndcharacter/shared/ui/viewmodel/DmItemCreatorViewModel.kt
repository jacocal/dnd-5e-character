@file:OptIn(kotlin.js.ExperimentalJsExport::class)

package org.dndcharacter.shared.ui.viewmodel

import org.dndcharacter.shared.data.DmRepository
import org.dndcharacter.shared.model.DmItemData
import org.dndcharacter.shared.model.Modifier
import kotlinx.coroutines.launch
import kotlin.js.JsExport

@JsExport
data class DmItemCreatorState(
    val name: String = "",
    val description: String = "",
    val type: String = "Weapon",
    val category: String = "weapon",
    val rarity: String = "Common",
    val costAmount: Int? = null,
    val costCurrency: String = "gp",
    val weightAmount: Double? = null,
    val weightUnit: String = "lb",
    val fixedWeight: Boolean = false,
    val damageDice: String = "",
    val damageType: String = "",
    val properties: Array<String> = emptyArray(),
    val range: String = "",
    val isMagical: Boolean = false,
    val requiresAttunement: Boolean = false,
    val isCursed: Boolean = false,
    val armorClass: Int? = null,
    val strengthRequirement: Int? = null,
    val stealthDisadvantage: Boolean = false,
    val slot: String = "",
    val uses: Int? = null,
    val usesMax: Int? = null,
    val modifiers: Array<Modifier> = emptyArray(),
    val trueName: String = "",
    val shownEffect: String = "",
    val trueEffect: String = "",
    val tags: Array<String> = emptyArray(),
    
    val isSubmitting: Boolean = false,
    val submissionError: String? = null,
    val submissionSuccess: Boolean = false,
    val createdItemId: String? = null
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other == null || this::class != other::class) return false
        other as DmItemCreatorState
        if (name != other.name) return false
        if (description != other.description) return false
        if (type != other.type) return false
        if (category != other.category) return false
        if (rarity != other.rarity) return false
        if (costAmount != other.costAmount) return false
        if (costCurrency != other.costCurrency) return false
        if (weightAmount != other.weightAmount) return false
        if (weightUnit != other.weightUnit) return false
        if (fixedWeight != other.fixedWeight) return false
        if (damageDice != other.damageDice) return false
        if (damageType != other.damageType) return false
        if (!properties.contentEquals(other.properties)) return false
        if (range != other.range) return false
        if (isMagical != other.isMagical) return false
        if (requiresAttunement != other.requiresAttunement) return false
        if (isCursed != other.isCursed) return false
        if (armorClass != other.armorClass) return false
        if (strengthRequirement != other.strengthRequirement) return false
        if (stealthDisadvantage != other.stealthDisadvantage) return false
        if (slot != other.slot) return false
        if (uses != other.uses) return false
        if (usesMax != other.usesMax) return false
        if (!modifiers.contentEquals(other.modifiers)) return false
        if (trueName != other.trueName) return false
        if (shownEffect != other.shownEffect) return false
        if (trueEffect != other.trueEffect) return false
        if (!tags.contentEquals(other.tags)) return false
        if (isSubmitting != other.isSubmitting) return false
        if (submissionError != other.submissionError) return false
        if (submissionSuccess != other.submissionSuccess) return false
        if (createdItemId != other.createdItemId) return false
        return true
    }
    
    override fun hashCode(): Int {
        var result = name.hashCode()
        result = 31 * result + description.hashCode()
        result = 31 * result + type.hashCode()
        result = 31 * result + category.hashCode()
        result = 31 * result + rarity.hashCode()
        result = 31 * result + (costAmount ?: 0)
        result = 31 * result + costCurrency.hashCode()
        result = 31 * result + (weightAmount?.hashCode() ?: 0)
        result = 31 * result + weightUnit.hashCode()
        result = 31 * result + fixedWeight.hashCode()
        result = 31 * result + damageDice.hashCode()
        result = 31 * result + damageType.hashCode()
        result = 31 * result + properties.contentHashCode()
        result = 31 * result + range.hashCode()
        result = 31 * result + isMagical.hashCode()
        result = 31 * result + requiresAttunement.hashCode()
        result = 31 * result + isCursed.hashCode()
        result = 31 * result + (armorClass ?: 0)
        result = 31 * result + (strengthRequirement ?: 0)
        result = 31 * result + (stealthDisadvantage.hashCode())
        result = 31 * result + (slot.hashCode())
        result = 31 * result + (uses ?: 0)
        result = 31 * result + (usesMax ?: 0)
        result = 31 * result + modifiers.contentHashCode()
        result = 31 * result + trueName.hashCode()
        result = 31 * result + shownEffect.hashCode()
        result = 31 * result + trueEffect.hashCode()
        result = 31 * result + tags.contentHashCode()
        result = 31 * result + isSubmitting.hashCode()
        result = 31 * result + (submissionError?.hashCode() ?: 0)
        result = 31 * result + (submissionSuccess.hashCode())
        result = 31 * result + (createdItemId?.hashCode() ?: 0)
        return result
    }
}

@JsExport
class DmItemCreatorViewModel(
    @Suppress("NON_EXPORTABLE_TYPE") private val repository: DmRepository
) : BaseViewModel<DmItemCreatorState>(DmItemCreatorState()) {

    fun updateName(name: String) = setState { it.copy(name = name) }
    fun updateDescription(desc: String) = setState { it.copy(description = desc) }
    fun updateType(type: String) = setState { it.copy(type = type) }
    fun updateCategory(category: String) = setState { it.copy(category = category) }
    fun updateRarity(rarity: String) = setState { it.copy(rarity = rarity) }
    
    fun updateCostAmount(amount: Int?) = setState { it.copy(costAmount = amount) }
    fun updateCostCurrency(currency: String) = setState { it.copy(costCurrency = currency) }
    
    fun updateWeightAmount(amount: Double?) = setState { it.copy(weightAmount = amount) }
    fun updateWeightUnit(unit: String) = setState { it.copy(weightUnit = unit) }
    fun toggleFixedWeight() = setState { it.copy(fixedWeight = !it.fixedWeight) }
    
    fun updateDamageDice(dice: String) = setState { it.copy(damageDice = dice) }
    fun updateDamageType(type: String) = setState { it.copy(damageType = type) }
    fun updateRange(range: String) = setState { it.copy(range = range) }
    fun updateSlot(slot: String) = setState { it.copy(slot = slot) }
    
    fun updateArmorClass(ac: Int?) = setState { it.copy(armorClass = ac) }
    fun updateStrength(str: Int?) = setState { it.copy(strengthRequirement = str) }
    fun updateUses(uses: Int?) = setState { it.copy(uses = uses) }
    fun updateUsesMax(max: Int?) = setState { it.copy(usesMax = max) }

    fun updateTrueName(name: String) = setState { it.copy(trueName = name) }
    fun updateShownEffect(effect: String) = setState { it.copy(shownEffect = effect) }
    fun updateTrueEffect(effect: String) = setState { it.copy(trueEffect = effect) }
    
    // Simple comma-separated tag updates for now
    fun updateTags(tagsString: String) = setState { 
        it.copy(tags = tagsString.split(",").map { t -> t.trim() }.filter { t -> t.isNotEmpty() }.toTypedArray()) 
    }
    
    fun addTag(tag: String) = setState {
        if (!it.tags.contains(tag)) {
            it.copy(tags = it.tags.plus(tag))
        } else it
    }

    fun removeTag(tag: String) = setState {
        it.copy(tags = it.tags.filter { t -> t != tag }.toTypedArray())
    }

    fun toggleMagical() = setState { it.copy(isMagical = !it.isMagical) }
    fun toggleAttunement() = setState { it.copy(requiresAttunement = !it.requiresAttunement) }
    fun toggleCursed() = setState { it.copy(isCursed = !it.isCursed) }
    fun toggleStealthDisadvantage() = setState { it.copy(stealthDisadvantage = !it.stealthDisadvantage) }

    fun addModifier(@Suppress("NON_EXPORTABLE_TYPE") modifier: Modifier) {
        val current = state.value.modifiers
        val newModifiers = current.plus(modifier)
        setState { it.copy(modifiers = newModifiers) }
    }

    fun removeModifier(index: Int) {
        val current = state.value.modifiers.toMutableList()
        if (index in current.indices) {
            current.removeAt(index)
            setState { it.copy(modifiers = current.toTypedArray()) }
        }
    }

    fun submit() {
        val s = state.value
        setState { it.copy(isSubmitting = true, submissionError = null, submissionSuccess = false) }

        viewModelScope.launch {
            try {
                // Construct DmItemData
                val itemData = DmItemData(
                    name = s.name,
                    description = s.description.ifBlank { null },
                    type = s.type,
                    category = s.category,
                    rarity = s.rarity,
                    costAmount = s.costAmount,
                    costCurrency = s.costCurrency,
                    weightAmount = s.weightAmount,
                    weightUnit = s.weightUnit,
                    fixedWeight = s.fixedWeight,
                    damageDice = s.damageDice.ifBlank { null },
                    damageType = s.damageType.ifBlank { null },
                    range = s.range.ifBlank { null },
                    isMagical = s.isMagical,
                    requiresAttunement = s.requiresAttunement,
                    isCursed = s.isCursed,
                    armorClass = s.armorClass,
                    strengthRequirement = s.strengthRequirement,
                    stealthDisadvantage = s.stealthDisadvantage,
                    slot = s.slot.ifBlank { null },
                    uses = s.uses,
                    usesMax = s.usesMax,
                    trueName = s.trueName.ifBlank { null },
                    shownEffect = s.shownEffect.ifBlank { null },
                    trueEffect = s.trueEffect.ifBlank { null },
                    modifiers = if (s.modifiers.isNotEmpty()) s.modifiers else null,
                    properties = if (s.properties.isNotEmpty()) s.properties else null,
                    tags = if (s.tags.isNotEmpty()) s.tags else null
                )

                val result = repository.createGlobalItem(itemData)
                if (result.success) {
                    setState { 
                        it.copy(
                            isSubmitting = false, 
                            submissionSuccess = true, 
                            createdItemId = result.itemId
                         ) 
                    }
                } else {
                    setState { it.copy(isSubmitting = false, submissionError = result.error ?: "Unknown error") }
                }
            } catch (e: Throwable) {
                setState { it.copy(isSubmitting = false, submissionError = e.message ?: "Unknown error") }
            }
        }
    }
    
    fun reset() {
        setState { DmItemCreatorState() }
    }
}
