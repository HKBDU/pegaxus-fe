# Invoice payment components

These components are controlled by the invoice `availableActions` returned by the backend. They do not infer permissions or invoice transitions from status or role.

## Public components

### `RecordPaymentDialog`

```tsx
import { RecordPaymentDialog } from '@/features/invoice/components/<ComponentName>'

<RecordPaymentDialog
  invoice={invoice}
  onRecorded={(response) => {
    // Refetch IV6 or update the host invoice from the backend response.
    console.log(response.receipt.receiptCode)
  }}
/>
```

The dialog renders only when `availableActions` contains `RECORD_PAYMENT` and the invoice is not a `QUOTATION`. It submits IV8 with the locked grand total and invoice currency. Supported payment methods are `CASH`, `BANK_TRANSFER`, and `OTHER`.

### `PayNowButton`

```tsx
import { PayNowButton } from '@/features/invoice/components/<ComponentName>'

<PayNowButton invoice={invoice} />
```

The button renders only when `availableActions` contains `PAY_NOW`. It calls IV11 without a request body and sends the customer to the gateway with a browser form POST of the returned `checkoutFields` to `paymentUrl` (SePay cannot start a checkout from a GET redirect). A redirect is not treated as payment success. The host must refetch IV6 after the customer returns from the payment gateway and read the invoice and receipt statuses returned by the backend.

### `CancelInvoiceDialog`

```tsx
import { CancelInvoiceDialog } from '@/features/invoice/components/<ComponentName>'

<CancelInvoiceDialog
  invoice={invoice}
  onCancelled={(response) => {
    // Refetch IV6 or update the host invoice from the backend response.
    console.log(response.status)
  }}
/>
```

The dialog renders only when `availableActions` contains `CANCEL`. The cancellation reason must contain at least 10 non-whitespace characters. It calls IV9, uses the backend `CANCELLED` response, and may show the `CREATE_ANOTHER` suggestion without navigating automatically.

## API and errors

- Manual payment: `POST /api/v1/invoices/{invoiceId}/receipts`.
- Online payment: `POST /api/v1/invoices/{invoiceId}/online-payments` with no body.
- Cancellation: `POST /api/v1/invoices/{invoiceId}/cancel`.
- Service errors preserve `errorCode`, `status`, and backend validation details for the host UI.

The host remains responsible for refetching IV6 after a successful mutation or payment-gateway return. These components do not set an invoice to `PAID` locally.

## Usage notes

The components use responsive shared UI primitives and a maximum new-corner radius of 2px. The host should provide the invoice returned by the invoice-detail API and keep the component mounted with the latest `availableActions`.
