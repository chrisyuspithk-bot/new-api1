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
import { ResellerCreateDialog } from './dialogs/reseller-create-dialog'
import { ResellerCustomersDialog } from './dialogs/reseller-customers-dialog'
import { ResellerDiscountDialog } from './dialogs/reseller-discount-dialog'
import { ResellerTopupDialog } from './dialogs/reseller-topup-dialog'
import { useResellers } from './resellers-provider'

export function ResellersDialogs() {
  const { open, setOpen, currentRow } = useResellers()

  return (
    <>
      <ResellerCreateDialog
        open={open === 'create'}
        onOpenChange={(isOpen) => !isOpen && setOpen(null)}
      />
      <ResellerTopupDialog
        open={open === 'topup'}
        onOpenChange={(isOpen) => !isOpen && setOpen(null)}
        reseller={currentRow}
      />
      <ResellerDiscountDialog
        open={open === 'discount'}
        onOpenChange={(isOpen) => !isOpen && setOpen(null)}
        reseller={currentRow}
      />
      <ResellerCustomersDialog
        open={open === 'customers'}
        onOpenChange={(isOpen) => !isOpen && setOpen(null)}
        reseller={currentRow}
      />
    </>
  )
}
