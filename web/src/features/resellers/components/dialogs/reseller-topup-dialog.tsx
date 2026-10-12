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

import {
  SideDrawerSection,
  sideDrawerContentClassName,
  sideDrawerFooterClassName,
  sideDrawerFormClassName,
  sideDrawerHeaderClassName,
} from '@/components/drawer-layout'
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
import {
  getCurrencyDisplay,
  getCurrencyLabel,
} from '@/lib/currency'
import { formatQuota, getEditableQuotaStep } from '@/lib/format'
import { handleServerError } from '@/lib/handle-server-error'

import { topUpReseller } from '../../api'
import type { Reseller } from '../../types'

interface ResellerTopupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reseller: Reseller | null
}

export function ResellerTopupDialog({
  open,
  onOpenChange,
  reseller,
}: ResellerTopupDialogProps) {
  const { t } = useTranslation()
  const [amount, setAmount] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open) setAmount('')
  }, [open])

  if (!reseller) return null

  const { meta } = getCurrencyDisplay()
  const currencyLabel = getCurrencyLabel()
  const tokensOnly = meta.kind === 'tokens'
  const step = getEditableQuotaStep()
  const amountLabel = t('Top-up Amount ({{currency}})', {
    currency: currencyLabel,
  })

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = Number.parseFloat(amount)
    if (!Number.isFinite(value) || value <= 0) {
      toast.error(t('Please enter a positive amount'))
      return
    }
    setIsSubmitting(true)
    try {
      const result = await topUpReseller(reseller.id, value)
      if (result.success) {
        toast.success(t('Top-up successful'))
        onOpenChange(false)
      } else {
        handleServerError(result, t('Failed to top up reseller'))
      }
    } catch (error) {
      handleServerError(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className={sideDrawerContentClassName('sm:max-w-[500px]')}>
        <SheetHeader className={sideDrawerHeaderClassName()}>
          <SheetTitle>{t('Top-up Reseller')}</SheetTitle>
          <SheetDescription>
            {t('Credit the reseller cost balance. Top-ups are credited 1:1.')}
          </SheetDescription>
        </SheetHeader>
        <form
          id='reseller-topup-form'
          onSubmit={handleSubmit}
          className={sideDrawerFormClassName()}
        >
          <SideDrawerSection>
            <div className='flex flex-col gap-2'>
              <Label htmlFor='reseller-topup-amount'>{amountLabel}</Label>
              <Input
                id='reseller-topup-amount'
                type='number'
                min='0'
                step={step}
                placeholder={tokensOnly ? t('Enter tokens') : t('Enter amount')}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isSubmitting}
              />
              <p className='text-muted-foreground text-xs'>
                {t('Current Balance')}:{' '}
                {formatQuota(reseller.reseller_cost_balance ?? 0)}
              </p>
            </div>
          </SideDrawerSection>
        </form>
        <SheetFooter className={sideDrawerFooterClassName()}>
          <SheetClose render={<Button variant='outline' />}>
            {t('Close')}
          </SheetClose>
          <Button
            form='reseller-topup-form'
            type='submit'
            disabled={isSubmitting || !amount}
          >
            {isSubmitting ? t('Saving...') : t('Confirm')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
