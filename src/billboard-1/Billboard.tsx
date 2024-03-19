import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import vertexShader from './billboard.vert?raw'
import fragmentShader from './billboard.frag?raw'
import _ from 'lodash'
import { rad, useEventListener } from '../util/util'

export default function Billboard() {
  return (
    <Canvas>
      <Scene />
    </Canvas>
  )
}

function Scene() {
  const SCALE = 0.2
  const LAYERING = 1.5

  const aspectRatio = window.innerWidth / window.innerHeight

  const x = window.innerWidth / 10.0
  const y = window.innerHeight / 10.0

  const { camera, material } = useThree(state => {
    state.scene.clear()
    state.camera = new THREE.OrthographicCamera(
      -aspectRatio,
      aspectRatio,
      1,
      -1,
      0,
      1
    )
    state.camera.position.set(0, 0, 0)
    state.camera.updateMatrixWorld()

    const line = new THREE.CubicBezierCurve3(
      new THREE.Vector3(-1.0, -1.0, 0),
      new THREE.Vector3(-0.25, 0.25, 0),
      new THREE.Vector3(0.25, -1.0, 0),
      new THREE.Vector3(1.0, 1.0, 0)
    )
    const linePoints = line.getSpacedPoints(
      (line.getLength() / SCALE) * LAYERING
    )

    const shape = new THREE.Shape()
    shape.lineTo(-0.5 * SCALE, 0.5 * SCALE)
    shape.lineTo(0.0 * SCALE, 1.0 * SCALE)
    shape.lineTo(0.5 * SCALE, 0.33 * SCALE)

    const geometry = new THREE.ShapeGeometry(shape, 5)

    const material = new THREE.ShaderMaterial({
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      transparent: true,
      uniforms: {
        t: { value: 0 },
        cursor: { value: new THREE.Vector2(0, 0) },
        colors: {
          value: [
            new THREE.Color().setHSL(0.7, 0.9, 0.8),
            new THREE.Color().setHSL(0.9, 0.9, 0.8),
            new THREE.Color().setHSL(0.6, 0.9, 0.8),
            new THREE.Color().setHSL(0.7, 0.9, 0.8)
          ]
        },
        resolution: {
          value: new THREE.Vector2(window.innerWidth, window.innerHeight)
        }
      }
    })

    const instancedMesh = new THREE.InstancedMesh(
      geometry,
      material,
      linePoints.length
    )
    for (let i = 0; i < linePoints.length; i++) {
      const rotation = linePoints[i]
        .clone()
        .sub(linePoints[i - 1] ?? linePoints[1])
      rotation.applyEuler(new THREE.Euler(0, 0, rad(0.25))) // perpendicular

      instancedMesh.setMatrixAt(
        i,
        new THREE.Matrix4()
          .makeRotationZ(new THREE.Vector3(0, 1, 0).angleTo(rotation))
          .setPosition(linePoints[i])
      )
    }

    instancedMesh.instanceMatrix.needsUpdate = true
    state.scene.add(instancedMesh)

    return { camera: state.camera, material }
  })

  useFrame(state => {
    material.uniforms.t.value = state.clock.elapsedTime
  })

  useEventListener(
    'mousemove',
    e => {
      const cursor = new THREE.Vector2(
        e.clientX / window.innerWidth,
        1 - e.clientY / window.innerHeight
      )
      const value: THREE.Vector2 = material.uniforms.cursor.value
      value.set(...cursor.toArray())
    },
    []
  )

  useEventListener(
    'mousedown',
    e => {
      const coord = [
        (e.clientX / window.innerWidth) * 2 - 1,
        (1 - e.clientY / window.innerHeight) * 2 - 1
      ]
      const text = `${new THREE.Vector3(coord[0], coord[1], 0)
        .unproject(camera)
        .setZ(0)
        .toArray()
        .map(x => x.toFixed(2))
        .join(', ')}`
      window.navigator.clipboard.writeText(text)
      console.log(text)
    },
    []
  )

  return <></>
}
