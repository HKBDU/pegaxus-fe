import type {
  InvoiceAction,
  InvoiceCurrency,
  InvoiceItemType,
  InvoiceStatus,
  InvoiceType,
  PaymentMethod,
  ReceiptStatus,
} from '@/shared/constants/invoice'

export type RecordPaymentPayload = {
  amount: number
  currency: InvoiceCurrency
  paymentMethod: PaymentMethod
  paidAt?: string
  transactionReference?: string
  note?: string
}

export type CancelInvoicePayload = {
  cancellationReason: string
}

export type OnlinePaymentResponse = {
  paymentUrl: string
  receipt: Receipt
}

export type InvoiceMutationSummary = {
  invoiceId: string
  invoiceNumber: string
  type: InvoiceType
  status: InvoiceStatus
  paidAt?: string | null
  cancelledAt?: string | null
  cancellationReason?: string | null
  availableActions: InvoiceAction[]
  updatedAt: string
}

export type RecordPaymentResponse = {
  receipt: Receipt
  invoice: InvoiceMutationSummary
  effects: {
    transportPlanStatus: string | null
    creditNoteUnlocked: boolean
  }
}

export type CancelInvoiceResponse = InvoiceMutationSummary

export type InvoicePayment = {
  method: string
  qrCodeUrl: string | null
}

export type InvoiceCustomer = {
  customerId: string
  customerCode: string
  name: string
  phone: string | null
  address: string | null
  email: string
}

export type InvoiceContactPerson = {
  name: string
  email: string
  phone: string | null
}

export type InvoiceBooking = {
  bookingId: string
  bookingCode: string
  status: string
  originAddress: string
  originCountry: string
  destinationAddress: string
  destinationCountry: string
  requestedDepartureDate: string
}

export type InvoiceTransport = {
  transportId: string
  transportCode: string
  status: string
}

export type InvoiceTransportPlan = {
  transportPlanId: string
  planCode: string
  status: string
}

export type InvoiceHorse = {
  horseId: string
  horseName: string
}

export type InvoiceItem = {
  invoiceItemId: string | null
  itemType: InvoiceItemType
  description: string
  itemDate: string | null
  quantity: number
  price: number
  total: number
  horse: InvoiceHorse | null
  emergencyCostRequestId: string | null
  isDepositDeduction: boolean
  note: string | null
}

export type InvoiceSummary = {
  subtotal: number
  discount: number
  tax: number
  taxRatePercent: number
  depositDeduction: number
  grandTotal: number
}

export type ReceiptRecordedBy = {
  accountId: string
  fullName: string
}

export type Receipt = {
  receiptId: string
  receiptCode: string
  amount: number
  currency: InvoiceCurrency
  paymentMethod: PaymentMethod
  status: ReceiptStatus
  transactionReference: string | null
  paidAt: string | null
  confirmedAt: string | null
  note: string | null
  recordedBy: ReceiptRecordedBy | null
}

export type Invoice = {
  invoiceId: string
  invoiceNumber: string
  type: InvoiceType
  status: InvoiceStatus
  isPaymentRequired: boolean
  invoiceDate: string
  dueDate: string
  currency: InvoiceCurrency
  note: string | null
  payment: InvoicePayment | null
  customer: InvoiceCustomer
  items: InvoiceItem[]
  summary: InvoiceSummary
  contactPerson: InvoiceContactPerson
  issuedAt: string | null
  paidAt: string | null
  cancelledAt: string | null
  cancellationReason: string | null
  booking: InvoiceBooking
  transport: InvoiceTransport | null
  transportPlan: InvoiceTransportPlan | null
  receipts: Receipt[]
  availableActions: InvoiceAction[]
  createdAt: string
  updatedAt: string
}

export type InvoiceListItem = {
  invoiceId: string
  invoiceNumber: string
  type: InvoiceType
  status: InvoiceStatus
  bookingId: string
  bookingCode: string
  transportPlanId: string | null
  customerName: string
  totalAmount: number
  currency: InvoiceCurrency
  dueDate: string
  issuedAt: string | null
  paidAt: string | null
  createdAt: string
  updatedAt: string
}
