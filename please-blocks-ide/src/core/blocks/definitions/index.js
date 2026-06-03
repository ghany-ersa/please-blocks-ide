// Agregasi semua block definitions
import navigation from './navigation.js'
import actions    from './actions.js'
import assertions from './assertions.js'
import utilities  from './utilities.js'

// Urutan kategori menentukan urutan tampil di palette
export const CATEGORY_ORDER = ['navigation', 'action', 'assertion', 'utility']

export const CATEGORY_META = {
  navigation: { label: 'Navigation',  icon: '🧭', color: '#6366f1' },
  action:     { label: 'Actions',     icon: '🖱️', color: '#10b981' },
  assertion:  { label: 'Assertions',  icon: '👁️', color: '#f59e0b' },
  utility:    { label: 'Utilities',   icon: '⏳', color: '#6b7280' },
  component:  { label: 'Components',  icon: '📦', color: '#ec4899' },
  data:       { label: 'Data',        icon: '📊', color: '#0ea5e9' }
}

// Semua built-in blocks dalam satu array flat
export const ALL_BUILT_IN_BLOCKS = [
  ...navigation,
  ...actions,
  ...assertions,
  ...utilities
]

export default ALL_BUILT_IN_BLOCKS
