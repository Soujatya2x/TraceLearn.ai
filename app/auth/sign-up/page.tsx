'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { AuthLayout } from '@/components/layouts/AuthLayout'
import { SignUpForm } from '@/features/auth/SignUpForm'

export default function SignUpPage() {
  const router = useRouter()
  const params = useSearchParams()
  const next   = params.get('next') ?? '/'

  return (
    <AuthLayout activeTab="sign-up">
      <SignUpForm next={next} onSuccess={() => router.replace(next)} />
    </AuthLayout>
  )
}