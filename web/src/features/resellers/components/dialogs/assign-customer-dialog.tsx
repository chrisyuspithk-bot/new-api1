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
import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { Label } from '@/components/ui/label'
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

import { searchUsers } from '@/features/users/api'

import { assignCustomerToReseller } from '../../api'
import type { Reseller } from '../../types'

interface AssignCustomerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reseller: Reseller | null
  onAssigned?: () => void
}

export function AssignCustomerDialog({
  open,
  onOpenChange,
  reseller,
  onAssigned,
}: AssignCustomerDialogProps) {
  const { t } = useTranslation()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open) setSelectedId(null)
  }, [open])

  // Common users (role = 1) that can be assigned to a reseller.
  const { data } = useQuery({
    queryKey: ['assignable-users'],
    enabled: open,
    queryFn: async () => {
      const result = await searchUsers({ role: '1', page_size: 100 })
      if (!result.success) {
        throw new Error(result.message ?? 'Failed to load users')
      }
      return result.data?.items ?? []
    },
    staleTime: 30 * 1000,
  })

  const options = useMemo(
    () =>
      (data ?? []).map((user) => ({
        value: String(user.id),
        label: user.username,
        description: user.display_name || user.username,
      })),
    [data]
  )

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedId || !reseller) return
    setIsSubmitting(true)
    try {
      const result = await assignCustomerToReseller(
        Number.parseInt(selectedId, 10),
        reseller.id
      )
      if (result.success) {
        toast.success(t('Customer assigned'))
        onOpenChange(false)
        onAssigned?.()
      } else {
        handleServerError(result, t('Failed to assign customer'))
      }
    } catch (error) {
      handleServerError(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='sm:max-w-[500px]'>
        <SheetHeader>
          <SheetTitle>{t('Assign Customer')}</SheetTitle>
          <SheetDescription>
            {t('Assign a common user to {{username}}.', {
              username: reseller?.username ?? '',
            })}
          </SheetDescription>
        </SheetHeader>
        <form
          id='assign-customer-form'
          onSubmit={handleSubmit}
          className='flex flex-1 flex-col gap-4 px-4'
        >
          <div className='flex flex-col gap-2'>
            <Label htmlFor='assign-customer-select'>{t('Customer')}</Label>
            <Combobox
              id='assign-customer-select'
              options={options}
              value={selectedId}
              onValueChange={(value) => setSelectedId(value)}
              placeholder={t('Search users...')}
              emptyText={t('No users found')}
            />
          </div>
        </form>
        <SheetFooter>
          <SheetClose render={<Button variant='outline' />}>
            {t('Close')}
          </SheetClose>
          <Button
            form='assign-customer-form'
            type='submit'
            disabled={isSubmitting || !selectedId}
          >
            {isSubmitting ? t('Saving...') : t('Confirm')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
