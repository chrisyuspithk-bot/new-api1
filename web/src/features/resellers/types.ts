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

// A reseller (RoleResellerUser). All amounts are unified USD; the backend
// exposes the cost balance both in raw quota units and as USD.
export const resellerSchema = z.object({
  id: z.number(),
  username: z.string(),
  display_name: z.string(),
  reseller_cost_balance: z.number().optional(),
  reseller_discount: z.number().optional(),
  status: z.number().optional(),
  created_at: z.number().optional(),
})
export type Reseller = z.infer<typeof resellerSchema>

// A customer (RoleCommonUser) owned by a reseller. The backend returns a full
// user record; we only rely on the fields we render.
export const resellerCustomerSchema = z.object({
  id: z.number(),
  username: z.string(),
  display_name: z.string(),
  status: z.number().optional(),
  customer_markup: z.number().optional(),
  reseller_id: z.number().nullable().optional(),
  quota: z.number().optional(),
  created_at: z.number().optional(),
})
export type ResellerCustomer = z.infer<typeof resellerCustomerSchema>

export interface ApiResponse<T = unknown> {
  success: boolean
  message?: string
  data?: T
}

export interface GetResellersParams {
  p?: number
  page_size?: number
}

export interface GetResellersResponse {
  success: boolean
  message?: string
  data?: {
    items: Reseller[]
    total: number
    page: number
    page_size: number
  }
}

export interface GetResellerCustomersParams {
  p?: number
  page_size?: number
}

export interface GetResellerCustomersResponse {
  success: boolean
  message?: string
  data?: {
    items: ResellerCustomer[]
    total: number
    page: number
    page_size: number
  }
}

export interface CreateResellerPayload {
  username: string
  display_name?: string
  password: string
  reseller_discount?: number
}

export type ResellersDialogType =
  | 'create'
  | 'topup'
  | 'discount'
  | 'customers'
