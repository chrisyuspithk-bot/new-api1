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
import type { Row } from '@tanstack/react-table'
import { Users, Percent, Wallet } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { DataTableRowActionMenu } from '@/components/data-table/core/row-action-menu'
import {
  DropdownMenuItem,
  DropdownMenuShortcut,
} from '@/components/ui/dropdown-menu'

import type { Reseller } from '../types'
import { useResellers } from './resellers-provider'

interface ResellerRowActionsProps {
  row: Row<Reseller>
}

export function ResellerRowActions({ row }: ResellerRowActionsProps) {
  const { t } = useTranslation()
  const { setOpen, setCurrentRow } = useResellers()
  const reseller = row.original

  const handle = (type: 'topup' | 'discount' | 'customers') => {
    setCurrentRow(reseller)
    setOpen(type)
  }

  return (
    <div className='-ml-1.5 flex items-center gap-1'>
      <DataTableRowActionMenu
        ariaLabel={t('Open menu')}
        contentClassName='w-48'
      >
        <DropdownMenuItem onClick={() => handle('topup')}>
          {t('Top-up Reseller')}
          <DropdownMenuShortcut>
            <Wallet size={16} />
          </DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handle('discount')}>
          {t('Set Discount')}
          <DropdownMenuShortcut>
            <Percent size={16} />
          </DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handle('customers')}>
          {t('Manage Customers')}
          <DropdownMenuShortcut>
            <Users size={16} />
          </DropdownMenuShortcut>
        </DropdownMenuItem>
      </DataTableRowActionMenu>
    </div>
  )
}
