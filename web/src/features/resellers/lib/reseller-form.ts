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
import { z } from 'zod'

export const resellerFormSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  display_name: z.string().optional(),
  password: z.string().min(8, 'Password must contain between 8 and 128 characters.'),
  reseller_discount: z.number().positive().optional(),
})

export type ResellerFormValues = z.infer<typeof resellerFormSchema>

export const RESELLER_FORM_DEFAULT_VALUES: ResellerFormValues = {
  username: '',
  display_name: '',
  password: '',
  reseller_discount: undefined,
}
