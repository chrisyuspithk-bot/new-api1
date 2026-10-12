/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { Store } from 'lucide-react'

export const RESELLER_STATUS = {
  ENABLED: 1,
  DISABLED: 2,
  DELETED: -1,
} as const

export const RESELLER_STATUSES = {
  [RESELLER_STATUS.ENABLED]: {
    labelKey: 'Enabled',
    variant: 'success' as const,
  },
  [RESELLER_STATUS.DISABLED]: {
    labelKey: 'Disabled',
    variant: 'neutral' as const,
  },
  [RESELLER_STATUS.DELETED]: {
    labelKey: 'Deleted',
    variant: 'danger' as const,
  },
} as const

export const RESELLER_ICON = Store

// Discount is a cost multiplier (>0); 1.0 means "no discount" (cost = base).
export const DEFAULT_RESELLER_DISCOUNT = 1
export const DEFAULT_CUSTOMER_MARKUP = 1
