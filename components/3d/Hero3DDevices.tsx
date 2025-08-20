'use client'

import React, { Suspense, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import {
  PresentationControls,
  Environment,
  ContactShadows,
} from '@react-three/drei'
import { Box } from '@chakra-ui/react'
import dynamic from 'next/dynamic'

// ✅ Dynamically import Notebook component (no SSR)
const Notebook = dynamic(() => import('./Notebook'), { ssr: false })

type Props = {
  height?: string | number
}

// 🔄 Wrapper to rotate the Notebook slowly
function SpinningNotebook() {
  const ref = useRef<any>(null)

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.1 // slow horizontal spin
    }
  })

  return (
    <group ref={ref}>
      <Notebook />
    </group>
  )
}

export default function Hero3DDevices({ height = 560 }: Props) {
  return (
    <Box
      w="100%"
      h={typeof height === 'number' ? `${height}px` : height}
      position="relative"
      borderRadius="2xl"
      overflow="hidden"
      bgGradient="linear(to-br, #F3FAF9, #e8f3ef)"
    >
      <Canvas
        dpr={[1, 2]}
        shadows
        camera={{
          position: [1.2, 2.4, 3.2],
          fov: 70,
        }}
      >
        <color attach="background" args={['#F3FAF9']} />
        <Suspense fallback={null}>
          <PresentationControls
            global
            config={{ mass: 1, tension: 150, friction: 18 }}
            snap
            rotation={[0, -0.4, 0]}
            polar={[-0.1, 0.2]}
            azimuth={[-0.4, 0.4]}
          >
            {/* 🔄 Slowly spinning Notebook */}
            <SpinningNotebook />
          </PresentationControls>

          {/* Lighting */}
          <Environment preset="city" />
          <directionalLight position={[4, 6, 4]} intensity={1} castShadow />
          <ambientLight intensity={0.35} />

          {/* Shadow */}
          <ContactShadows
            position={[0, -0.3, 0]}
            opacity={0.3}
            scale={7}
            blur={2.5}
            far={2.5}
            color="#265966"
          />
        </Suspense>
      </Canvas>
    </Box>
  )
}


// 'use client'

// import React, { Suspense } from 'react'
// import { Canvas } from '@react-three/fiber'
// import {
//   PresentationControls,
//   Float,
//   Environment,
//   ContactShadows,
// } from '@react-three/drei'
// import { Box } from '@chakra-ui/react'
// import dynamic from 'next/dynamic'

// // ✅ Dynamically import Notebook component (no SSR)
// const Notebook = dynamic(() => import('./Notebook'), { ssr: false })

// type Props = {
//   height?: string | number
// }

// export default function Hero3DDevices({ height = 560 }: Props) {
//   return (
//     <Box
//       w="100%"
//       h={typeof height === 'number' ? `${height}px` : height}
//       position="relative"
//       borderRadius="2xl"
//       overflow="hidden"
//       bgGradient="linear(to-br, #F3FAF9, #e8f3ef)"
//     >
//       <Canvas
//         dpr={[1, 2]}
//         shadows
//         camera={{
//   position: [1.2, 2.4, 3.2],
//   fov: 70,
// }}
//       >
//         <color attach="background" args={['#F3FAF9']} />
//         <Suspense fallback={null}>
//           <PresentationControls
//             global
//             config={{ mass: 1, tension: 150, friction: 18 }}
//             snap
//             rotation={[0, -0.4, 0]} // initial angle to match reference image
//             polar={[-0.1, 0.2]}
//             azimuth={[-0.4, 0.4]}
//           >
//             {/* Float is optional now since there's no animation */}
//             <Float speed={0} rotationIntensity={0} floatIntensity={0}>
//               <Notebook />
//             </Float>
//           </PresentationControls>

//           {/* Lighting */}
//           <Environment preset="city" />
//           <directionalLight position={[4, 6, 4]} intensity={1} castShadow />
//           <ambientLight intensity={0.35} />

//           {/* Shadow */}
//           <ContactShadows
//             position={[0, -0.3, 0]}
//             opacity={0.3}
//             scale={7}
//             blur={2.5}
//             far={2.5}
//             color="#265966"
//           />
//         </Suspense>
//       </Canvas>
//     </Box>
//   )
// }
