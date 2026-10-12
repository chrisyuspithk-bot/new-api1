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
import { describe, expect, test } from 'vitest'

import {
  DEFAULT_CUSTOMER_MARKUP,
  DEFAULT_RESELLER_DISCOUNT,
  RESELLER_STATUS,
} from '../constants'
import { resellerFormSchema } from '../lib'

describe('reseller form schema', () => {
  test('accepts a valid reseller payload', () => {
    const result = resellerFormSchema.safeParse({
      username: 'acme-reseller',
      display_name: 'Acme Reseller',
      password: 'password123',
      reseller_discount: 0.8,
    })
    expect(result.success).toBe(true)
  })

  test('rejects an empty username', () => {
    const result = resellerFormSchema.safeParse({
      username: '',
      password: 'password123',
    })
    expect(result.success).toBe(false)
  })

  test('rejects a short password', () => {
    const result = resellerFormSchema.safeParse({
      username: 'acme-reseller',
      password: 'short',
    })
    expect(result.success).toBe(false)
  })

  test('rejects a non-positive discount', () => {
    const result = resellerFormSchema.safeParse({
      username: 'acme-reseller',
      password: 'password123',
      reseller_discount: 0,
    })
    expect(result.success).toBe(false)
  })
})

describe('reseller constants', () => {
  test('default multipliers are neutral (1)', () => {
    expect(DEFAULT_RESELLER_DISCOUNT).toBe(1)
    expect(DEFAULT_CUSTOMER_MARKUP).toBe(1)
  })

  test('statuses expose the expected lifecycle', () => {
    expect(RESELLER_STATUS.ENABLED).toBe(1)
    expect(RESELLER_STATUS.DISABLED).toBe(2)
    expect(RESELLER_STATUS.DELETED).toBe(-1)
  })
})
