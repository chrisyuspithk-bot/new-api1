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
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { DataTablePage, useDataTable } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { handleServerError } from '@/lib/handle-server-error'
import { requireServerSuccess } from '@/lib/server-error-message'

import { assignCustomerToReseller, getResellerCustomers } from '../../api'
import type { Reseller, ResellerCustomer } from '../../types'
import { useResellerCustomerColumns } from './reseller-customer-columns'
import { AssignCustomerDialog } from './assign-customer-dialog'
import { SetCustomerMarkupDialog } from './set-customer-markup-dialog'
import { useResellers } from '../resellers-provider'

interface ResellerCustomersDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reseller: Reseller | null
}

export function ResellerCustomersDialog({
  open,
  onOpenChange,
  reseller,
}: ResellerCustomersDialogProps) {
  const { t } = useTranslation()
  const { triggerRefresh } = useResellers()
  const [assignOpen, setAssignOpen] = useState(false)
  const [markupCustomer, setMarkupCustomer] =
    useState<ResellerCustomer | null>(null)

  const columns = useResellerCustomerColumns({
    onManageMarkup: (row) => setMarkupCustomer(row.original),
    onUnassign: (row) => {
      void (async () => {
        try {
          const result = await assignCustomerToReseller(row.original.id, null)
          if (result.success) {
            toast.success(t('Customer unassigned'))
            void refetch()
          } else {
            handleServerError(result, t('Failed to unassign customer'))
          }
        } catch (error) {
          handleServerError(error)
        }
      })()
    },
  })

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['reseller-customers', reseller?.id],
    enabled: open && !!reseller,
    queryFn: async () => {
      if (!reseller) return { items: [], total: 0 }
      const result = requireServerSuccess(
        await getResellerCustomers(reseller.id)
      )
      return {
        items: result.data?.items ?? [],
        total: result.data?.total ?? 0,
      }
    },
    placeholderData: (prev) => prev,
  })

  const customers = data?.items ?? []

  const { table } = useDataTable({
    data: customers,
    columns,
    totalCount: data?.total ?? 0,
  })

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className='sm:max-w-[900px]'>
          <SheetHeader>
            <SheetTitle>
              {t('Manage Customers')} - {reseller?.username}
            </SheetTitle>
            <SheetDescription>
              {t(
                'Customers assigned to this reseller. Adjust their markup or unassign them.'
              )}
            </SheetDescription>
          </SheetHeader>
          <div className='flex justify-end px-4 py-2'>
            <Button size='sm' onClick={() => setAssignOpen(true)}>
              {t('Assign Customer')}
            </Button>
          </div>
          <DataTablePage
            table={table}
            columns={columns}
            isLoading={isLoading}
            isFetching={isFetching}
            emptyTitle={t('No customers yet')}
            emptyDescription={t('No customers are assigned to this reseller.')}
            skeletonKeyPrefix='reseller-customers-skeleton'
            applyHeaderSize
          />
          <SheetFooter>
            <SheetClose render={<Button variant='outline' />}>
              {t('Close')}
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AssignCustomerDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        reseller={reseller}
        onAssigned={() => {
          void refetch()
          triggerRefresh()
        }}
      />

      <SetCustomerMarkupDialog
        open={!!markupCustomer}
        onOpenChange={(v) => !v && setMarkupCustomer(null)}
        customer={markupCustomer}
        reseller={reseller}
        onUpdated={() => {
          void refetch()
        }}
      />
    </>
  )
}
