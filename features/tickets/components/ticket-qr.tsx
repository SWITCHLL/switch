'use client'

/**
 * Renders a QR code as a data-URL <img> on the client.
 * We generate it in a useEffect so it never runs server-side.
 */

import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'

interface TicketQrProps {
  value: string
  size?: number
}

export function TicketQr({ value, size = 200 }: TicketQrProps) {
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        if (imgRef.current) imgRef.current.src = url
      })
      .catch(console.error)
  }, [value, size])

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={imgRef}
      alt="Ticket QR code"
      width={size}
      height={size}
      className="rounded-xl"
    />
  )
}
