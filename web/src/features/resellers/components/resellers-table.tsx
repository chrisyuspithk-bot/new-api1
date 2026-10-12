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
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { DataTablePage, useDataTable } from '@/components/data-table'
import { requireServerSuccess } from '@/lib/server-error-message'

import { getResellers } from '../api'
import { useResellersColumns } from './resellers-columns'
import { useResellers } from './resellers-provider'

export function ResellersTable() {
  const { t } = useTranslation()
  const columns = useResellersColumns()
  const { refreshTrigger } = useResellers()

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['resellers', refreshTrigger],
    queryFn: async () => {
      const result = requireServerSuccess(await getResellers())
      return result.data
    },
    placeholderData: (prev) => prev,
  })

  const resellers = useMemo(() => data?.items ?? [], [data])

  const { table } = useDataTable({
    data: resellers,
    columns,
    totalCount: data?.total ?? 0,
  })

  return (
    <DataTablePage
      table={table}
      columns={columns}
      isLoading={isLoading}
      isFetching={isFetching}
      emptyTitle={t('No resellers yet')}
      emptyDescription={t('Click "Create Reseller" to add your first reseller')}
      skeletonKeyPrefix='resellers-skeleton'
      applyHeaderSize
    />
  )
}
