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
import { type FormEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

import { setCustomerMarkup } from '../../api'
import type { Reseller, ResellerCustomer } from '../../types'

interface SetCustomerMarkupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer: ResellerCustomer | null
  reseller: Reseller | null
  onUpdated?: () => void
}

export function SetCustomerMarkupDialog({
  open,
  onOpenChange,
  customer,
  onUpdated,
}: SetCustomerMarkupDialogProps) {
  const { t } = useTranslation()
  const [markup, setMarkup] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open && customer) {
      const current = customer.customer_markup ?? 0
      setMarkup(current > 0 ? String(current) : '1')
    }
  }, [open, customer])

  if (!customer) return null

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = Number.parseFloat(markup)
    if (!Number.isFinite(value) || value <= 0) {
      toast.error(t('Markup must be greater than 0'))
      return
    }
    setIsSubmitting(true)
    try {
      const result = await setCustomerMarkup(customer.id, value)
      if (result.success) {
        toast.success(t('Markup updated'))
        onOpenChange(false)
        onUpdated?.()
      } else {
        handleServerError(result, t('Failed to update markup'))
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
          <SheetTitle>{t('Set Customer Markup')}</SheetTitle>
          <SheetDescription>
            {t('Markup multiplier for {{username}}. 1 means no markup.', {
              username: customer.username,
            })}
          </SheetDescription>
        </SheetHeader>
        <form
          id='set-customer-markup-form'
          onSubmit={handleSubmit}
          className='flex flex-1 flex-col gap-4 px-4'
        >
          <div className='flex flex-col gap-2'>
            <Label htmlFor='customer-markup-input'>{t('Markup')}</Label>
            <Input
              id='customer-markup-input'
              type='number'
              min='0.01'
              step='0.01'
              value={markup}
              onChange={(e) => setMarkup(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
        </form>
        <SheetFooter>
          <SheetClose render={<Button variant='outline' />}>
            {t('Close')}
          </SheetClose>
          <Button
            form='set-customer-markup-form'
            type='submit'
            disabled={isSubmitting || !markup}
          >
            {isSubmitting ? t('Saving...') : t('Save changes')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
