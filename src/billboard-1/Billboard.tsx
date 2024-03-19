import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import vertexShader from './billboard.vert?raw'
import fragmentShader from './billboard.frag?raw'
import _ from 'lodash'
import { rad, scale, useEventListener } from '../util/util'
import invariant from 'tiny-invariant'

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

  const POINTS = 50

  const geometry = useMemo(() => {
    const shape = new THREE.Shape()
    shape.lineTo(-0.5 * SCALE, 0.5 * SCALE)
    shape.lineTo(0.0 * SCALE, 1.0 * SCALE)
    shape.lineTo(0.5 * SCALE, 0.33 * SCALE)

    const geometry = new THREE.ShapeGeometry(shape, 5)
    return geometry
  }, [])

  const updateLine = (
    mesh: THREE.InstancedMesh,
    points: [THREE.Vector2, THREE.Vector2]
  ) => {
    const line = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(0.0, -1.0, 0),
      new THREE.Vector3(...points[0].toArray(), 0),
      new THREE.Vector3(...points[1].toArray(), 0)
    )
    const linePoints = line.getSpacedPoints(
      // (line.getLength() / SCALE) * LAYERING
      POINTS
    )

    for (let i = 0; i < linePoints.length; i++) {
      const rotation = line.getTangentAt(i / linePoints.length)
      if (i % 2 === 0) rotation.applyEuler(new THREE.Euler(0, 0, rad(0.5)))
      // rotation.applyEuler(new THREE.Euler(0, 0, rad(0.25))) // perpendicular

      mesh.setMatrixAt(
        i,
        new THREE.Matrix4()
          .makeRotationZ(new THREE.Vector3(0, 1, 0).angleTo(rotation))
          .setPosition(linePoints[i])
      )
    }
    mesh.instanceMatrix.needsUpdate = true
  }

  const { camera, material, meshes } = useThree(state => {
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

    // const canvas = new HTMLCanvasElement()
    // canvas.width = 1080
    // canvas.height = 1080
    // const canvas = new OffscreenCanvas(100, 100)
    // const canvasWorker = new CanvasWorker()
    // canvasWorker.postMessage({ canvas }, [canvas])
    // const ctx = canvas.getContext('2d')
    // invariant(ctx)
    // ctx.fillStyle = 'green'
    // ctx.fillRect(0, 0, canvas.width, canvas.height)

    // const texture = new THREE.CanvasTexture(canvas)
    // const material = new THREE.MeshBasicMaterial({
    //   map: texture
    // })
    const material = new THREE.MeshBasicMaterial({
      color: 'white'
    })

    // const material = new THREE.ShaderMaterial({
    //   vertexShader: vertexShader,
    //   fragmentShader: fragmentShader,
    //   transparent: true,
    //   uniforms: {
    //     t: { value: 0 },
    //     cursor: { value: new THREE.Vector2(0, 0) },
    //     colors: {
    //       value: [
    //         new THREE.Color().setHSL(0.7, 0.9, 0.8),
    //         new THREE.Color().setHSL(0.9, 0.9, 0.8),
    //         new THREE.Color().setHSL(0.6, 0.9, 0.8),
    //         new THREE.Color().setHSL(0.7, 0.9, 0.8)
    //       ]
    //     },
    //     resolution: {
    //       value: new THREE.Vector2(window.innerWidth, window.innerHeight)
    //     },
    //     tex: { value: texture }
    //   }
    // })

    const meshes = _.range(2).map(
      () => new THREE.InstancedMesh(geometry, material, POINTS)
    )

    state.scene.add(...meshes)

    return { camera: state.camera, material, meshes }
  })

  useFrame(state => {
    const t = state.clock.elapsedTime
    updateLine(meshes[0], [
      new THREE.Vector2(
        scale(Math.sin(t * 0.73 + rad(0.33)), -1, 1, 0, 1),
        scale(Math.cos(t * 0.74 + rad(0.33)), -1, 1, 0, 1)
      ),
      new THREE.Vector2(
        ...scale([Math.sin(t * 0.68), Math.cos(t * 0.73)], -1, 1, 0.5, 1)
      )
    ])
    updateLine(meshes[1], [
      new THREE.Vector2(
        scale(Math.sin(t * 0.73 + rad(0.33)), -1, 1, -1, 0),
        scale(Math.cos(t * 0.74 + rad(0.33)), -1, 1, 0, 1)
      ),
      new THREE.Vector2(
        scale(Math.sin(t * 0.68), -1, 1, -0.5, -1),
        scale(Math.cos(t * 0.68), -1, 1, 0.5, 1)
      )
    ])
  })

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
