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
import type { ColumnDef, Row } from '@tanstack/react-table'
import { Percent, Unlink } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { StatusBadge } from '@/components/status-badge'
import { TableId } from '@/components/table-id'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { formatQuota } from '@/lib/format'

import { RESELLER_STATUSES } from '../../constants'
import type { ResellerCustomer } from '../../types'

interface UseResellerCustomerColumnsOptions {
  onManageMarkup: (row: Row<ResellerCustomer>) => void
  onUnassign: (row: Row<ResellerCustomer>) => void
}

export function useResellerCustomerColumns({
  onManageMarkup,
  onUnassign,
}: UseResellerCustomerColumnsOptions): ColumnDef<ResellerCustomer>[] {
  const { t } = useTranslation()

  return useMemo<ColumnDef<ResellerCustomer>[]>(
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
        size: 70,
      },
      {
        accessorKey: 'username',
        header: t('Username'),
        cell: ({ row }) => {
          const username = row.getValue('username') as string
          const displayName = row.original.display_name
          return (
            <div className='flex min-w-[140px] flex-col gap-1'>
              <div className='text-sm font-normal'>{username}</div>
              {displayName && displayName !== username && (
                <div className='text-muted-foreground text-xs'>
                  {displayName}
                </div>
              )}
            </div>
          )
        },
        size: 200,
        meta: { mobileTitle: true },
      },
      {
        accessorKey: 'customer_markup',
        header: t('Markup'),
        cell: ({ row }) => {
          const markup = row.original.customer_markup ?? 0
          const value = markup > 0 ? markup : 1
          return <span className='tabular-nums'>{`${value}×`}</span>
        },
        size: 90,
      },
      {
        accessorKey: 'quota',
        header: t('Quota'),
        cell: ({ row }) => {
          const quota = row.original.quota ?? 0
          return <span className='tabular-nums'>{formatQuota(quota)}</span>
        },
        size: 120,
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
        cell: ({ row }) => (
          <div className='-ml-1.5 flex items-center gap-1'>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant='ghost'
                    size='icon-sm'
                    onClick={() => onManageMarkup(row)}
                    aria-label={t('Set Customer Markup')}
                  />
                }
              >
                <Percent />
              </TooltipTrigger>
              <TooltipContent>{t('Set Customer Markup')}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant='ghost'
                    size='icon-sm'
                    onClick={() => onUnassign(row)}
                    aria-label={t('Unassign')}
                  />
                }
              >
                <Unlink />
              </TooltipTrigger>
              <TooltipContent>{t('Unassign')}</TooltipContent>
            </Tooltip>
          </div>
        ),
        meta: { pinned: 'right' as const },
      },
    ],
    [t, onManageMarkup, onUnassign]
  )
}
