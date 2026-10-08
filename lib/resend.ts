import { Resend } from 'resend'
import type { Brand } from '@/lib/brands'

let _resend: Resend | null = null

export function getResend() {
  if (_resend) return _resend
  _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}

/** Lazy proxy so build can import without RESEND_API_KEY present. */
export const resend = new Proxy({} as Resend, {
  get(_target, prop, receiver) {
    const client = getResend() as any
    const value = client[prop]
    return typeof value === 'function' ? value.bind(client) : Reflect.get(client, prop, receiver)
  },
})

/** @deprecated Prefer brand.fromEmail / brand.fromName */
export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'newsletter@animalsaroundtheglobe.com'
export const FROM_NAME = process.env.RESEND_FROM_NAME || 'Animals Around The Globe'

export function brandFromAddress(brand: Brand) {
  return `${brand.fromName} <${brand.fromEmail}>`
}
