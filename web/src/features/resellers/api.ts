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
import { api } from '@/lib/api'

import type {
  ApiResponse,
  CreateResellerPayload,
  GetResellersParams,
  GetResellersResponse,
  GetResellerCustomersParams,
  GetResellerCustomersResponse,
  Reseller,
} from './types'

// ============================================================================
// Reseller Management (admin; creation is root-only)
// ============================================================================

export async function getResellers(
  params: GetResellersParams = {}
): Promise<GetResellersResponse> {
  const { p = 1, page_size = 20 } = params
  const res = await api.get(
    `/api/user/resellers?p=${p}&page_size=${page_size}`
  )
  return res.data
}

export async function createReseller(
  data: CreateResellerPayload
): Promise<ApiResponse<{ id: number }>> {
  const res = await api.post('/api/user/resellers', data)
  return res.data
}

export async function topUpReseller(
  id: number,
  amountUSD: number
): Promise<ApiResponse<{ quota: number }>> {
  const res = await api.post(`/api/user/resellers/${id}/topup`, {
    amount_usd: amountUSD,
  })
  return res.data
}

export async function setResellerDiscount(
  id: number,
  discount: number
): Promise<ApiResponse<{ discount: number }>> {
  const res = await api.put(`/api/user/resellers/${id}/discount`, {
    discount,
  })
  return res.data
}

export async function getResellerCustomers(
  id: number,
  params: GetResellerCustomersParams = {}
): Promise<GetResellerCustomersResponse> {
  const { p = 1, page_size = 20 } = params
  const res = await api.get(
    `/api/user/resellers/${id}/customers?p=${p}&page_size=${page_size}`
  )
  return res.data
}

export async function setCustomerMarkup(
  customerId: number,
  markup: number
): Promise<ApiResponse<{ markup: number }>> {
  const res = await api.put(`/api/user/customers/${customerId}/markup`, {
    markup,
  })
  return res.data
}

export async function assignCustomerToReseller(
  customerId: number,
  resellerId: number | null
): Promise<ApiResponse<{ reseller_id: number }>> {
  const res = await api.put(`/api/user/customers/${customerId}/reseller`, {
    reseller_id: resellerId,
  })
  return res.data
}

export async function getReseller(id: number): Promise<ApiResponse<Reseller>> {
  const res = await api.get(`/api/user/resellers/${id}`)
  return res.data
}
