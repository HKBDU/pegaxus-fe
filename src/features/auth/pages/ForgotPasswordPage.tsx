import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { PasswordResetLayout } from '@/features/auth/components/PasswordResetLayout'
import { useForgotPasswordMutation } from '@/features/auth/hooks/useAuth'
import type { ForgotPasswordRequest } from '@/features/auth/types'
import { Button } from '@/shared/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'

const emailSchema = z.object({
  email: z.string().trim()
    .min(1, 'Email is required.')
    .email('Email format is invalid.')
    .max(255, 'Email must not exceed 255 characters.'),
})

export default function ForgotPasswordPage() {
  const mutation = useForgotPasswordMutation()
  const form = useForm<ForgotPasswordRequest>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  })

  function submit(values: ForgotPasswordRequest) {
    if (mutation.isPending) return
    mutation.mutate(values)
  }

  return (
    <PasswordResetLayout title="Forgot password" backTo="/login">
      <Form {...form}>
        <form noValidate onSubmit={form.handleSubmit(submit)} className="mt-10 space-y-6" aria-busy={mutation.isPending}>
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-['Arial_Narrow',Impact,sans-serif] text-xl font-bold uppercase !text-[#202020]">
                  Email address
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="email"
                    autoComplete="email"
                    placeholder="Enter your email address"
                    disabled={mutation.isPending}
                    className="h-14 rounded-none border-neutral-300 bg-white px-4 text-base text-neutral-900 shadow-none placeholder:text-neutral-400 focus-visible:border-[#F39200] focus-visible:ring-[#F39200]/20"
                  />
                </FormControl>
                <FormMessage className="text-sm !text-red-700" />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            disabled={mutation.isPending}
            className="mt-3 h-15 w-full rounded-none bg-[#F39200] font-['Arial_Narrow',Impact,sans-serif] text-2xl font-bold text-[#202020] uppercase shadow-none hover:bg-[#df8500]"
          >
            {mutation.isPending && <LoaderCircle aria-hidden="true" className="size-5 animate-spin" />}
            {mutation.isPending ? 'Sending...' : 'Send email'}
          </Button>
        </form>
      </Form>
    </PasswordResetLayout>
  )
}
