// src/components/PriceChart.tsx
"use client"

import { useEffect, useRef } from "react"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions
} from "chart.js"
import { Chart } from "react-chartjs-2"

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

interface PriceChartProps {
  data: Array<{
    date: string
    price: number
    holdingPrice?: number | null
  }>
}

export default function PriceChart({ data }: PriceChartProps) {
  const chartData: ChartData<"line"> = {
    labels: data.map(item => item.date),
    datasets: [
      {
        label: "Price",
        data: data.map(item => item.price),
        borderColor: "rgb(37, 99, 235)",
        backgroundColor: "rgba(37, 99, 235, 0.1)",
        fill: true,
        tension: 0.4
      },
      ...(data[0]?.holdingPrice ? [{
        label: "Holding Price",
        data: data.map(() => data[0].holdingPrice),
        borderColor: "rgb(220, 38, 38)",
        borderDash: [5, 5],
        pointRadius: 0
      }] : [])
    ]
  }

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        align: "end" as const
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `$${context.parsed.y.toFixed(2)}`
          }
        }
      }
    },
    scales: {
      y: {
        ticks: {
          callback: function(value) {
            return `$${value}`
          }
        }
      }
    }
  }

  return (
    <Chart type="line" data={chartData} options={options} />
  )
}