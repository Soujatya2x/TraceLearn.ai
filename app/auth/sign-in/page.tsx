'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AuthLayout } from '@/components/layouts/AuthLayout'
import { SignInForm } from '@/features/auth/SignInForm'

export default function SignInPage() {
  const router = useRouter()
  const params = useSearchParams()
  const next   = params.get('next') ?? '/'

  return (
    <AuthLayout activeTab="sign-in">
      <SignInForm next={next} onSuccess={() => router.replace(next)} />
    </AuthLayout>
  )
}