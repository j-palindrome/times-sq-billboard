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
import { Group, Num, Pt } from 'pts'
import { create, toVector3 } from '../util/util'

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
  const POINTS_PER_CURVE = 20
  const MAX = 4
  const CURVE = 0.1
  const startingShape = new Group(new Pt(0, -1), new Pt(0, 0), new Pt(1, 0))
  startingShape.scale([1, 0.5])
  const SPEED = 0.25
  const ROTATION = -0.25

  const aspectRatio = window.innerWidth / window.innerHeight

  const branches = useMemo(() => {
    const branch: [THREE.Vector3, THREE.Vector3, THREE.Vector3][] = []

    const curveGeneration = (
      v1: THREE.Vector3,
      v2: THREE.Vector3,
      v3: THREE.Vector3,
      progress: number
    ) => {
      if (progress > MAX) return
      const curve = new THREE.QuadraticBezierCurve3(v1, v2, v3)
      const shape = new Group(
        new Pt(v1.x, v1.y),
        new Pt(v2.x, v2.y),
        new Pt(v3.x, v3.y)
      )
      const midpoint = curve.getPoint(0.5)
      const newCurve = shape
        .scale(1 / (progress * 0.7))
        .moveTo(new Pt(midpoint.x, midpoint.y))

      const newCurve2 = newCurve.clone().rotate2D(rad(-CURVE))
      newCurve.rotate2D(rad(CURVE))
      branch.push([v1, v2, v3])
      curveGeneration(
        new THREE.Vector3(newCurve[0].x, newCurve[0].y),
        new THREE.Vector3(newCurve[1].x, newCurve[1].y),
        new THREE.Vector3(newCurve[2].x, newCurve[2].y),
        progress + 1
      )
      curveGeneration(
        new THREE.Vector3(newCurve2[0].x, newCurve2[0].y),
        new THREE.Vector3(newCurve2[1].x, newCurve2[1].y),
        new THREE.Vector3(newCurve2[2].x, newCurve2[2].y),
        progress + 1
      )
    }

    curveGeneration(
      ...(toVector3(...startingShape) as [
        THREE.Vector3,
        THREE.Vector3,
        THREE.Vector3
      ]),
      1
    )
    // startingShape.moveTo(0, 0)
    // curveGeneration(
    //   ...(toVector3(...startingShape) as [
    //     THREE.Vector3,
    //     THREE.Vector3,
    //     THREE.Vector3
    //   ]),
    //   1
    // )
    // startingShape.moveTo(0, 0.5)
    // curveGeneration(
    //   ...(toVector3(...startingShape) as [
    //     THREE.Vector3,
    //     THREE.Vector3,
    //     THREE.Vector3
    //   ]),
    //   1
    // )

    const branch2 = branch.map(x =>
      x.map(x => x.clone().multiply(new THREE.Vector3(-1, 1, 1)))
    )
    return [branch, branch2]
  }, [])

  const POINTS = branches[0].length * POINTS_PER_CURVE

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
    geometry.setAttribute(
      'bezierPoints',
      new THREE.InstancedBufferAttribute(
        new Float32Array(
          _.range(POINTS).flatMap(() => _.range(16).map(() => Math.random()))
        ),
        16
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
    scaling: number,
    mode: number
  ) => {
    let j = 0
    for (let points of branches[mode]) {
      const origin = points[0]
      const p1 = points[1]
      const p2 = points[2]

      const curveLeft = origin.x > p2.x ? 1 : -1

      const correction = origin.clone().multiplyScalar(-1)
      const line = new THREE.QuadraticBezierCurve3(origin, p1, p2)

      const linePoints = line.getSpacedPoints(
        // (line.getLength() / SCALE) * LAYERING
        POINTS_PER_CURVE
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
        // * (1 - j / POINTS)

        mesh.setMatrixAt(
          j,
          new THREE.Matrix4()
            .makeRotationZ(rotation + rad(ROTATION * curveLeft))
            .multiply(new THREE.Matrix4().makeScale(scaleVal, scaleVal, 1))
            .setPosition(linePoints[i])
        )
        j++
      }
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
            // p.strokeWeight(100)
            // p.rect(0, 0, p.width, p.height)

            p.translate(p.height / 2, p.height / 2)
            p.scale(p.height / 2, p.height / 2)
            p.strokeWeight(0.01)

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
    // state.scene.add(meshes[0])

    updateLine(meshes[0], 1, 0)
    updateLine(meshes[1], 1, 1)

    return { camera: state.camera, material, meshes }
  })

  useFrame(state => {
    time.current = (state.clock.elapsedTime * 0.3) % 1
    const t = time.current
    const map = t ** SPEED
    material.uniforms.t.value = t
    material.uniformsNeedUpdate = true
    material.needsUpdate = true
    meshes.forEach(mesh => mesh.scale.set(map * 0.25 + 0.75, 1, 1))
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
