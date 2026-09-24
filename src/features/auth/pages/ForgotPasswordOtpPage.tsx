import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { isAxiosError } from 'axios'
import { LoaderCircle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { PasswordResetLayout } from '@/features/auth/components/PasswordResetLayout'
import { useResendOtpMutation } from '@/features/auth/hooks/useAuth'
import type { AuthApiError } from '@/features/auth/types'
import { Button } from '@/shared/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'

const routeStateSchema = z.object({ email: z.string().email().max(255) })
const otpSchema = z.object({
  otp: z.string()
    .min(1, 'Verification code is required.')
    .regex(/^[0-9]{6}$/, 'Verification code must contain exactly 6 digits.'),
})

export default function ForgotPasswordOtpPage() {
  const location = useLocation()
  const result = routeStateSchema.safeParse(location.state)

  if (!result.success) return <Navigate to="/forgot-password" replace />

  return <PasswordResetOtpForm key={result.data.email} email={result.data.email} />
}

function PasswordResetOtpForm({ email }: { email: string }) {
  const navigate = useNavigate()
  const resend = useResendOtpMutation()
  const [cooldownUntil, setCooldownUntil] = useState(() => Date.now() + 60_000)
  const [secondsLeft, setSecondsLeft] = useState(60)
  const form = useForm<z.infer<typeof otpSchema>>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: '' },
  })

  useEffect(() => {
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000))
      setSecondsLeft(remaining)
      if (remaining === 0) window.clearInterval(timer)
    }, 1000)
    return () => window.clearInterval(timer)
  }, [cooldownUntil])

  function restartCooldown() {
    setSecondsLeft(60)
    setCooldownUntil(Date.now() + 60_000)
  }

  function resendCode() {
    if (resend.isPending || secondsLeft > 0) return
    resend.mutate({ email, purpose: 'PASSWORD_RESET' }, {
      onSuccess: () => {
        restartCooldown()
        form.reset({ otp: '' })
      },
      onError: (error) => {
        if (isAxiosError<AuthApiError>(error) && error.response?.data.errorCode === 'OTP_RESEND_TOO_SOON') {
          restartCooldown()
        }
      },
    })
  }

  function submit({ otp }: z.infer<typeof otpSchema>) {
    if (resend.isPending) return
    navigate('/reset-password', { state: { email, otp } })
  }

  return (
    <PasswordResetLayout title="OTP verification" backTo="/forgot-password">
      <p className="!mt-9 break-words font-['Arial_Narrow',Impact,sans-serif] text-base font-bold text-[#202020]">
        <span className="uppercase">We have sent a code to your email:</span>{' '}
        <span className="text-[#F39200]">{email}</span>
      </p>
      <Form {...form}>
        <form noValidate onSubmit={form.handleSubmit(submit)} className="mt-8 space-y-6">
          <FormField
            control={form.control}
            name="otp"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-['Arial_Narrow',Impact,sans-serif] text-xl font-bold uppercase !text-[#202020]">
                  OTP verification
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="XXXXXX"
                    disabled={resend.isPending}
                    className="h-14 rounded-none border-neutral-300 bg-white px-4 text-base text-neutral-900 shadow-none placeholder:text-neutral-400 focus-visible:border-[#F39200] focus-visible:ring-[#F39200]/20"
                  />
                </FormControl>
                <FormMessage className="text-sm !text-red-700" />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            disabled={resend.isPending}
            className="mt-3 h-15 w-full rounded-none bg-[#F39200] font-['Arial_Narrow',Impact,sans-serif] text-2xl font-bold text-[#202020] uppercase shadow-none hover:bg-[#df8500]"
          >
            Continue
          </Button>
        </form>
      </Form>
      <div className="mt-6 flex justify-center">
        <Button
          type="button"
          variant="link"
          onClick={resendCode}
          disabled={secondsLeft > 0 || resend.isPending}
          className="font-['Arial_Narrow',Impact,sans-serif] text-lg font-bold text-[#202020] uppercase underline"
        >
          {resend.isPending && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
          {resend.isPending ? 'Sending...' : secondsLeft > 0 ? `Resend OTP in ${secondsLeft}s` : 'Resend OTP'}
        </Button>
      </div>
    </PasswordResetLayout>
  )
}
