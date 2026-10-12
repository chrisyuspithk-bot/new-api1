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
import { zodResolver } from '@hookform/resolvers/zod'
import { type FormEvent, useState } from 'react'
import { useForm } from 'react-hook-form'
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
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

import { createReseller } from '../../api'
import {
  resellerFormSchema,
  RESELLER_FORM_DEFAULT_VALUES,
  type ResellerFormValues,
} from '../../lib'
import { useResellers } from '../resellers-provider'

interface ResellerCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ResellerCreateDialog({
  open,
  onOpenChange,
}: ResellerCreateDialogProps) {
  const { t } = useTranslation()
  const { triggerRefresh } = useResellers()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<ResellerFormValues>({
    resolver: zodResolver(resellerFormSchema),
    defaultValues: RESELLER_FORM_DEFAULT_VALUES,
  })

  const onSubmit = async (data: ResellerFormValues) => {
    setIsSubmitting(true)
    try {
      const result = await createReseller({
        username: data.username,
        display_name: data.display_name || data.username,
        password: data.password,
        reseller_discount: data.reseller_discount,
      })
      if (result.success) {
        toast.success(t('Reseller created successfully'))
        onOpenChange(false)
        form.reset(RESELLER_FORM_DEFAULT_VALUES)
        triggerRefresh()
      } else {
        handleServerError(result, t('Failed to create reseller'))
      }
    } catch (error) {
      handleServerError(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    void form.handleSubmit(onSubmit)(event)
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v)
        if (!v) {
          form.reset(RESELLER_FORM_DEFAULT_VALUES)
        }
      }}
    >
      <SheetContent className={sideDrawerContentClassName('sm:max-w-[600px]')}>
        <SheetHeader className={sideDrawerHeaderClassName()}>
          <SheetTitle>{t('Create Reseller')}</SheetTitle>
          <SheetDescription>
            {t('Create a reseller account that can own customer accounts.')}{' '}
            {t('Click save when you&apos;re done.')}
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form
            id='reseller-create-form'
            onSubmit={handleSubmit}
            className={sideDrawerFormClassName()}
          >
            <fieldset disabled={isSubmitting} className='contents'>
              <SideDrawerSection>
                <FormField
                  control={form.control}
                  name='username'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Username')}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={t('Enter reseller username')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='display_name'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Display Name')}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={t('Enter display name (optional)')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='password'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Password')}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type='password'
                          placeholder={t('Enter password')}
                        />
                      </FormControl>
                      <FormDescription>
                        {t('At least 8 characters')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='reseller_discount'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Discount')}</FormLabel>
                      <FormControl>
                        <Input
                          type='number'
                          step='0.01'
                          min='0.01'
                          placeholder='1'
                          value={field.value ?? ''}
                          onChange={(e) => {
                            const parsed = Number.parseFloat(e.target.value)
                            field.onChange(
                              Number.isFinite(parsed) && parsed > 0
                                ? parsed
                                : undefined
                            )
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        {t(
                          'Cost multiplier for this reseller. 1 means no discount; 0.8 means 20% off the platform base price.'
                        )}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </SideDrawerSection>
            </fieldset>
          </form>
        </Form>
        <SheetFooter className={sideDrawerFooterClassName()}>
          <SheetClose render={<Button variant='outline' />}>
            {t('Close')}
          </SheetClose>
          <Button
            form='reseller-create-form'
            type='submit'
            disabled={isSubmitting}
          >
            {isSubmitting ? t('Saving...') : t('Save changes')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
