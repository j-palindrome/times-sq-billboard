import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import vertexShader from './billboard.vert?raw'
import fragmentShader from './billboard.frag?raw'
import _ from 'lodash'
import { rad, scale, useEventListener, useMemoCleanup } from '../util/util'
import invariant from 'tiny-invariant'
import p5 from 'p5'
import * as animS from '../util/p5.anims'
import { useSpring, easings } from '@react-spring/web'
import * as ease from 'd3-ease'

export default function Billboard() {
  return (
    <>
      <Canvas>
        <Scene />
      </Canvas>
    </>
  )
}

function Scene() {
  const SCALE = 0.2
  const LAYERING = 1.5

  const aspectRatio = window.innerWidth / window.innerHeight

  const POINTS = 50

  const geometry = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(1, 1)
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

  const { texture, p } = useMemoCleanup(
    () => {
      const canvas = document.createElement('canvas') as HTMLCanvasElement
      canvas.width = 1080
      canvas.height = 1080
      // document.body.insertAdjacentElement('afterbegin', canvas)
      const p = new p5((p: p5) => {
        p.setup = () => {
          // @ts-expect-error
          p.createCanvas(1080, 1080, p.WEBGL2, canvas)
          p.noFill()
          p.stroke('white')

          p.background('white')
        }

        p.draw = () => {
          p.translate(p.width / 2, p.height / 2)
          p.scale(p.width / 2, p.height / 2)
          p.strokeWeight(0.01)

          const t = ease.easeExpOut(((p.millis() / 1000) * 0.3) % 1)

          p.clear()
          const points: [number, number][] = [
            [-0.51, 0.35],
            [-0.03, 0.43],
            [0.55, -0.23],
            [0.01, -0.72],
            [-0.77, -0.57],
            [-0.24, -0.22]
          ]

          const curve = new THREE.SplineCurve(
            points.map(([x, y]) => new THREE.Vector2(x, y))
          )
          const lines = curve.getPoints(p.width)

          for (let i = 0; i < t * lines.length; i++) {
            p.point(lines[i].x, lines[i].y)
          }

          texture.needsUpdate = true
        }
      })

      const texture = new THREE.CanvasTexture(canvas)
      return { texture, p, canvas }
    },
    ({ p, texture, canvas }) => {
      canvas.remove()
      // texture.dispose()
      p.remove()
    },
    []
  )

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

    const material = new THREE.ShaderMaterial({
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      transparent: true,
      uniforms: {
        t: { value: 0 },
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
        },
        tex: { value: texture }
      }
    })

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

  const points = useRef<[number, number][]>([])
  useEventListener('keydown', ev => {
    if (ev.key === '.') {
      points.current = []
    }
  })
  useEventListener(
    'mousedown',
    e => {
      const coord = [
        (e.clientX / window.innerWidth) * 2 - 1,
        (1 - e.clientY / window.innerHeight) * 2 - 1
      ]
      const text = new THREE.Vector3(coord[0], coord[1], 0)
        .unproject(camera)
        .setZ(0)
        .toArray()
        .slice(0, 2)

      points.current.push(text as [number, number])
      const t =
        '[' +
        points.current
          .map(x => `[${x.map(x => x.toFixed(2)).join(', ')}]`)
          .join(', ') +
        ']'
      window.navigator.clipboard.writeText(t)
      console.log(t)
    },
    []
  )

  return <></>
}
