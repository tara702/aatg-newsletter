import { Resend } from 'resend'
import type { Brand } from '@/lib/brands'

export const resend = new Resend(process.env.RESEND_API_KEY)

/** @deprecated Prefer brand.fromEmail / brand.fromName */
export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'newsletter@animalsaroundtheglobe.com'
export const FROM_NAME = process.env.RESEND_FROM_NAME || 'Animals Around The Globe'

export function brandFromAddress(brand: Brand) {
  return `${brand.fromName} <${brand.fromEmail}>`
}
