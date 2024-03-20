import { Canvas, useFrame, useThree } from '@react-three/fiber'
import _ from 'lodash'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import {
  rad,
  scale,
  useEventListener,
  create,
  useMemoCleanup
} from '../util/util'
import vertexShader from './billboard.vert?raw'
import fragmentShader from './billboard.frag?raw'
import { CanvasForm } from 'pts'
import p5 from 'p5'

export default function Billboard() {
  return (
    <>
      <canvas id='test' height={1080} width={1080}></canvas>
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

  // const geometry = useMemo(() => {
  //   const shape = new THREE.Shape()
  //   shape.lineTo(-0.5, 0.5)
  //   shape.lineTo(0.0, 1.0)
  //   shape.lineTo(0.5, 0.33)

  //   const geometry = new THREE.ShapeGeometry(shape, 5)
  //   geometry.scale(SCALE, SCALE, SCALE)
  //   return geometry
  // }, [])

  const canvas = useMemoCleanup(
    () => {
      const canvas = document.createElement('canvas') as HTMLCanvasElement
      canvas.width = 1080
      canvas.height = 1080
      return canvas
    },
    canvas => {
      canvas.remove()
    },
    []
  )

  const { texture: offscreenTexture, p } = useMemoCleanup(
    () => {
      // const oRenderer = create(new THREE.WebGLRenderer({ canvas }), e => {
      //   e.setClearColor(new THREE.Color(0, 0, 0), 0)
      // })
      // const oScene = new THREE.Scene()
      // // for (let i = 0; i < 10; i++) {

      // // }
      // oScene.add(
      //   create(
      //     new THREE.Mesh(
      //       create(new THREE.BufferGeometry(), e => {
      //         e.setFromPoints([
      //           new THREE.Vector2(0, 0),
      //           new THREE.Vector2(1, 1),
      //           new THREE.Vector2(0, 1),
      //           new THREE.Vector2(1, 1),
      //           new THREE.Vector2(0, 0),
      //           new THREE.Vector2(1, 0)
      //         ])
      //       }),
      //       new THREE.MeshBasicMaterial({ color: 'white' })
      //     ),
      //     e => {
      //       e.position.set(0, 0, 0)
      //       // const SCALE = 10
      //       // e.scale.set(Math.random() / SCALE, Math.random() / SCALE, 1)
      //       // e.position.set(Math.random(), Math.random(), 0)
      //     }
      //   )
      // )

      // const oCamera = new THREE.OrthographicCamera(0, 1, 1, 0, 0, 2)
      // oCamera.position.set(0, 0, 0)

      // oRenderer.render(oScene, oCamera)

      const p = new p5((p: p5) => {
        p.setup = () => {
          p.createCanvas(
            1080,
            1080,
            undefined,
            document.getElementById('test') as HTMLCanvasElement
          )
          p.strokeWeight(10)
          p.stroke('white')
          p.noFill()
          p.scale(p.width / 2, p.height / 2)
          p.translate(p.width / 2, p.height / 2)
          p.bezier(0.2, 0.2, -0.82, -0.58, -0.28, 0.58, 0.47, 0.15)
          p.bezier(0.47, 0.15, 0.27, -0.65, -0.44, -0.57, 0.17, -0.84)
        }

        p.draw = () => {
          p.clear()
          const createAsemic = () => {
            const t = p.millis()
            p.bezier(0.2, 0.2, -0.82, -0.58, -0.28, 0.58, 0.47, 0.15)
            p.bezier(0.47, 0.15, 0.27, -0.65, -0.44, -0.57, 0.17, -0.84)
            const pathLength = t % 750
            // p.beginShape(p.POINTS)
            // for (let [x, y] of [
            //   [-0.32, 0.42],
            //   [-0.32, 0.42],
            //   [0.12, 0.63],
            //   [0.27, -0.54],
            //   [-0.37, -0.1],
            //   [-0.28, -0.02],
            //   [-0.72, 0.4],
            //   [-0.72, 0.4]
            // ]) {
            //   p.curveVertex(x, y)
            // }
            // p.endShape()
          }

          createAsemic()
        }
      })

      const texture = new THREE.CanvasTexture(canvas)
      return { texture, p }
    },
    ({ texture, p }) => {
      // texture.dispose()
      // p.remove()
    },
    []
  )

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
        },
        tex: { value: offscreenTexture }
      }
    })

    const testGeo = create(new THREE.PlaneGeometry(1, 1), e => {
      e.scale(0.1, 0.1, 1)
    })
    const meshes = _.range(2).map(
      () => new THREE.InstancedMesh(testGeo, material, POINTS)
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
        .slice(0, 2)
        .map(x => x.toFixed(2))
        .join(', ')}`
      window.navigator.clipboard.writeText(text)
      console.log(text)
    },
    []
  )

  return <></>
}
