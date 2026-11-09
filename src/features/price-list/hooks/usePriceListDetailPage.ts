import { useState } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { priceListDetail, ROLE_ROUTES } from "@/app/route-config"
import { PRICE_LIST_NOT_FOUND } from "@/features/price-list/constants"
import { getPriceListErrorCode, getPriceListErrorMessage } from "@/features/price-list/errors"
import { usePriceList } from "@/features/price-list/hooks/usePriceListDetail"
import type { PriceListDetail, PriceListItem } from "@/features/price-list/types"
import { getMissingTiers, isPriceListId } from "@/features/price-list/utils"

interface ItemFormTarget {
  open: boolean
  /** Absent = add a line. Kept after the dialog closes so it does not flash empty while it fades out. */
  item?: PriceListItem
  /** Grows with every opening; the page uses it as the dialog's `key` so each opening starts a fresh form. */
  session: number
}

/**
 * Everything the detail page (U-02) decides: which list, loading and error states, what the manager may do
 * with it, and which dialog is open. The page itself only lays this out.
 */
export function usePriceListDetailPage() {
  const { priceListId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const query = usePriceList(priceListId)

  const [editHeaderOpen, setEditHeaderOpen] = useState(false)
  const [activateOpen, setActivateOpen] = useState(false)
  const [itemForm, setItemForm] = useState<ItemFormTarget>({ open: false, session: 0 })
  const [deleteTarget, setDeleteTarget] = useState<PriceListItem>()

  const priceList: PriceListDetail | undefined = query.data
  const notFound = !isPriceListId(priceListId) || getPriceListErrorCode(query.error) === PRICE_LIST_NOT_FOUND
  const isActive = Boolean(priceList?.isActive)
  // The list page passes its path and query string along so "back" returns to the same filters.
  const from = (location.state as { from?: string } | null)?.from
  const backHref = from?.startsWith(ROLE_ROUTES.priceLists) ? from : ROLE_ROUTES.priceLists

  return {
    priceListId: priceListId ?? "",
    priceList,
    isLoading: query.isLoading,
    isError: query.isError && !notFound,
    notFound,
    errorMessage: getPriceListErrorMessage(query.error, "Unable to load this price list."),
    retry: () => void query.refetch(),
    backHref,
    listPath: ROLE_ROUTES.priceLists,

    isActive,
    // Header edit, activate and "Add price line" exist only while the list is not active (it is locked afterwards).
    canEdit: Boolean(priceList) && !isActive,
    missingTiers: priceList ? getMissingTiers(priceList.items) : [],

    editHeaderOpen,
    setEditHeaderOpen,
    activateOpen,
    setActivateOpen,
    itemForm,
    openItemForm: (item?: PriceListItem) => setItemForm((current) => ({ open: true, item, session: current.session + 1 })),
    setItemFormOpen: (open: boolean) => setItemForm((current) => ({ ...current, open })),
    deleteTarget,
    askDelete: (item: PriceListItem) => setDeleteTarget(item),
    closeDelete: () => setDeleteTarget(undefined),

    /** After a clone: the copy is a list of its own, so go and edit it. */
    goToPriceList: (id: string) => navigate(priceListDetail(id)),
  }
}
