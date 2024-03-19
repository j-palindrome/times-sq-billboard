import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import vertexShader from './leaves.vert?raw'
import fragmentShader from './leaves.frag?raw'
import _ from 'lodash'

export default function Leaves() {
  return (
    <Canvas>
      <Scene />
    </Canvas>
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
          t: { value: 0 },
          cursor: { value: new THREE.Vector2(0, 0) }
        }
      }),
    []
  )

  useFrame(state => {
    material.uniforms.t.value = state.clock.elapsedTime
  })

  const x = window.innerWidth / 10.0
  const y = window.innerHeight / 10.0

  const geometry = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(2 * aspectRatio, 2, x, y)
    geometry.setAttribute(
      'random',
      new THREE.BufferAttribute(
        new Float32Array(
          _.range((x + 1) * (y + 1)).flatMap(() => [
            Math.random(),
            Math.random(),
            Math.random()
          ])
        ),
        3
      )
    )

    const headings = new Float32Array(
      _.range((x + 1) * (y + 1)).flatMap(i => {
        const thisX = i % x
        const thisY = Math.floor(i / y)
        return new THREE.Vector2(
          Math.random() * 2 - 1,
          Math.random() * 2 - 1
        ).toArray()
      })
    )
    geometry.setAttribute('heading', new THREE.BufferAttribute(headings, 2))

    return geometry
  }, [])

  useEffect(() => {
    const mousemove = (e: MouseEvent) => {
      const cursor = new THREE.Vector2(
        e.clientX / window.innerWidth,
        1 - e.clientY / window.innerHeight
      )
      const value: THREE.Vector2 = material.uniforms.cursor.value
      value.set(...cursor.toArray())
    }
    window.addEventListener('mousemove', mousemove)
    return () => {
      window.removeEventListener('mousemove', mousemove)
    }
  }, [])

  return (
    <points
      position={[0, 0, 0]}
      material={material}
      geometry={geometry}></points>
  )
}
