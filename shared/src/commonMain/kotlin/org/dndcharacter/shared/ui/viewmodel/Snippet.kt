
    // ... (This snippet is just to verify the insertion point for the next tool call if needed, 
    // but I need to insert the helper function at the end of the class or somewhere suitable)
    
    private fun getRageCharges(level: Int): Int {
        return when (level) {
            in 1..2 -> 2
            in 3..5 -> 3
            in 6..11 -> 4
            in 12..16 -> 5
            in 17..19 -> 6
            20 -> 999 // Unlimited
            else -> 0
        }
    }
