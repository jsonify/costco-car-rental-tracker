// src/components/ClientSideChart.tsx
"use client"

import dynamic from "next/dynamic"

const PriceChart = dynamic(() => import("./PriceChart"), {
  ssr: false,
  loading: () => (
    <div className="animate-pulse w-full h-full bg-gray-100 rounded-lg" />
  )
})

export default PriceChart