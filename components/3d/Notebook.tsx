'use client'

import React, { useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

export default function Notebook(props: JSX.IntrinsicElements['group']) {
  const { scene } = useGLTF('/laptopscreen.glb') as any
  const notebookRef = useRef<THREE.Group>(null)

  return (
    <group
      ref={notebookRef}
      scale={[1.8, 1.8, 1.8]}
      position={[0, -2, 0]}
      {...props}
    >
      <primitive object={scene} />
    </group>
  )
}

useGLTF.preload('/laptopscreen.glb')
