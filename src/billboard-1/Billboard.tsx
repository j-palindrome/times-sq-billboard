import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import vertexShader from './billboard.vert?raw'
import fragmentShader from './billboard.frag?raw'
import _ from 'lodash'
import {
  initScene,
  measureCurvature,
  probLog,
  rad,
  scale,
  useEventListener,
  useMemoCleanup
} from '../util/util'
import invariant from 'tiny-invariant'
import p5 from 'p5'
import { useSpring, easings } from '@react-spring/web'
import * as ease from 'd3-ease'
import { Num } from 'pts'
import { create } from '../util/util'

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
    const geometry = new THREE.PlaneGeometry(1, 1 / 5).translate(0.5, 1 / 10, 0)
    geometry.setAttribute(
      'random',
      new THREE.InstancedBufferAttribute(
        new Float32Array(
          _.range(POINTS).map(() => Math.floor(Math.random() * 5))
        ),
        1
      )
    )
    geometry.setAttribute(
      'index',
      new THREE.InstancedBufferAttribute(
        new Float32Array(_.range(POINTS).map(i => i / POINTS)),
        1
      )
    )
    geometry.setAttribute(
      'texIndex',
      create(
        new THREE.InstancedBufferAttribute(
          new Int16Array(_.range(POINTS).map(i => i % 5)),
          1
        ),
        e => {
          e.gpuType = THREE.IntType
        }
      )
    )

    return geometry
  }, [])

  const randomRotations = useMemo(
    () => _.range(POINTS).map(() => rad(Math.random())),
    []
  )

  const updateLine = (
    mesh: THREE.InstancedMesh,
    points: [THREE.Vector3, THREE.Vector3, THREE.Vector3],
    scaling: number
  ) => {
    const origin = points[0]
    const p1 = points[1]
    const p2 = points[2]

    const curveLeft = origin.x > p2.x ? 1 : -1

    const correction = origin.clone().multiplyScalar(-1)
    const line = new THREE.QuadraticBezierCurve3(
      origin.clone().add(correction).multiplyScalar(scaling).sub(correction),
      p1.clone().add(correction).multiplyScalar(scaling).sub(correction),
      p2.clone().add(correction).multiplyScalar(scaling).sub(correction)
    )
    const linePoints = line.getSpacedPoints(
      // (line.getLength() / SCALE) * LAYERING
      POINTS
    )

    const { tangents, normals, binormals } = line.computeFrenetFrames(
      linePoints.length
    )

    const curves = linePoints.map((x, i) =>
      Math.abs(measureCurvature(origin, p1, p2, 1 - i / linePoints.length))
    )
    const maxCurve = _.max(curves)!
    const minCurve = _.min(curves)!

    const basis = new THREE.Vector3(1, 0, 0)
    for (let i = 0; i < linePoints.length; i++) {
      const rotation = tangents[i].clone().angleTo(basis)
      const scaleVal = scale(curves[i], minCurve, maxCurve, 0.2, 1)

      mesh.setMatrixAt(
        i,
        new THREE.Matrix4()
          .makeRotationZ(rotation + rad(-0.25 * curveLeft))
          .multiply(new THREE.Matrix4().makeScale(scaleVal, scaleVal, 1))
          .setPosition(linePoints[i])
      )
    }
    mesh.instanceMatrix.needsUpdate = true
  }

  const time = useRef<number>(0)

  const createTexture = () => {
    const { texture, p } = useMemoCleanup(
      () => {
        const canvas = document.createElement('canvas') as HTMLCanvasElement
        const SQUARE = 1080
        canvas.width = SQUARE * 5
        canvas.height = SQUARE
        // document.body.insertAdjacentElement('afterbegin', canvas)
        const p = new p5((p: p5) => {
          const points = _.range(5).flatMap(i => {
            const points: [number, number][] = _.sortBy(
              [
                [Num.randomRange(0, 1) + i, Num.randomRange(0, 1)],
                [Num.randomRange(0, 1) + i, Num.randomRange(0, 1)],
                [Num.randomRange(0, 1) + i, Num.randomRange(0, 1)],
                [Num.randomRange(0, 1) + i, Num.randomRange(0, 1)],
                [Num.randomRange(0, 1) + i, Num.randomRange(0, 1)],
                [Num.randomRange(0, 1) + i, Num.randomRange(0, 1)]
              ],
              x => x[0] + x[1]
            )
            return points
          })

          p.setup = () => {
            // @ts-expect-error
            p.createCanvas(SQUARE * 5, SQUARE, p.WEBGL2, canvas)
            p.noFill()
            p.stroke('white')
            p.colorMode('hsl', 1)

            p.translate(p.height / 2, p.height / 2)
            p.scale(p.height / 2, p.height / 2)
            p.strokeWeight(0.01)

            // p.rect(0, 0, p.width, p.height)
            const curve = new THREE.SplineCurve(
              points.map(([x, y]) => new THREE.Vector2(x, y))
            )
            const lines = curve.getPoints(p.width)

            for (let i = 0; i < lines.length; i++) {
              if (i % (lines.length / 5) >= 200) p.point(lines[i].x, lines[i].y)
            }
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
    return texture
  }
  const textures = _.range(5).map(x => createTexture())

  const { camera, material, meshes } = useThree(state => {
    initScene(state)

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
        tex0: { value: textures[0] },
        tex1: { value: textures[1] },
        tex2: { value: textures[2] },
        tex3: { value: textures[3] },
        tex4: { value: textures[4] },
        points: { value: POINTS }
      }
    })

    const meshes = _.range(2).map(
      () => new THREE.InstancedMesh(geometry, material, POINTS)
    )

    state.scene.add(...meshes)

    return { camera: state.camera, material, meshes }
  })

  useFrame(state => {
    time.current = (state.clock.elapsedTime * 0.3) % 1

    const points: [number, number][] = [
      [0.2, -1],
      [0.5, 0],
      [aspectRatio, 0]
    ]

    const t = time.current
    updateLine(
      meshes[0],
      [
        new THREE.Vector3(points[0][0] * -1, points[0][1]),
        new THREE.Vector3(points[1][0] * -1, points[1][1]),
        new THREE.Vector3(points[2][0] * -1, points[2][1])
      ],
      1
    )
    updateLine(
      meshes[1],
      [
        new THREE.Vector3(points[0][0], points[0][1]),
        new THREE.Vector3(points[1][0], points[1][1]),
        new THREE.Vector3(points[2][0], points[2][1])
      ],
      1
    )

    material.uniforms.t.value = t

    material.uniformsNeedUpdate = true
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
