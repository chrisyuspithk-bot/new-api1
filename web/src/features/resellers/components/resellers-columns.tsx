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
import type { ColumnDef } from '@tanstack/react-table'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { StatusBadge } from '@/components/status-badge'
import { TableId } from '@/components/table-id'
import { getCurrencyDisplay, getCurrencyLabel } from '@/lib/currency'
import { formatQuota } from '@/lib/format'
import { useSystemConfigStore } from '@/stores/system-config-store'

import { RESELLER_STATUSES } from '../constants'
import type { Reseller } from '../types'
import { ResellerRowActions } from './reseller-row-actions'

export function useResellersColumns(): ColumnDef<Reseller>[] {
  const { t } = useTranslation()
  const currencyConfig = useSystemConfigStore((state) => state.config.currency)
  const { meta: currency } = getCurrencyDisplay()
  const quotaUnit = currency.kind === 'tokens' ? t('Tokens') : currency.symbol
  const currencyLabel = getCurrencyLabel()

  return useMemo<ColumnDef<Reseller>[]>(
    () => [
      {
        accessorKey: 'id',
        header: t('ID'),
        cell: ({ row }) => (
          <TableId
            value={row.getValue('id') as number}
            className='w-[60px] [font-family:inherit] text-sm'
          />
        ),
        size: 80,
      },
      {
        accessorKey: 'username',
        header: t('Username'),
        cell: ({ row }) => {
          const username = row.getValue('username') as string
          const displayName = row.original.display_name
          return (
            <div className='flex min-w-[160px] flex-col gap-1'>
              <div className='text-sm font-normal'>{username}</div>
              {displayName && displayName !== username && (
                <div className='text-muted-foreground text-xs'>
                  {displayName}
                </div>
              )}
            </div>
          )
        },
        size: 220,
        meta: { mobileTitle: true },
      },
      {
        id: 'cost_balance',
        accessorKey: 'reseller_cost_balance',
        header: `${t('Cost Balance')} (${quotaUnit})`,
        cell: ({ row }) => {
          const balance = row.original.reseller_cost_balance ?? 0
          return (
            <span className='font-semibold text-emerald-600 tabular-nums'>
              {formatQuota(balance)}
            </span>
          )
        },
        size: 180,
      },
      {
        accessorKey: 'reseller_discount',
        header: t('Discount'),
        cell: ({ row }) => {
          const discount = row.original.reseller_discount ?? 0
          const value = discount > 0 ? discount : 1
          return (
            <span className='tabular-nums'>{`${value}×`}</span>
          )
        },
        size: 100,
      },
      {
        accessorKey: 'status',
        header: t('Status'),
        cell: ({ row }) => {
          const status = row.original.status ?? 1
          const config =
            RESELLER_STATUSES[status as keyof typeof RESELLER_STATUSES]
          if (!config) return null
          return (
            <StatusBadge
              label={t(config.labelKey)}
              variant={config.variant}
              copyable={false}
              className='font-normal'
            />
          )
        },
        size: 100,
      },
      {
        id: 'actions',
        header: () => t('Actions'),
        cell: ({ row }) => <ResellerRowActions row={row} />,
        meta: { pinned: 'right' as const },
      },
    ],
    // formatQuota reads the currency configuration from the store.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, quotaUnit, currencyLabel, currencyConfig]
  )
}
