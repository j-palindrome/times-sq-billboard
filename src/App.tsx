import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useMemo } from 'react'
import * as THREE from 'three'
import vertexShader from './leaves.vert?raw'
import fragmentShader from './leaves.frag?raw'

function App() {
  return (
    <>
      <Canvas>
        <Scene />
      </Canvas>
    </>
  )
}

function Scene() {
  const aspectRatio = window.innerWidth / window.innerHeight

  useThree(state => {
    state.camera = new THREE.OrthographicCamera(
      -aspectRatio,
      aspectRatio,
      1,
      -1,
      0,
      1
    )
    state.camera.position.set(0, 0, 0)
  })

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        transparent: true,
        uniforms: {
          t: { value: 0 }
        }
      }),
    []
  )

  useFrame(state => {
    material.uniforms.t.value = state.clock.elapsedTime
  })

  return (
    <mesh
      position={[0, 0, 0]}
      material={new THREE.MeshBasicMaterial({ color: 'white' })}>
      <planeGeometry args={[2 * aspectRatio, 2, 100, 100]} />
    </mesh>
  )
}

export default App
