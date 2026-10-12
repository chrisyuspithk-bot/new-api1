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
import { handleServerError } from '@/lib/handle-server-error'

import { setResellerDiscount } from '../../api'
import type { Reseller } from '../../types'
import { useResellers } from '../resellers-provider'

interface ResellerDiscountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reseller: Reseller | null
}

export function ResellerDiscountDialog({
  open,
  onOpenChange,
  reseller,
}: ResellerDiscountDialogProps) {
  const { t } = useTranslation()
  const { triggerRefresh } = useResellers()
  const [discount, setDiscount] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open && reseller) {
      const current = reseller.reseller_discount ?? 0
      setDiscount(current > 0 ? String(current) : '1')
    }
  }, [open, reseller])

  if (!reseller) return null

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = Number.parseFloat(discount)
    if (!Number.isFinite(value) || value <= 0) {
      toast.error(t('Discount must be greater than 0'))
      return
    }
    setIsSubmitting(true)
    try {
      const result = await setResellerDiscount(reseller.id, value)
      if (result.success) {
        toast.success(t('Discount updated'))
        onOpenChange(false)
        triggerRefresh()
      } else {
        handleServerError(result, t('Failed to update discount'))
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
          <SheetTitle>{t('Set Discount')}</SheetTitle>
          <SheetDescription>
            {t(
              'Cost multiplier for {{username}}. 1 means no discount; 0.8 means 20% off the platform base price.',
              { username: reseller.username }
            )}
          </SheetDescription>
        </SheetHeader>
        <form
          id='reseller-discount-form'
          onSubmit={handleSubmit}
          className={sideDrawerFormClassName()}
        >
          <SideDrawerSection>
            <div className='flex flex-col gap-2'>
              <Label htmlFor='reseller-discount-input'>
                {t('Discount')}
              </Label>
              <Input
                id='reseller-discount-input'
                type='number'
                min='0.01'
                step='0.01'
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </SideDrawerSection>
        </form>
        <SheetFooter className={sideDrawerFooterClassName()}>
          <SheetClose render={<Button variant='outline' />}>
            {t('Close')}
          </SheetClose>
          <Button
            form='reseller-discount-form'
            type='submit'
            disabled={isSubmitting || !discount}
          >
            {isSubmitting ? t('Saving...') : t('Save changes')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
