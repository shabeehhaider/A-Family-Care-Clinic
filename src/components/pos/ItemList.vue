<template>
  <div class="item-list">
    <!-- Section Header -->
    <h3 class="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
      <span class="w-2 h-2 bg-emerald-500 rounded-full"></span>
      {{ title }}
      <span class="text-sm font-normal text-gray-400">({{ items.length }} items)</span>
    </h3>

    <!-- Empty State -->
    <div v-if="items.length === 0" class="text-center py-8 text-gray-400">
      <svg class="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" 
          d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
      <p>No items added yet</p>
    </div>

    <!-- Items List -->
    <div class="space-y-2 max-h-56 overflow-y-auto pr-1">
      <div 
        v-for="(item, index) in items" 
        :key="item.id"
        class="flex items-center justify-between bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors group"
      >
        <!-- Item Info -->
        <div class="flex-1 min-w-0">
          <p class="font-medium text-gray-800 truncate">{{ item.name }}</p>
          <p class="text-sm text-emerald-600 font-semibold">
            Rs. {{ item.price }} × {{ item.quantity }}
          </p>
        </div>

        <!-- Quantity Controls -->
        <div class="flex items-center gap-2 mx-3">
          <button 
            @click="$emit('update-quantity', index, item.quantity - 1)"
            class="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
            :disabled="item.quantity <= 1"
            :class="{ 'opacity-50 cursor-not-allowed': item.quantity <= 1 }"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
            </svg>
          </button>
          
          <span class="w-8 text-center font-semibold text-gray-700">{{ item.quantity }}</span>
          
          <button 
            @click="$emit('update-quantity', index, item.quantity + 1)"
            class="w-7 h-7 rounded-full bg-emerald-100 hover:bg-emerald-200 flex items-center justify-center text-emerald-600 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        <!-- Item Total & Remove -->
        <div class="flex items-center gap-3">
          <span class="font-bold text-gray-800 w-20 text-right">
            Rs. {{ (item.price * item.quantity).toLocaleString() }}
          </span>
          
          <button 
            @click="$emit('remove-item', index)"
            class="w-7 h-7 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center text-red-500 opacity-0 group-hover:opacity-100 transition-all focus:outline-none focus:ring-2 focus:ring-red-500 focus:opacity-100"
            title="Remove item"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * ItemList Component
 * 
 * Displays cart items with quantity controls and remove functionality.
 * Used for both services and medicines in the POS cart.
 * 
 * Props:
 * - items: Array of cart items with { id, name, price, quantity }
 * - title: Section title string
 * 
 * Emits:
 * - remove-item: (index) - Removes item at specified index
 * - update-quantity: (index, newQuantity) - Updates item quantity
 */

defineProps({
  items: {
    type: Array,
    required: true,
    default: () => []
  },
  title: {
    type: String,
    default: 'Cart Items'
  }
})

defineEmits(['remove-item', 'update-quantity'])
</script>

<style scoped>
/* Custom scrollbar for items list */
.max-h-64::-webkit-scrollbar {
  width: 4px;
}

.max-h-64::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.max-h-64::-webkit-scrollbar-thumb {
  background: #10b981;
  border-radius: 4px;
}

.max-h-64::-webkit-scrollbar-thumb:hover {
  background: #059669;
}
</style>
