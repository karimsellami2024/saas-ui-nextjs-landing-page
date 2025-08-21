'use client'
import { Select } from '@chakra-ui/react'
import { VEHICLE_OPTIONS } from '../../components/vehicleselect/vehicleOptions'

type Props = {
  value: string
  onChange: (val: string) => void
}

export default function VehicleSelect({ value, onChange }: Props) {
  return (
    <Select
      placeholder="Sélectionner un type"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      size="sm"
      bg="white"
    >
      {VEHICLE_OPTIONS.map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </Select>
  )
}
