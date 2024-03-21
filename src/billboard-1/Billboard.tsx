import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import vertexShader from './billboard.vert?raw'
import fragmentShader from './billboard.frag?raw'
import _ from 'lodash'
import {
  measureCurvature,
  rad,
  scale,
  useEventListener,
  useMemoCleanup
} from '../util/util'
import invariant from 'tiny-invariant'
import p5 from 'p5'
import * as animS from '../util/p5.anims'
import { useSpring, easings } from '@react-spring/web'
import * as ease from 'd3-ease'
import { Num } from 'pts'

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
    const geometry = new THREE.PlaneGeometry(5, 1)
      .translate(0.5, 0.5, -0)
      .scale(0.5, 0.5, 1)
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
        new Int16Array(_.range(POINTS).map(i => i)),
        1
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
    points: [THREE.Vector2, THREE.Vector2],
    scaling: number
  ) => {
    const origin = new THREE.Vector3(0.0, -1.1, 0)
    const correction = origin.clone().multiplyScalar(-1)
    const line = new THREE.QuadraticBezierCurve3(
      origin.clone().add(correction).multiplyScalar(scaling).sub(correction),
      new THREE.Vector3(...points[0].toArray(), 0)
        .add(correction)
        .multiplyScalar(scaling)
        .sub(correction),
      new THREE.Vector3(...points[1].toArray(), 0)
        .add(correction)
        .multiplyScalar(scaling)
        .sub(correction)
    )
    const linePoints = line.getSpacedPoints(
      // (line.getLength() / SCALE) * LAYERING
      POINTS
    )

    const { tangents } = line.computeFrenetFrames(linePoints.length)

    for (let i = 0; i < linePoints.length; i++) {
      const rotation = tangents[i].clone()
      rotation.applyEuler(new THREE.Euler().set(0, 0, randomRotations[i]))

      // rotation.applyEuler(new THREE.Euler(0, 0, rad(0.25))) // perpendicular

      const scaleVal = scale(
        Math.abs(
          measureCurvature(
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(points[0].x, points[0].y, 0),
            new THREE.Vector3(points[1].x, points[1].y, 0),
            i / linePoints.length
          )
        ),
        -0.1,
        1,
        0.5,
        4,
        0.9,
        false
      )

      mesh.setMatrixAt(
        i,
        new THREE.Matrix4()
          .makeRotationZ(new THREE.Vector3(1, 0, 0).angleTo(rotation))
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
          p.setup = () => {
            // @ts-expect-error
            p.createCanvas(SQUARE * 5, SQUARE, p.WEBGL2, canvas)
            p.noFill()
            p.stroke('white')
            p.colorMode('hsl', 1)
          }

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

          let lastT = 0
          let lastIntermediateT = 0

          p.draw = () => {
            p.translate(p.height / 2, p.height / 2)
            p.scale(p.height / 2, p.height / 2)
            p.strokeWeight(0.01)

            const t = time.current
            if (t > 1 - 0.5 ** 2) {
              p.stroke('black')
            } else {
              p.stroke('white')
            }
            if (t < lastT) {
              p.clear()
            }
            lastT = t

            const intermediateT = scale(t, 0, 1, 0, 2, 2) % 1

            const curve = new THREE.SplineCurve(
              points.map(([x, y]) => new THREE.Vector2(x, y))
            )
            const lines = curve.getPoints(p.width)

            for (
              let i = Math.floor(lastIntermediateT * lines.length);
              i < intermediateT * lines.length;
              i++
            ) {
              if (i % (lines.length / 5) >= 200) p.point(lines[i].x, lines[i].y)
            }

            lastIntermediateT = intermediateT

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
    return texture
  }
  const textures = _.range(5).map(x => createTexture())

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

    const t = time.current ** 0.2
    updateLine(
      meshes[0],
      [
        new THREE.Vector2(
          scale(Math.sin(t * 0.73 + rad(0.33)), -1, 1, 0, 1 * aspectRatio),
          scale(Math.cos(t * 0.74 + rad(0.33)), -1, 1, 0, 1)
        ),
        new THREE.Vector2(
          scale(Math.sin(t * 0.68), -1, 1, 0.5 * aspectRatio, 1 * aspectRatio),
          scale(Math.cos(t * 0.73), -1, 1, 0.5, 1)
        )
      ],
      t
    )
    updateLine(
      meshes[1],
      [
        new THREE.Vector2(
          scale(Math.sin(t * 0.73 + rad(0.33)), -1, 1, -1, 0),
          scale(Math.cos(t * 0.74 + rad(0.33)), -1, 1, 0, 1)
        ),
        new THREE.Vector2(
          scale(Math.sin(t * 0.68), -1, 1, -0.5, -1),
          scale(Math.cos(t * 0.68), -1, 1, 0.5, 1)
        )
      ],
      t
    )
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
    },
    []
  )

  return <></>
}
